'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    const rows = await pool.query('SELECT id, api_id, "teamAId", "teamBId", status FROM "Match" ORDER BY id DESC LIMIT 3');
    console.log('MATCH_ROWS:', JSON.stringify(rows.rows));
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

check();
