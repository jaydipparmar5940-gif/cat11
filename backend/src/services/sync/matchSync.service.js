/**
 * matchSync.service.js
 * Fetches match list from RapidAPI and UPSERTs into "Match" table.
 */

'use strict';

const client = require('./rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncMatches() {
  console.log('[SYNC] Starting Match Sync...');
  try {
    const res = await client.get('/matches/v1/upcoming');
    const typeMatches = res.data.typeMatches || [];
    
    let allMatches = [];
    typeMatches.forEach(type => {
      (type.seriesMatches || []).forEach(sMatch => {
        if (sMatch.seriesAdWrapper && sMatch.seriesAdWrapper.matches) {
          sMatch.seriesAdWrapper.matches.forEach(m => {
            allMatches.push({ ...m, league_name: sMatch.seriesAdWrapper.seriesName });
          });
        }
      });
    });

    console.log(`[SYNC] Found ${allMatches.length} matches from API.`);

    for (const m of allMatches) {
      const info = m.matchInfo;
      if (!info) continue;

      const matchId      = String(info.matchId);
      const teamA        = info.team1.teamName;
      const teamB        = info.team2.teamName;
      const startTime    = new Date(parseInt(info.startDate));
      let   status       = 'UPCOMING';
      
      if (info.state === 'In Progress') status = 'LIVE';
      if (info.state === 'Complete' || info.state === 'Result') status = 'COMPLETED';

      const leagueName   = m.league_name || 'Standard League';

      await pool.query(`
        INSERT INTO "Match" ("api_id", "teamAId", "teamBId", "matchStartTime", "status", "league_name", "updated_at")
        VALUES (
          $1, 
          (SELECT id FROM "Team" WHERE name = $2 LIMIT 1), 
          (SELECT id FROM "Team" WHERE name = $3 LIMIT 1), 
          $4, $5, $6, NOW()
        )
        ON CONFLICT ("api_id") DO UPDATE SET
          "status" = EXCLUDED."status",
          "league_name" = EXCLUDED."league_name",
          "updated_at" = NOW();
      `, [matchId, teamA, teamB, startTime, status, leagueName]);
    }

    console.log('[SYNC] Match Sync Completed Successfully.');
    return { success: true, count: allMatches.length };
  } catch (err) {
    console.error('[SYNC] Match Sync Failed:', err.message);
    throw err;
  }
}

module.exports = { syncMatches };
