const { Client } = require('pg');
require('dotenv').config({ path: 'c:/Users/Jimmy/dream11/backend/.env' });

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '5940',
  database: process.env.DB_NAME || 'fantasy_cricket_db'
});

async function verify() {
  await client.connect();
  
  const matchCount = await client.query('SELECT COUNT(*) FROM "Match"');
  const playerCount = await client.query('SELECT COUNT(*) FROM "Player"');
  const upcoming = await client.query(`
    SELECT m.id, t1."shortName" as home, t2."shortName" as away, m."matchStartTime", m.status
    FROM "Match" m
    JOIN "Team" t1 ON m."teamAId" = t1.id
    JOIN "Team" t2 ON m."teamBId" = t2.id
    ORDER BY m."matchStartTime" ASC
    LIMIT 5
  `);

  console.log('\n--- SYNC VERIFICATION ---');
  console.log(`Total Matches: ${matchCount.rows[0].count}`);
  console.log(`Total Players: ${playerCount.rows[0].count}`);
  console.log('\nUpcoming 5 Matches:');
  console.table(upcoming.rows);
  
  await client.end();
}

verify().catch(console.error);
