const { Client } = require('pg');

async function setup() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '5940',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to default postgres DB.');
    await client.query('CREATE DATABASE fantasy_cricket_db');
    console.log('Database fantasy_cricket_db created successfully.');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database fantasy_cricket_db already exists.');
    } else {
      console.error('Error creating database:', err);
    }
  } finally {
    await client.end();
  }
}

setup();
