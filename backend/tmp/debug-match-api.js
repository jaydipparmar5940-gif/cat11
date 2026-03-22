const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/Jimmy/dream11/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function debugMatch(id) {
  try {
    const result = await pool.query(`
      SELECT
        m.id, m.status, m."matchStartTime",
        json_build_object(
          'id', t1.id, 
          'name', t1.name, 
          'shortName', COALESCE(t1."shortName", UPPER(SUBSTRING(t1.name, 1, 3))), 
          'logo', COALESCE(t1.logo, 'https://via.placeholder.com/40')
        ) as "teamA",
        json_build_object(
          'id', t2.id, 
          'name', t2.name, 
          'shortName', COALESCE(t2."shortName", UPPER(SUBSTRING(t2.name, 1, 3))), 
          'logo', COALESCE(t2.logo, 'https://via.placeholder.com/40')
        ) as "teamB"
      FROM "Match" m
      JOIN "Team" t1 ON m."teamAId" = t1.id
      JOIN "Team" t2 ON m."teamBId" = t2.id
      WHERE m.id = $1
    `, [id]);
    console.log('Result:', result.rows[0]);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

debugMatch(parseInt(process.argv[2]) || 1);
