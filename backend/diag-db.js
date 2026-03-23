/**
 * diag-db.js
 * Identifies current database, schema, and table counts.
 */

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

async function diag() {
  try {
    const info = await pool.query(`
      SELECT current_database(), current_schema(), current_user;
    `);
    console.log('DB_INFO:', JSON.stringify(info.rows[0]));

    const counts = await pool.query(`
      SELECT 
        (SELECT count(*) FROM "Match") as matches,
        (SELECT count(*) FROM "Player") as players,
        (SELECT count(*) FROM "Team") as teams,
        (SELECT count(*) FROM "MatchSquad") as squads
    `);
    console.log('COUNTS:', JSON.stringify(counts.rows[0]));

    const tables = await pool.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_name IN ('Match', 'Player', 'Team', 'MatchSquad')
      AND table_schema NOT IN ('information_schema', 'pg_catalog');
    `);
    console.log('TABLES_FOUND:', JSON.stringify(tables.rows));

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

diag();
