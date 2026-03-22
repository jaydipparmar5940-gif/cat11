const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:postgres@localhost:5432/fantasy_cricket_db"
});

async function testConnection() {
  try {
    await client.connect();
    console.log('[PG TEST] Successfully connected to PostgreSQL');
    const res = await client.query('SELECT current_database(), current_user, version();');
    console.log('[PG TEST] Database Info:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('[PG TEST] Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
