/**
 * insert-mock-players.js
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- Mock Data Insertion Starting ---');
  try {
    // 1. Get Match 1 (api_id 102435)
    const mRes = await pool.query('SELECT id, "teamAId" FROM "Match" WHERE "api_id" = \'102435\'');
    if (!mRes.rows.length) throw new Error('Match 1 not found. Run minimal-sync first.');
    const dbMatchId = mRes.rows[0].id;
    const dbTeamId = mRes.rows[0].teamAId;

    const mockPlayers = [
      { id: 'mock1', name: 'MOCK PLAYER 1', role: 'BAT' },
      { id: 'mock2', name: 'MOCK PLAYER 2', role: 'BOWL' },
      { id: 'mock3', name: 'MOCK PLAYER 3', role: 'AR' }
    ];

    for (const p of mockPlayers) {
      const pRes = await pool.query(`
        INSERT INTO "Player" ("player_id", "name", "role", "team_name", "teamId")
        VALUES ($1, $2, $3, 'Germany', $4)
        ON CONFLICT ("player_id") DO UPDATE SET "updated_at" = NOW()
        RETURNING id;
      `, [p.id, p.name, p.role, dbTeamId]);
      
      await pool.query('INSERT INTO "MatchSquad" ("matchId", "playerId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [dbMatchId, pRes.rows[0].id]);
    }
    console.log('--- Mock Data Inserted Successfully ---');

  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

run();
