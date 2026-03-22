require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:5940@127.0.0.1:5432/fantasy_cricket_db' });

async function check() {
  await client.connect();
  // Check match 3 team IDs
  const match = await client.query('SELECT id, "teamAId", "teamBId" FROM "Match" WHERE id=3');
  console.log('Match 3:', match.rows[0]);
  const { teamAId, teamBId } = match.rows[0];

  // Check players under those teams
  const p = await client.query('SELECT id, name, role, "teamId" FROM "Player" WHERE "teamId" IN ($1,$2) LIMIT 5', [teamAId, teamBId]);
  console.log(`Players for team ${teamAId}/${teamBId} (${p.rows.length} found):`, p.rows);
  await client.end();
}
check().catch(console.error);
