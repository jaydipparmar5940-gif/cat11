const { Client } = require('pg');

async function testConnection(config) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`SUCCESS: Connected to ${config.database} as ${config.user} with ${config.password}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED: ${config.database} as ${config.user} - Error: ${err.message}`);
    return false;
  }
}

async function runTests() {
  const configs = [
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: '5940', database: 'postgres' },
    { host: '127.0.0.1', port: 5432, user: 'admin', password: '5940', database: 'postgres' },
    { host: '127.0.0.1', port: 5432, user: 'Jimmy', password: '5940', database: 'postgres' },
    // A couple common fallback
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: '123', database: 'postgres' },
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'password', database: 'postgres' }
  ];

  for (let config of configs) {
    if (await testConnection(config)) {
      console.log('Found working config!');
      process.exit(0);
    }
  }
  console.log('No working config found.');
  process.exit(1);
}

runTests();
