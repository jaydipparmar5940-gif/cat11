/**
 * test-series-squads.js
 * Inspect /series/v1/${seriesId}/squads.
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = require('./src/services/sync/rapidApiClient');

async function test() {
  const seriesId = '7607'; // From the upcoming output
  console.log(`--- Testing /series/v1/${seriesId}/squads ---`);
  try {
    const res = await client.get(`/series/v1/${seriesId}/squads`);
    console.log('KEYS:', Object.keys(res.data));
    if (res.data.squads) {
      console.log('SQUADS_COUNT:', res.data.squads.length);
      res.data.squads.forEach(s => {
        console.log(`- Team: ${s.teamName}, Players: ${s.players ? s.players.length : 0}`);
      });
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
