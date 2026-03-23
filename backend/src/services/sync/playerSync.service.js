/**
 * playerSync.service.js
 * Synchronizes player data for matches and series.
 * Handles the nested RapidAPI Cricbuzz series squad structure.
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
 * This is the preferred method for LIVE matches.
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
      let tRes = await pool.query('SELECT id FROM "Team" WHERE name = $1', [teamName]);
      const dbTeamId = tRes.rows[0]?.id;

      for (const p of (s.players || [])) {
        await upsertPlayerAndLink(p, teamName, dbTeamId, dbMatchId);
      }
    }
    return { success: true };
  } catch (err) {
    console.warn(`[SYNC] Match Squad Sync Failed for ${matchId} (Expected for upcoming):`, err.message);
    return { success: false };
  }
}

/**
 * Sync players for an entire series (Series Squad fallback)
 * Fetches team list first, then individual players for each team.
 */
async function syncSeriesSquads(seriesId, apiMatchId = null) {
  console.log(`[SYNC] Starting Series Squad Sync for Series: ${seriesId}...`);
  try {
    const res = await client.get(`/series/v1/${seriesId}/squads`);
    const squadEntries = res.data.squads || [];
    
    let dbMatchId = null;
    let matchTeamIds = [];
    if (apiMatchId) {
      const mRow = await pool.query('SELECT id, "teamAId", "teamBId" FROM "Match" WHERE "api_id" = $1', [apiMatchId]);
      if (mRow.rows.length) {
        dbMatchId = mRow.rows[0].id;
        matchTeamIds = [mRow.rows[0].teamAId, mRow.rows[0].teamBId];
      }
    }

    for (const entry of squadEntries) {
      if (entry.isHeader || !entry.squadId) continue;
      
      const squadId  = entry.squadId;
      const teamName = entry.squadType; // In this API, squadType is often the team name
      
      console.log(`[SYNC] Fetching players for Team: ${teamName} (Squad: ${squadId})...`);
      
      // Get/Create Team
      let tRes = await pool.query('SELECT id FROM "Team" WHERE name = $1', [teamName]);
      if (!tRes.rows.length && teamName) {
        const tShort = teamName.substring(0, 3).toUpperCase();
        tRes = await pool.query('INSERT INTO "Team" ("name", "shortName") VALUES ($1, $2) RETURNING id', [teamName, tShort]);
      }
      const dbTeamId = tRes.rows[0]?.id;

      // Fetch Players for this specific squad
      try {
        const pRes = await client.get(`/series/v1/${seriesId}/squads/${squadId}`);
        const players = pRes.data.players || [];
        
        for (const p of players) {
          const isMatchPlayer = dbMatchId && matchTeamIds.includes(dbTeamId);
          await upsertPlayerAndLink(p, teamName, dbTeamId, isMatchPlayer ? dbMatchId : null);
        }
      } catch (pErr) {
        console.warn(`[SYNC] Failed to fetch players for squad ${squadId}:`, pErr.message);
      }
    }
    return { success: true };
  } catch (err) {
    console.error(`[SYNC] Series Squad Sync Failed for ${seriesId}:`, err.message);
    throw err;
  }
}

async function upsertPlayerAndLink(p, teamName, dbTeamId, dbMatchId) {
  const playerId = String(p.id);
  const name     = p.name;
  const role     = normaliseRole(p.role || 'BAT');

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

function normaliseRole(r = '') {
  const s = r.toLowerCase();
  if (s.includes('wicket') || s.includes('wk') || s.includes('keeper')) return 'WK';
  if (s.includes('all'))  return 'AR';
  if (s.includes('bowl')) return 'BOWL';
  return 'BAT';
}

module.exports = { syncPlayers, syncSeriesSquads };
