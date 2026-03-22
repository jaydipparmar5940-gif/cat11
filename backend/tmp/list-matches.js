const { Client } = require('pg');
require('dotenv').config({ path: 'c:/Users/Jimmy/dream11/backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function verify() {
  await client.connect();
  const res = await client.query(`
    SELECT t1."shortName" || ' vs ' || t2."shortName" as match, m.status, m."seriesName"
    FROM "Match" m
    JOIN "Team" t1 ON m."teamAId" = t1.id
    JOIN "Team" t2 ON m."teamBId" = t2.id
    ORDER BY m.id DESC LIMIT 10
  `);
  res.rows.forEach(r => console.log(`${r.match} | ${r.status} | ${r.seriesName}`));
  await client.end();
}
verify();
