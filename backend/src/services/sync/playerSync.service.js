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

    for (const p of allPlayers) {
      const playerId   = String(p.id);
      const name       = p.name;
      const teamName   = p.teamName;
      const role       = p.role || 'BAT'; // Default
      
      // UPSERT Player
      // We look for team by name, fallback to id 1 if not found
      await pool.query(`
        INSERT INTO "Player" ("player_id", "name", "role", "team_name", "updated_at")
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT ("player_id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "role" = EXCLUDED."role",
          "team_name" = EXCLUDED."team_name",
          "updated_at" = NOW();
      `, [playerId, name, role, teamName]);
    }

    console.log(`[SYNC] Player Sync for Match ${matchId} completed.`);
    return { success: true, count: allPlayers.length };
  } catch (err) {
    console.error(`[SYNC] Player Sync Failed for Match ${matchId}:`, err.message);
    throw err;
  }
}

module.exports = { syncPlayers };
