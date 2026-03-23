/**
 * test-player-sync.js
 * Manually call syncPlayers and see the result.
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { syncPlayers } = require('./src/services/sync/playerSync.service');

async function test() {
  const matchId = '148830'; // From check-db output
  console.log(`--- Testing syncPlayers for ${matchId} ---`);
  try {
    const res = await syncPlayers(matchId);
    console.log('RESULT:', JSON.stringify(res));
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
