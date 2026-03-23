const Redis = require('ioredis');
const redis = new Redis('redis://127.0.0.1:6379', { maxRetriesPerRequest: 1 });
async function test() {
  console.log('Fetching...');
  try {
    const res = await redis.get('test');
    console.log('Result:', res);
  } catch (err) {
    console.log('Err:', err.message);
  }
  process.exit(0);
}
test();
