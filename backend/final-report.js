/**
 * final-report.js
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
  try {
    const res = await pool.query(`
      SELECT 
        m.id, 
        m.api_id, 
        m.league_name,
        t1.name as team_a,
        t2.name as team_b,
        COUNT(ms.id) as squad_count
      FROM "Match" m
      JOIN "Team" t1 ON m."teamAId" = t1.id
      JOIN "Team" t2 ON m."teamBId" = t2.id
      LEFT JOIN "MatchSquad" ms ON m.id = ms."matchId"
      GROUP BY m.id, m.api_id, m.league_name, t1.name, t2.name
      HAVING COUNT(ms.id) > 0
      ORDER BY m.id;
    `);
    
    console.log('--- Matches with Players ---');
    res.rows.forEach(r => {
      console.log(`- Match ${r.id} (API ${r.api_id}): ${r.team_a} vs ${r.team_b} (${r.squad_count} players)`);
    });

  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

run();
