/**
 * get-active-matches.js
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

async function get() {
  try {
    const res = await pool.query(`SELECT "api_id", "series_id" FROM "Match" WHERE status IN ('UPCOMING','LIVE')`);
    console.log('ACTIVE_MATCHES:', JSON.stringify(res.rows));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

get();
