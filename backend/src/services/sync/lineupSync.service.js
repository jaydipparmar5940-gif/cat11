/**
 * lineupSync.service.js
 * Checks lineups from RapidAPI and updates "Match" table.
 */

'use strict';

const client = require('./rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncLineups(matchId) {
  console.log(`[SYNC] Checking Lineups for Match API ID: ${matchId}...`);
  try {
    const res = await client.get(`/mcenter/v1/${matchId}/scard`);
    const data = res.data;
    
    // Logic: If we find playing XI or specific state
    const isLineupOut = (data.scorecard && data.scorecard.length > 0) || (data.status && data.status.toLowerCase().includes('toss'));
    
    if (isLineupOut) {
      await pool.query(`
        UPDATE "Match" 
        SET "lineup_status" = 'confirmed', 
            "lineup_json" = $1,
            "updated_at" = NOW()
        WHERE "api_id" = $2
      `, [JSON.stringify(data.scorecard || {}), matchId]);
      console.log(`[SYNC] Lineup confirmed for Match ${matchId}`);
    } else {
      console.log(`[SYNC] Lineup NOT yet out for Match ${matchId}`);
    }

    return { success: true, lineup_status: isLineupOut ? 'confirmed' : 'out' };
  } catch (err) {
    console.error(`[SYNC] Lineup Sync Failed for Match ${matchId}:`, err.message);
    throw err;
  }
}

module.exports = { syncLineups };
