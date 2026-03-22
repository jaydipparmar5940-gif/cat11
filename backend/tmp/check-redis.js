const { createClient } = require('redis');
const client = createClient({
  url: 'redis://localhost:6379'
});

async function check() {
  try {
    await client.connect();
    console.log('REDIS_CONNECTED');
    await client.quit();
  } catch (err) {
    console.error('REDIS_CONNECTION_FAILED:', err.message);
    process.exit(1);
  }
}
check();
