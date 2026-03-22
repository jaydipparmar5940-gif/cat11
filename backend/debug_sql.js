require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MATCH_SELECT = `
  SELECT
    m.id                                        AS match_id,
    m."apiId"                                   AS api_id
  FROM "Match" m
  LIMIT 1
`;

pool.query(MATCH_SELECT)
  .then(res => {
    console.log('Success!', res.rows[0]);
    pool.end();
  })
  .catch(err => {
    console.error('SQL Error:', err.message);
    pool.end();
  });
