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

const { syncPlayers } = require('./playerSync.service');

async function upsertTeam(name) {
  if (!name) return null;
  const shortName = name.substring(0, 3).toUpperCase();
  const res = await pool.query(`
    INSERT INTO "Team" ("name", "shortName")
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING id;
  `, [name, shortName]);
  
  if (res.rows.length) return res.rows[0].id;
  
  const existing = await pool.query('SELECT id FROM "Team" WHERE name = $1', [name]);
  return existing.rows[0]?.id;
}

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
            allMatches.push({ ...m, league_name: sMatch.seriesAdWrapper.seriesName, series_id: sMatch.seriesAdWrapper.seriesId });
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
      const seriesId     = String(m.series_id || '');

      const teamAId = await upsertTeam(teamA);
      const teamBId = await upsertTeam(teamB);

      if (!teamAId || !teamBId) {
        console.warn(`[SYNC] Skipping match ${matchId} due to missing team IDs.`);
        continue;
      }

      await pool.query(`
        INSERT INTO "Match" ("api_id", "series_id", "teamAId", "teamBId", "matchStartTime", "status", "league_name", "updated_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT ("api_id") DO UPDATE SET
          "series_id" = EXCLUDED."series_id",
          "status" = EXCLUDED."status",
          "league_name" = EXCLUDED."league_name",
          "updated_at" = NOW();
      `, [matchId, seriesId, teamAId, teamBId, startTime, status, leagueName]);

      // Automatically sync players for this match (via Series Squads as fallback)
      try {
        const { syncSeriesSquads } = require('./playerSync.service');
        await syncSeriesSquads(seriesId, matchId);
      } catch (pErr) {
        console.error(`[SYNC] Squad sync failed for ${matchId}:`, pErr.message);
      }
    }

    console.log('[SYNC] Match Sync Completed Successfully.');
    return { success: true, count: allMatches.length };
  } catch (err) {
    console.error('[SYNC] Match Sync Failed:', err.message);
    throw err;
  }
}

module.exports = { syncMatches };
