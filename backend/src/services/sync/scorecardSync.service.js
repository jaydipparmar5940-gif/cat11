/**
 * scorecardSync.service.js
 * Fetches full scorecard from RapidAPI and calculates/stores Fantasy Points.
 */

'use strict';

const client = require('./rapidApiClient');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncScorecard(matchId) {
  console.log(`[SYNC] Syncing Scorecard & Points for Match API ID: ${matchId}...`);
  try {
    const res = await client.get(`/mcenter/v1/${matchId}/scard`);
    const data = res.data;
    const scard = data.scorecard || [];
    
    const pointsMap = {}; // player_id -> cumulative points

    scard.forEach(inn => {
      // 1. Batting
      const batters = inn.batTeamDetails?.batsmenData || {};
      Object.values(batters).forEach(b => {
        const pid = String(b.batId);
        const runs = parseInt(b.runs) || 0;
        pointsMap[pid] = (pointsMap[pid] || 0) + (runs * 1); // 1 pt per run
      });

      // 2. Bowling
      const bowlers = inn.bowlTeamDetails?.bowlersData || {};
      Object.values(bowlers).forEach(b => {
        const pid = String(b.bowlId);
        const wickets = parseInt(b.wickets) || 0;
        pointsMap[pid] = (pointsMap[pid] || 0) + (wickets * 25); // 25 pt per wicket
      });

      // 3. Catches (Fielder)
      Object.values(batters).forEach(b => {
        if (b.dismissal && b.dismissal.toLowerCase().includes('c ')) {
          // Attempting to parse fielder name/id is hard from scard JSON, 
          // but RapidAPI usually has it in specific fields if detailed.
          // For simplicity in this demo, we'll stick to basic stats.
        }
      });
    });

    // Lookup internal ids to match api ids
    const matchRow = await pool.query('SELECT id FROM "Match" WHERE "api_id" = $1', [matchId]);
    const dbMatchId = matchRow.rows[0]?.id;
    if (!dbMatchId) return { success: false, reason: 'Match not found in DB' };

    console.log(`[SYNC] Calculated points for ${Object.keys(pointsMap).length} players.`);

    for (const [pApiId, pts] of Object.entries(pointsMap)) {
      const pRow = await pool.query('SELECT id FROM "Player" WHERE "player_id" = $1', [pApiId]);
      if (pRow.rows.length) {
        const dbPlayerId = pRow.rows[0].id;
        await pool.query(`
          INSERT INTO "PlayerPoint" ("playerId", "matchId", "points", "updated_at")
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT ("playerId", "matchId") DO UPDATE SET
            "points" = EXCLUDED."points",
            "updated_at" = NOW();
        `, [dbPlayerId, dbMatchId, pts]);
      }
    }

    return { success: true, playersCount: Object.keys(pointsMap).length };
  } catch (err) {
    console.error(`[SYNC] Scorecard Sync Failed for Match ${matchId}:`, err.message);
    throw err;
  }
}

module.exports = { syncScorecard };
