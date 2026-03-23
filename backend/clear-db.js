/**
 * clear-db.js
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

async function clear() {
  try {
    await pool.query('TRUNCATE TABLE "MatchSquad", "Player", "Match", "Team" RESTART IDENTITY CASCADE');
    console.log('CLEARED SUCCESS');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

clear();
