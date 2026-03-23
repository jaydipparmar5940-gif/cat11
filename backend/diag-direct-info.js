/**
 * diag-direct-info.js
 * Identifies current database, schema, and counts for Direct 5432.
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

async function diag() {
  try {
    const info = await pool.query(`
      SELECT current_database(), current_schema(), current_user;
    `);
    console.log('DIRECT_DB_INFO:', JSON.stringify(info.rows[0]));

    const counts = await pool.query(`
      SELECT 
        (SELECT count(*) FROM "Match") as matches,
        (SELECT count(*) FROM "Player") as players,
        (SELECT count(*) FROM "Team") as teams,
        (SELECT count(*) FROM "MatchSquad") as squads
    `);
    console.log('DIRECT_COUNTS:', JSON.stringify(counts.rows[0]));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

diag();
