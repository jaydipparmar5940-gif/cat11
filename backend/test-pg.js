require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query(`SELECT id, status, "teamAId", "teamBId", "matchStartTime" FROM "Match"`);
    console.log('Matches in DB:', res.rows.length);
    if (res.rows.length > 0) {
      console.log('Sample rows:', res.rows.slice(0, 3));
    }
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    pool.end();
  }
}

check();
