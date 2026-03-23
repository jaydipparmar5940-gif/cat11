/**
 * match-sync.worker.js
 * Scheduled tasks for data synchronization.
 */

'use strict';

const cron = require('node-cron');
const { syncMatches } = require('../services/sync/matchSync.service');
const { syncLive }    = require('../services/sync/liveSync.service');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 1. Every 1 minute: Match List Sync
cron.schedule('* * * * *', async () => {
  console.log('[CRON] Running Match Sync...');
  try {
    await syncMatches();
  } catch (_) {}
});

// 2. Every 10 seconds: Live Match Score Polling
// We only poll for matches currently marked as 'LIVE'
setInterval(async () => {
  try {
    const res = await pool.query(`SELECT "api_id" FROM "Match" WHERE "status" = 'LIVE'`);
    if (res.rows.length) {
      console.log(`[CRON] Polling ${res.rows.length} live matches...`);
      for (const row of res.rows) {
        await syncLive(row.api_id);
      }
    }
  } catch (_) {}
}, 10000);

console.log('[CRON] Match Sync Workers Initialized.');
