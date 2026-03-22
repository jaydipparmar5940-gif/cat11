const { Client } = require('pg');
const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'fantasy_cricket_db'
});

async function check() {
  try {
    await client.connect();
    console.log('DB_CONNECTED');
    await client.end();
  } catch (err) {
    console.error('DB_CONNECTION_FAILED:', err.message);
    process.exit(1);
  }
}
check();
