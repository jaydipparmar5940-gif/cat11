/**
 * test-team-squads.js
 * Inspect /mcenter/v1/${matchId}/team-squads.
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = require('./src/services/sync/rapidApiClient');

async function test() {
  const matchId = '148830'; 
  console.log(`--- Testing /mcenter/v1/${matchId}/team-squads ---`);
  try {
    const res = await client.get(`/mcenter/v1/${matchId}/team-squads`);
    console.log('KEYS:', Object.keys(res.data));
    if (res.data.squads) {
      console.log('SQUADS_COUNT:', res.data.squads.length);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
