/**
 * playerSync.service.js
 * Fetches squad from RapidAPI for a specific match and UPSERTs into "Player" table.
 */

'use strict';

const client = require('./rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncPlayers(matchId) {
  console.log(`[SYNC] Starting Player Sync for Match API ID: ${matchId}...`);
  try {
    // 1. Fetch squad from API
    const res = await client.get(`/msc/v1/squads/${matchId}`);
    const squads = res.data.squads || [];
    
    let allPlayers = [];
    squads.forEach(s => {
      const teamName = s.teamName;
      (s.players || []).forEach(p => {
        allPlayers.push({ ...p, teamName });
      });
    });

    console.log(`[SYNC] Found ${allPlayers.length} players from API.`);

    const mRow = await pool.query('SELECT id FROM "Match" WHERE "api_id" = $1', [matchId]);
    const dbMatchId = mRow.rows[0]?.id;
    if (!dbMatchId) {
      console.warn(`[SYNC] Match ${matchId} not found in DB. Skipping player sync.`);
      return { success: false, reason: 'Match not found' };
    }

    for (const p of allPlayers) {
      const playerId   = String(p.id);
      const name       = p.name;
      const teamName   = p.teamName;
      const role       = p.role || 'BAT'; 
      
      // 1. Ensure Team exists and get ID
      const tShort = teamName.substring(0, 3).toUpperCase();
      let tRes = await pool.query('SELECT id FROM "Team" WHERE name = $1', [teamName]);
      if (!tRes.rows.length) {
        tRes = await pool.query('INSERT INTO "Team" ("name", "shortName") VALUES ($1, $2) RETURNING id', [teamName, tShort]);
      }
      const dbTeamId = tRes.rows[0].id;

      // 2. UPSERT Player
      const pRes = await pool.query(`
        INSERT INTO "Player" ("player_id", "name", "role", "team_name", "teamId", "updated_at")
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT ("player_id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "role" = EXCLUDED."role",
          "team_name" = EXCLUDED."team_name",
          "teamId" = EXCLUDED."teamId",
          "updated_at" = NOW()
        RETURNING id;
      `, [playerId, name, role, teamName, dbTeamId]);
      
      const dbPlayerId = pRes.rows[0].id;

      // 3. Link to MatchSquad
      await pool.query(`
        INSERT INTO "MatchSquad" ("matchId", "playerId")
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [dbMatchId, dbPlayerId]);
    }

    console.log(`[SYNC] Player Sync for Match ${matchId} completed.`);
    return { success: true, count: allPlayers.length };
  } catch (err) {
    console.error(`[SYNC] Player Sync Failed for Match ${matchId}:`, err.message);
    throw err;
  }
}

module.exports = { syncPlayers };
