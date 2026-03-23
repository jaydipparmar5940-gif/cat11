/**
 * full-sync.js
 * Runs match sync and series squad sync.
 */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { syncMatches } = require('./src/services/sync/matchSync.service');

async function run() {
  console.log('--- Starting Full Sync on Direct DB ---');
  try {
    const res = await syncMatches();
    console.log('SYNC_COMPLETE:', JSON.stringify(res));
  } catch (err) {
    console.error('SYNC_FAILED:', err.message);
  }
}

run();
