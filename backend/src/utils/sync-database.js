require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = process.env.RAPID_API_HOST;

async function syncAll() {
  const client = await pool.connect();
  let lastQuery = '';
  const runQuery = async (q, p) => { 
    lastQuery = q; 
    console.log('SQL:', q);
    return client.query(q, p); 
  };

  try {
    console.log('--- Wiping all tables ---');
    await runQuery('BEGIN');
    const tables = ['TeamPlayer', 'UserTeam', 'MatchSquad', 'PlayerPoint', 'Contest', 'Match', 'Player', 'Team'];
    for (const t of tables) {
        try {
            await runQuery(`DELETE FROM "public"."${t}"`);
        } catch (e) {
            console.log(`Skipping ${t}: ${e.message}`);
        }
    }
    await runQuery('COMMIT');

    console.log('--- Fetching from RapidAPI ---');
    const options = {
      method: 'GET',
      url: `https://${RAPID_API_HOST}/matches/v1/upcoming`,
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST
      }
    };
    const { data } = await axios.request(options);
    console.log('API RESPONSE KEYS:', Object.keys(data));
    const matches = [];
    (data.typeMatches || []).forEach(type => {
      (type.seriesMatches || []).forEach(s => {
        (s.seriesAdWrapper?.matches || []).forEach(m => matches.push(m));
      });
    });

    console.log(`EXTRACTED MATCHES: ${matches.length}`);
    if (matches.length > 0) console.log('FIRST MATCH:', JSON.stringify(matches[0].matchInfo, null, 2));

    console.log(`Found ${matches.length} matches. Syncing top 10 unique...`);
    const seenApiIds = new Set();
    let syncedCount = 0;

    for (const m of matches) {
      if (syncedCount >= 10) break;
      const info = m.matchInfo;
      const apiId = String(info.matchId);
      if (seenApiIds.has(apiId)) continue;
      seenApiIds.add(apiId);

      const teamA = info.team1.teamName;
      const teamB = info.team2.teamName;
      const shortA = m.teamInfo?.[0]?.shortname || teamA.slice(0, 3).toUpperCase();
      const shortB = m.teamInfo?.[1]?.shortname || teamB.slice(0, 3).toUpperCase();
      const startTime = new Date(parseInt(info.startDate));
      const venue = info.venueInfo?.ground || '';

      // Upsert Teams
      const resA = await runQuery(
        'INSERT INTO "public"."Team" (name, "shortName") VALUES ($1, $2) ON CONFLICT ("shortName") DO UPDATE SET name=$1 RETURNING id',
        [teamA, shortA]
      );
      const teamAId = resA.rows[0].id;

      const resB = await runQuery(
        'INSERT INTO "public"."Team" (name, "shortName") VALUES ($1, $2) ON CONFLICT ("shortName") DO UPDATE SET name=$1 RETURNING id',
        [teamB, shortB]
      );
      const teamBId = resB.rows[0].id;

      // Insert Match
      await runQuery(
        'INSERT INTO "public"."Match" ("teamAId", "teamBId", "matchStartTime", status, venue, api_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [teamAId, teamBId, startTime, 'UPCOMING', venue, apiId]
      );
      syncedCount++;
    }
    console.log(`Sync Complete. Inserted ${syncedCount} matches.`);
    
    const countCheck = await runQuery('SELECT COUNT(*) FROM "public"."Match"');
    console.log(`POST-SYNC COUNT: ${countCheck.rows[0].count}`);

  } catch (err) {
    console.error('SYNC ERROR:', err.message);
    console.error('LAST QUERY:', lastQuery);
  } finally {
    client.release();
    await pool.end();
  }
}

syncAll();
