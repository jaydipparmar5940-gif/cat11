require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getApiId() {
  try {
    const { rows } = await pool.query('SELECT api_id FROM "public"."Match" LIMIT 1');
    if (rows.length > 0) {
      console.log('API_ID:', rows[0].api_id);
    } else {
      console.log('NO MATCHES FOUND');
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

getApiId();
