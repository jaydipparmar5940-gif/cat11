require('dotenv').config({ path: '../.env' });
const rapidapiService = require('./src/services/rapidapi.service');

async function testFetch() {
  console.log('--- Triggering RapidAPI getUpcomingMatches ---');
  try {
    const matches = await rapidapiService.getUpcomingMatches();
    console.log(`Success! Inserted/Found ${matches.length} Matches.`);
    if (matches.length > 0) {
      console.log('Sample Match:', matches[0]);
    }
  } catch (err) {
    console.error('Error fetching matches:', err);
  }
  process.exit(0);
}

testFetch();
