require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const RAPID_API_KEY  = process.env.RAPID_API_KEY;
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';

const apiId = "122709";
let log = '';

async function test(path) {
  try {
    const res = await axios.get(`https://${RAPID_API_HOST}${path}`, {
      headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST }
    });
    log += `[SUCCESS] ${path} -> Keys: ${Object.keys(res.data).join(', ')}\n`;
  } catch (e) {
    log += `[FAIL] ${path} -> ${e.response?.status} ${e.response?.statusText || e.message}\n`;
  }
}

async function run() {
  // mcenter variations
  await test(`/mcenter/v1/${apiId}/comm`);       // commentary - WORKS
  await test(`/mcenter/v1/${apiId}/scard`);      // scorecard
  await test(`/mcenter/v1/${apiId}/squad`);      // squad
  await test(`/mcenter/v1/${apiId}/lineup`);     // lineup
  await test(`/mcenter/v1/${apiId}/full-score`); // full score
  
  // series/squad methods
  await test(`/series/v1/11671/squads`);         // series squads - using Legends League seriesId
  await test(`/series/v1/11671/squad/${apiId}`); // match specific squads

  // matches variations
  await test(`/matches/v1/${apiId}/comm`);
  await test(`/matches/v1/${apiId}/squad`);
  await test(`/matches/v1/${apiId}/scorecard`);
  
  // stats variations
  await test(`/stats/v1/match/${apiId}/runningScorecard`);
  await test(`/stats/v1/match/${apiId}/event`);
  
  fs.writeFileSync('endpoints2.txt', log);
  console.log('Done:', log);
}

run();
