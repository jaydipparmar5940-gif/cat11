/**
 * check-schema.js
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

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('Match', 'Player', 'Team', 'MatchSquad')
      ORDER BY table_schema, table_name;
    `);
    console.log('TABLES_FOUND:', JSON.stringify(res.rows));

    for (const row of res.rows) {
      const q = `SELECT count(*) as count FROM "${row.table_schema}"."${row.table_name}"`;
      const c = await pool.query(q);
      console.log(`COUNT [${row.table_schema}.${row.table_name}]:`, c.rows[0].count);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

check();
