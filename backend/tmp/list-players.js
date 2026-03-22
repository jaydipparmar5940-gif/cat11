const { Client } = require('pg');
require('dotenv').config({ path: 'c:/Users/Jimmy/dream11/backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function verify() {
  await client.connect();
  const res = await client.query(`
    SELECT p.name, t."shortName", p.role, p.credit, p."isPlaying"
    FROM "Player" p
    JOIN "Team" t ON p."teamId" = t.id
    ORDER BY p.id DESC LIMIT 10
  `);
  res.rows.forEach(r => console.log(`${r.name} (${r.shortName}) | ${r.role} | CR: ${r.credit} | Playing: ${r.isPlaying}`));
  await client.end();
}
verify();
