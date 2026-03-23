/**
 * test-scard-endpoint.js
 * Inspect the response of /mcenter/v1/${matchId}/scard.
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = require('./src/services/sync/rapidApiClient');

async function test() {
  const matchId = '148830'; 
  console.log(`--- Testing /mcenter/v1/${matchId}/scard ---`);
  try {
    const res = await client.get(`/mcenter/v1/${matchId}/scard`);
    console.log('KEYS:', Object.keys(res.data));
    if (res.data.matchHeader) {
      console.log('MATCH_HEADER:', JSON.stringify(res.data.matchHeader));
    }
    if (res.data.scorecard) {
      console.log('SCORECARD_COUNT:', res.data.scorecard.length);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
