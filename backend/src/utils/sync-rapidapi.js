/**
 * sync-rapidapi.js
 * Fetches match and squad data from RapidAPI Cricbuzz
 * and upserts them into the local PostgreSQL DB.
 *
 * Usage: node src/utils/sync-rapidapi.js
 */

require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs');

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = process.env.RAPID_API_HOST;
const BASE_URL = `https://${RAPID_API_HOST}`;

if (!RAPID_API_KEY) {
  console.error('[SYNC] No RAPID_API_KEY in .env. Aborting.');
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

async function apiGet(endpoint) {
  const options = {
    method: 'GET',
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'x-rapidapi-key': RAPID_API_KEY,
      'x-rapidapi-host': RAPID_API_HOST
    }
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(`[SYNC] API Error on ${endpoint}:`, error.message);
    throw error;
  }
}

// ── DB upsert helpers (Copied from sync-cricapi.js for consistency) ────────────

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
  const logo = logoUrl || `https://documents.iplt20.com/ipl/${shortName}/logos/Logooutline/${shortName}outline.png`;

  const existing = await client.query(
    `SELECT id FROM "Team" WHERE "shortName" = $1`, [shortName]
  );
  if (existing.rows.length) {
    if (logoUrl) {
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

  // Auto-create contests
  await client.query(`
    INSERT INTO "Contest" ("matchId","entryFee","totalSpots","prizePool",status) VALUES
      ($1, 49,  1000000, 50000000, 'OPEN'),
      ($1, 19,  5000,    20000,    'OPEN'),
      ($1, 0,   10000,   0,        'OPEN')
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
  try {
    await client.connect();
    console.log('[SYNC] Connected to DB');

    await addColumnsIfNeeded();

    // Step 1: Fetch upcoming matches
    console.log('[SYNC] Fetching upcoming matches from RapidAPI...');
    const matchesData = await apiGet('/matches/v1/upcoming');
    // The structure might vary. Typically it's matchesData.typeMatches
    const typeMatches = matchesData.typeMatches || [];
    let allMatches = [];
    
    typeMatches.forEach(type => {
      if (type.seriesMatches) {
        type.seriesMatches.forEach(sMatch => {
          const wrapper = sMatch.seriesAdWrapper;
          if (wrapper && wrapper.matches) {
            const seriesName = wrapper.seriesName;
            wrapper.matches.forEach(m => {
              allMatches.push({ ...m, seriesName });
            });
          }
        });
      }
    });

    console.log(`[SYNC] Found ${allMatches.length} upcoming matches.`);

    for (const match of allMatches.slice(0, 10)) {
        const matchId = match.matchInfo.matchId;
        const teamA = match.matchInfo.team1;
        const teamB = match.matchInfo.team2;
        const startTime = new Date(parseInt(match.matchInfo.startDate));
        const status = 'UPCOMING';
        const seriesName = match.seriesName;

        const teamAId = await upsertTeam(teamA.teamName, teamA.teamSName, null);
        const teamBId = await upsertTeam(teamB.teamName, teamB.teamSName, null);

        const { id: dbMatchId, isNew } = await upsertMatch(teamAId, teamBId, startTime, status, String(matchId), seriesName);
        console.log(`[SYNC] ${isNew ? '✅ NEW' : '🔄 UPD'} ${teamA.teamSName} vs ${teamB.teamSName} | ${status}`);

        // Step 2: Fetch Squad
        try {
            console.log(`[SYNC]   └─ Fetching squad for match ${matchId}...`);
            await sleep(500);
            const squadData = await apiGet(`/msc/v1/squads/${matchId}`);
            
            const teams = squadData.squads || [];
            for (const team of teams) {
                const tInfo = team.teamId === teamA.teamId ? { id: teamAId, name: teamA.teamName } : { id: teamBId, name: teamB.teamName };
                
                for (const playerId of team.playerIds || []) {
                    // We might need another call to get player details if playerIds is just IDs
                    // But usually, the squad endpoint might have more info or we can skip for now
                    // Let's assume we need to fetch player info if not present
                    await upsertPlayer(String(playerId), `Player ${playerId}`, tInfo.id, 'BAT', 8.5, null);
                }
            }
        } catch (sqErr) {
            console.warn(`[SYNC]   └─ Failed to fetch squad: ${sqErr.message}`);
        }
    }

  } catch (err) {
    console.error('[SYNC] Fatal:', err.message);
  } finally {
    await client.end();
  }
}

sync();
