/**
 * playerSync.service.js
 * Synchronizes player data for matches and series.
 */

'use strict';

const client = require('./rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Sync players for a specific match (Match-Specific Squad)
 */
async function syncPlayers(matchId) {
  console.log(`[SYNC] Starting Player Sync for Match API ID: ${matchId}...`);
  try {
    const res = await client.get(`/msc/v1/squads/${matchId}`);
    const squads = res.data.squads || [];
    
    const mRow = await pool.query('SELECT id, "teamAId", "teamBId" FROM "Match" WHERE "api_id" = $1', [matchId]);
    const dbMatchId = mRow.rows[0]?.id;
    if (!dbMatchId) return { success: false, reason: 'Match not found' };

    for (const s of squads) {
      const teamName = s.teamName;
      const tRes = await pool.query('SELECT id FROM "Team" WHERE name = $1', [teamName]);
      const dbTeamId = tRes.rows[0]?.id;

      for (const p of (s.players || [])) {
        await upsertPlayerAndLink(p, teamName, dbTeamId, dbMatchId);
      }
    }
    return { success: true };
  } catch (err) {
    console.error(`[SYNC] Player Sync Failed for ${matchId}:`, err.message);
    throw err;
  }
}

/**
 * Sync players for an entire series (Series Squad fallback)
 */
async function syncSeriesSquads(seriesId, apiMatchId = null) {
  console.log(`[SYNC] Starting Series Squad Sync for Series: ${seriesId}...`);
  try {
    const res = await client.get(`/series/v1/${seriesId}/squads`);
    const squads = res.data.squads || [];
    
    let dbMatchId = null;
    let matchTeamIds = [];
    if (apiMatchId) {
      const mRow = await pool.query('SELECT id, "teamAId", "teamBId" FROM "Match" WHERE "api_id" = $1', [apiMatchId]);
      if (mRow.rows.length) {
        dbMatchId = mRow.rows[0].id;
        matchTeamIds = [mRow.rows[0].teamAId, mRow.rows[0].teamBId];
      }
    }

    for (const s of squads) {
      const teamName = s.teamName;
      let tRes = await pool.query('SELECT id FROM "Team" WHERE name = $1', [teamName]);
      if (!tRes.rows.length && teamName) {
        const tShort = s.teamShortName || teamName.substring(0, 3).toUpperCase();
        tRes = await pool.query('INSERT INTO "Team" ("name", "shortName") VALUES ($1, $2) RETURNING id', [teamName, tShort]);
      }
      const dbTeamId = tRes.rows[0]?.id;

      const players = s.squaddedPlayers || s.players || [];
      for (const p of players) {
        const isMatchPlayer = dbMatchId && matchTeamIds.includes(dbTeamId);
        await upsertPlayerAndLink(p, teamName, dbTeamId, isMatchPlayer ? dbMatchId : null);
      }
    }
    return { success: true };
  } catch (err) {
    console.warn(`[SYNC] Series Sync Failed for ${seriesId}:`, err.message);
    return { success: false };
  }
}

async function upsertPlayerAndLink(p, teamName, dbTeamId, dbMatchId) {
  const playerId = String(p.id);
  const name     = p.name;
  const role     = p.role || 'BAT';

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
  `, [playerId, name, role, teamName, dbTeamId || 1]);

  const dbPlayerId = pRes.rows[0].id;

  if (dbMatchId) {
    await pool.query(`
      INSERT INTO "MatchSquad" ("matchId", "playerId")
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [dbMatchId, dbPlayerId]);
  }
}

module.exports = { syncPlayers, syncSeriesSquads };
