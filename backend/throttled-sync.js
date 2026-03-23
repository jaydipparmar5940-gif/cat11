/**
 * throttled-sync.js
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = require('./src/services/sync/rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runOptimizedSync() {
  console.log('--- Starting Optimized Throttled Sync on Direct DB (Port 5432) ---');
  
  try {
    // 1. Fetch Matches
    const res = await client.get('/matches/v1/upcoming');
    const allMatches = [];
    const uniqueSeries = new Set();
    
    (res.data.typeMatches || []).forEach(type => {
      (type.seriesMatches || []).forEach(sMatch => {
        if (sMatch.seriesAdWrapper && sMatch.seriesAdWrapper.matches) {
          const sId = String(sMatch.seriesAdWrapper.seriesId);
          uniqueSeries.add(sId);
          sMatch.seriesAdWrapper.matches.forEach(m => {
            allMatches.push({
              ...m,
              league_name: sMatch.seriesAdWrapper.seriesName,
              series_id: sId
            });
          });
        }
      });
    });

    console.log(`[SYNC] Found ${allMatches.length} matches and ${uniqueSeries.size} unique series.`);

    // 2. Fetch Matches & Populate Teams/Matches first
    for (const m of allMatches) {
      const info = m.matchInfo;
      if (!info) continue;

      const matchId   = String(info.matchId);
      const startTime = new Date(parseInt(info.startDate));
      const teamA     = info.team1.teamName;
      const teamB     = info.team2.teamName;
      const seriesId  = String(m.series_id || '');
      const leagueName = m.league_name || 'Standard League';
      
      const upsertTeam = async (name) => {
        let r = await pool.query('SELECT id FROM "Team" WHERE name = $1', [name]);
        if (!r.rows.length) {
          const s = name.substring(0, 3).toUpperCase();
          r = await pool.query('INSERT INTO "Team" (name, "shortName") VALUES ($1, $2) RETURNING id', [name, s]);
        }
        return r.rows[0].id;
      };

      const teamAId = await upsertTeam(teamA);
      const teamBId = await upsertTeam(teamB);

      await pool.query(`
        INSERT INTO "Match" ("api_id", "series_id", "teamAId", "teamBId", "matchStartTime", "status", "league_name", "updated_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT ("api_id") DO UPDATE SET
          "series_id" = EXCLUDED."series_id",
          "status" = EXCLUDED."status",
          "league_name" = EXCLUDED."league_name",
          "updated_at" = NOW();
      `, [matchId, seriesId, teamAId, teamBId, startTime, (info.state === 'In Progress' ? 'LIVE' : 'UPCOMING'), leagueName]);
    }
    console.log(`[SYNC] Matches and Teams synced. Starting player sync for ${uniqueSeries.size} series...`);

    // 3. Fetch Series Squads (Throttled)
    for (const sId of uniqueSeries) {
      console.log(`[SYNC] Syncing Series: ${sId}...`);
      try {
        await delay(3000); // 3 second gap between series calls
        const squadRes = await client.get(`/series/v1/${sId}/squads`);
        const squadEntries = squadRes.data.squads || [];

        for (const entry of squadEntries) {
          if (entry.isHeader || !entry.squadId) continue;
          
          console.log(`  - Fetching Team: ${entry.squadType} (Squad: ${entry.squadId})...`);
          await delay(3000); // 3 second gap per team call

          const pData = await client.get(`/series/v1/${sId}/squads/${entry.squadId}`);
          const players = pData.data.player || pData.data.players || [];
          
          let tRes = await pool.query('SELECT id FROM "Team" WHERE name = $1', [entry.squadType]);
          if (!tRes.rows.length) {
             const s = entry.squadType.substring(0, 3).toUpperCase();
             tRes = await pool.query('INSERT INTO "Team" (name, "shortName") VALUES ($1, $2) RETURNING id', [entry.squadType, s]);
          }
          const dbTeamId = tRes.rows[0].id;

          for (const p of players) {
            if (p.isHeader) continue;
            const pRes = await pool.query(`
              INSERT INTO "Player" ("player_id", "name", "role", "team_name", "teamId", "updated_at")
              VALUES ($1, $2, $3, $4, $5, NOW())
              ON CONFLICT ("player_id") DO UPDATE SET
                "name" = EXCLUDED."name",
                "role" = EXCLUDED."role",
                "updated_at" = NOW()
              RETURNING id;
            `, [String(p.id), p.name, p.role || 'BAT', entry.squadType, dbTeamId]);

            // Link to ALL relevant matches for this team in this series
            const mRows = await pool.query(`
               SELECT id FROM "Match" 
               WHERE "series_id" = $1 
               AND ("teamAId" = $2 OR "teamBId" = $2)
            `, [sId, dbTeamId]);
            
            for (const mRow of mRows.rows) {
              await pool.query('INSERT INTO "MatchSquad" ("matchId", "playerId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [mRow.id, pRes.rows[0].id]);
            }
          }
        }
      } catch (sqErr) {
        if (sqErr.response) {
          console.error(`[SYNC] API Error: ${sqErr.response.status} - ${JSON.stringify(sqErr.response.data)}`);
        }
        console.warn(`[SYNC] Squad fetch failed for series ${sId}: ${sqErr.message}`);
      }
    }
    
    console.log('--- Optimized Throttled Sync Completed ---');
  } catch (err) {
    console.error('--- Optimized Throttled Sync Failed ---', err.message);
  } finally {
    await pool.end();
  }
}

runOptimizedSync();
