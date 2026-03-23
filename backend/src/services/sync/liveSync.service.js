/**
 * liveSync.service.js
 * Fetches live scores from RapidAPI and UPDATES "LiveScore" table.
 */

'use strict';

const client = require('./rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncLive(matchId) {
  console.log(`[SYNC] Fetching Live Score for Match API ID: ${matchId}...`);
  try {
    const res = await client.get(`/mcenter/v1/${matchId}/scard`);
    const data = res.data;
    
    const scard = data.scorecard || [];
    const latest = scard[scard.length - 1] || {};
    
    const runs    = latest.scoreDetails?.runs || 0;
    const wickets = latest.scoreDetails?.wickets || 0;
    const overs   = latest.scoreDetails?.overs || 0;

    // Use internal ID if possible, or lookup via api_id
    const matchRow = await pool.query('SELECT id FROM "Match" WHERE "api_id" = $1', [matchId]);
    if (!matchRow.rows.length) return { success: false, reason: 'Match not found' };
    
    const dbMatchId = matchRow.rows[0].id;

    await pool.query(`
      INSERT INTO "LiveScore" ("matchId", "runs", "wickets", "overs", "updated_at")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT ("matchId") DO UPDATE SET
        "runs" = EXCLUDED."runs",
        "wickets" = EXCLUDED."wickets",
        "overs" = EXCLUDED."overs",
        "updated_at" = NOW();
    `, [dbMatchId, runs, wickets, overs]);

    console.log(`[SYNC] Live Score updated for Match ${matchId}: ${runs}/${wickets} (${overs} ov)`);
    return { success: true, runs, wickets, overs };
  } catch (err) {
    console.error(`[SYNC] Live Sync Failed for Match ${matchId}:`, err.message);
    throw err;
  }
}

module.exports = { syncLive };
