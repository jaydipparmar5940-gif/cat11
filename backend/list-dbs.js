/**
 * list-dbs.js
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

async function list() {
  try {
    const dbs = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('DATABASES:', JSON.stringify(dbs.rows.map(r => r.datname)));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

list();
