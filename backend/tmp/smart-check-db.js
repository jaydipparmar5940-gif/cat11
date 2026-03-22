const { Client } = require('pg');

async function testConnection(config) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`SUCCESS: Connected to ${config.database} as ${config.user}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED: ${config.database} as ${config.user} - Error: ${err.message}`);
    return false;
  }
}

async function checkMultiple() {
  console.log('Testing default configurations...');
  
  // Test 1: postgres admin connecting to default 'postgres' db
  const adminConfig = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'password', database: 'postgres' };
  const adminConfig2 = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'root', database: 'postgres' };
  const adminConfig3 = { host: '127.0.0.1', port: 5432, user: 'postgres', password: '', database: 'postgres' };
  const adminConfig4 = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' };

  let connectedConfig = null;

  if (await testConnection(adminConfig)) connectedConfig = adminConfig;
  else if (await testConnection(adminConfig2)) connectedConfig = adminConfig2;
  else if (await testConnection(adminConfig3)) connectedConfig = adminConfig3;
  else if (await testConnection(adminConfig4)) connectedConfig = adminConfig4;

  if (connectedConfig) {
    console.log('\nFound working admin credentials!');
    console.log(JSON.stringify(connectedConfig));
    // Now try to create our app database if it doesn't exist
    const adminClient = new Client(connectedConfig);
    await adminClient.connect();
    try {
      await adminClient.query('CREATE DATABASE fantasy_cricket_db');
      console.log('Created fantasy_cricket_db successfully!');
    } catch(err) {
      if(err.code === '42P04') {
        console.log('fantasy_cricket_db already exists.');
      } else {
        console.error('Error creating database:', err.message);
      }
    }
    await adminClient.end();
  } else {
    console.log('\nCould not connect with any common default passwords.');
    process.exit(1);
  }
}

checkMultiple();
