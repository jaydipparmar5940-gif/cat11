/**
 * sync-cricapi.js
 * Fetches live upcoming cricket matches and squad data from CricAPI (free tier)
 * and upserts them into the local PostgreSQL DB.
 *
 * Free plan endpoints used:
 *   - /currentMatches  → get live/upcoming matches
 *   - /match_squad     → get players per match (with playerImg URLs)
 *
 * Usage: node src/utils/sync-cricapi.js
 */

require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');

const CRICAPI_KEY = process.env.CRICAPI_KEY;
const BASE = 'https://api.cricapi.com/v1';

if (!CRICAPI_KEY) {
  console.error('[SYNC] No CRICAPI_KEY in .env. Aborting.');
  process.exit(1);
}

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '5940',
  database: process.env.DB_NAME || 'fantasy_cricket_db'
});

// ── Role normalization ────────────────────────────────────────────────────────

function normalizeRole(role) {
  if (!role) return 'BAT';
  const r = role.toLowerCase();
  if (r.includes('wicket') || r.includes('wk')) return 'WK';
  if (r.includes('bowl') && !r.includes('all'))  return 'BOWL';
  if (r.includes('all'))                          return 'AR';
  return 'BAT';
}

function estimateCredit(role) {
  return { WK: 8.5, BAT: 8.5, AR: 9.0, BOWL: 8.0 }[normalizeRole(role)] || 8.5;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiGet(endpoint, params = {}) {
  const res = await axios.get(`${BASE}/${endpoint}`, {
    params: { apikey: CRICAPI_KEY, ...params },
    timeout: 10000
  });
  return res.data;
}

// ── DB upsert helpers ─────────────────────────────────────────────────────────

async function addColumnsIfNeeded() {
  await client.query(`
    ALTER TABLE "Player"
      ADD COLUMN IF NOT EXISTS "playerImg"          TEXT,
      ADD COLUMN IF NOT EXISTS "selectionPercentage" DECIMAL(5,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "isPlaying"           BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "points"              DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cricApiId"           TEXT;
    ALTER TABLE "Match"
      ADD COLUMN IF NOT EXISTS "cricApiId" TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS "seriesName" TEXT;
  `);
}

async function upsertTeam(name, shortName, logoUrl) {
  const logo = logoUrl && !logoUrl.includes('icon512') ? logoUrl
    : `https://documents.iplt20.com/ipl/${shortName}/logos/Logooutline/${shortName}outline.png`;

  const existing = await client.query(
    `SELECT id FROM "Team" WHERE "shortName" = $1`, [shortName]
  );
  if (existing.rows.length) {
    // Update logo if we got a real one
    if (logoUrl && !logoUrl.includes('icon512')) {
      await client.query(`UPDATE "Team" SET logo=$1 WHERE id=$2`, [logoUrl, existing.rows[0].id]);
    }
    return existing.rows[0].id;
  }

  const res = await client.query(
    `INSERT INTO "Team" (name, "shortName", logo) VALUES ($1,$2,$3) RETURNING id`,
    [name, shortName, logo]
  );
  return res.rows[0].id;
}

async function upsertMatch(teamAId, teamBId, startTime, status, cricApiId, seriesName) {
  // Check if already exists by cricApiId
  const existing = await client.query(
    `SELECT id FROM "Match" WHERE "cricApiId" = $1`,
    [cricApiId]
  );
  if (existing.rows.length) {
    await client.query(
      `UPDATE "Match" SET status=$1, "matchStartTime"=$2, "seriesName"=$3 WHERE id=$4`,
      [status, startTime, seriesName, existing.rows[0].id]
    );
    return { id: existing.rows[0].id, isNew: false };
  }

  const res = await client.query(
    `INSERT INTO "Match" ("teamAId","teamBId","matchStartTime",status,"cricApiId","seriesName")
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [teamAId, teamBId, startTime, status, cricApiId, seriesName]
  );
  const matchId = res.rows[0].id;

  // Auto-create contests for new match
  await client.query(`
    INSERT INTO "Contest" ("matchId","entryFee","totalSpots","prizePool",status) VALUES
      ($1, 49,  1000000, 50000000, 'OPEN'),
      ($1, 19,  5000,    20000,    'OPEN'),
      ($1, 0,   10000,   0,        'OPEN'),
      ($1, 99,  1000,    50000,    'OPEN'),
      ($1, 25,  500,     10000,    'OPEN'),
      ($1, 299, 100,     20000,    'OPEN')
  `, [matchId]);

  return { id: matchId, isNew: true };
}

async function upsertPlayer(cricApiId, name, teamId, role, credit, playerImg, isPlaying = true) {
  const existing = await client.query(
    `SELECT id FROM "Player" WHERE name=$1 AND "teamId"=$2`,
    [name, teamId]
  );
  if (existing.rows.length) {
    await client.query(
      `UPDATE "Player" SET role=$1, credit=$2, "playerImg"=$3, "cricApiId"=$4, "isPlaying"=$5 WHERE id=$6`,
      [normalizeRole(role), credit, playerImg || null, cricApiId, isPlaying, existing.rows[0].id]
    );
  } else {
    await client.query(
      `INSERT INTO "Player" ("cricApiId", name, "teamId", role, credit, "playerImg", "isPlaying")
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [cricApiId, name, teamId, normalizeRole(role), credit, playerImg || null, isPlaying]
    );
  }
}

// ── Main sync ─────────────────────────────────────────────────────────────────

async function sync() {
  await client.connect();
  console.log('[SYNC] Connected to DB');

  await addColumnsIfNeeded();
  console.log('[SYNC] DB columns verified');

  // Step 1: Fetch current matches
  console.log('[SYNC] Fetching current matches from CricAPI...');
  let matchesData;
  try {
    const res = await apiGet('currentMatches', { offset: 0 });
    matchesData = res.data || [];
    console.log(`[SYNC] Got ${matchesData.length} matches | API credits remaining: ${res.info?.hitsLimit - res.info?.hitsUsed}`);
  } catch (err) {
    console.error('[SYNC] Failed to fetch matches:', err.message);
    await client.end();
    return;
  }

  // Filter: only fantasyEnabled matches with a squad
  const eligible = matchesData.filter(m => m.fantasyEnabled === true && m.hasSquad === true);
  console.log(`[SYNC] ${eligible.length} fantasy-enabled matches with squads`);

  let synced = 0;
  let apicalls = 0;

  for (const match of eligible.slice(0, 8)) { // cap at 8 to save quota
    try {
      const tInfoA = match.teamInfo?.[0] || {};
      const tInfoB = match.teamInfo?.[1] || {};
      const shortA = tInfoA.shortname || (match.teams[0] || '???').substring(0, 4).toUpperCase();
      const shortB = tInfoB.shortname || (match.teams[1] || '???').substring(0, 4).toUpperCase();
      const nameA  = tInfoA.name || match.teams[0] || 'Team A';
      const nameB  = tInfoB.name || match.teams[1] || 'Team B';

      const teamAId = await upsertTeam(nameA, shortA, tInfoA.img);
      const teamBId = await upsertTeam(nameB, shortB, tInfoB.img);

      const startTime = match.dateTimeGMT ? new Date(match.dateTimeGMT) : new Date(Date.now() + 3600000);
      const status = match.matchEnded ? 'COMPLETED' : match.matchStarted ? 'LIVE' : 'UPCOMING';

      const { id: dbMatchId, isNew } = await upsertMatch(teamAId, teamBId, startTime, status, match.id, match.series_id || match.name);
      console.log(`[SYNC] ${isNew ? '✅ NEW' : '🔄 UPD'} ${shortA} vs ${shortB} | ${status}`);

      // Step 2: Fetch squad (costs 1 API credit)
      await sleep(300);
      let squad;
      try {
        const sqRes = await apiGet('match_squad', { id: match.id });
        squad = sqRes.data || [];
        apicalls++;
      } catch {
        console.warn(`[SYNC]   └─ Failed to fetch squad`);
        continue;
      }

      // Map team names to their DB IDs
      const teamIdMap = {
        [nameA.toLowerCase()]: teamAId,
        [shortA.toLowerCase()]: teamAId,
        [nameB.toLowerCase()]: teamBId,
        [shortB.toLowerCase()]: teamBId,
      };

      for (const teamSquad of squad) {
        const tName = (teamSquad.teamName || '').toLowerCase();
        const tShort = (teamSquad.teamSName || '').toLowerCase();
        const tId = teamIdMap[tName] || teamIdMap[tShort] || teamAId;

        for (const player of teamSquad.players || []) {
          // Only store real player images; skip the generic icon
          const imgUrl = player.playerImg?.includes('icon512') ? null : player.playerImg;
          await upsertPlayer(player.id, player.name, tId, player.role, estimateCredit(player.role), imgUrl);
        }
        console.log(`[SYNC]   └─ ${teamSquad.players?.length || 0} players synced for ${teamSquad.teamName}`);
      }

      synced++;
    } catch (err) {
      console.warn(`[SYNC] Error processing match: ${err.message}`);
    }
  }

  console.log(`\n[SYNC] ✅ Done! Synced ${synced} matches using ${apicalls + 1} API calls.`);
  await client.end();
}

sync().catch(err => {
  console.error('[SYNC] Fatal:', err.message);
  process.exit(1);
});
