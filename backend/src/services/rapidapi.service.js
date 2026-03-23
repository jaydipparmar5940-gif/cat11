/**
 * rapidapi.service.js
 * Unified wrapper for RapidAPI Cricbuzz endpoints.
 * Uses raw pg.Pool (NOT Prisma) for DB upserts to avoid PgBouncer hangs on Render.
 *
 * ENV required:
 *   RAPID_API_KEY  – RapidAPI key
 *   RAPID_API_HOST – cricbuzz-cricket.p.rapidapi.com
 *   DATABASE_URL   – PostgreSQL connection string
 */

'use strict';

const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const RAPID_API_KEY  = process.env.RAPID_API_KEY  || '';
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';

// ── Redis (optional, graceful degradation) ──────────────────────────────────
let redis = null;
if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  } catch (_) {}
}

const CACHE_TTL = 60;

async function fromCache(key) {
  if (!redis) return null;
  try {
    const v = await redis.get(key);
    return v ? JSON.parse(v) : null;
  } catch (_) { return null; }
}

async function toCache(key, data) {
  if (!redis) return;
  try { await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL); } catch (_) {}
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function get(endpoint) {
  const res = await axios.get(`https://${RAPID_API_HOST}${endpoint}`, {
    headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST }
  });
  return res.data;
}

// ── Role normaliser ──────────────────────────────────────────────────────────
function normaliseRole(r = '') {
  const s = r.toLowerCase();
  if (s.includes('wicket') || s.includes('wk') || s.includes('keeper')) return 'WK';
  if (s.includes('all'))  return 'AR';
  if (s.includes('bowl')) return 'BOWL';
  return 'BAT';
}

// ── DB helpers (raw pg, simple queries – no prepared statements) ─────────────

async function upsertTeam(name, shortName, logo) {
  try {
    const existing = await pool.query(
      `SELECT id FROM "Team" WHERE "shortName" = $1`,
      [shortName]
    );
    if (existing.rows.length) {
      if (logo) {
        await pool.query(`UPDATE "Team" SET logo=$1 WHERE id=$2`, [logo, existing.rows[0].id]);
      }
      return existing.rows[0].id;
    }
    const ins = await pool.query(
      `INSERT INTO "Team" (name, "shortName", logo) VALUES ($1,$2,$3) RETURNING id`,
      [name, shortName, logo || null]
    );
    return ins.rows[0].id;
  } catch (err) {
    console.warn('[RAPIDAPI] upsertTeam failed:', err.message);
    return null;
  }
}

async function upsertMatch(teamAId, teamBId, matchTime, status, venue, apiId) {
  try {
    const existing = await pool.query(
      `SELECT id FROM "Match" WHERE "teamAId"=$1 AND "teamBId"=$2 AND "matchStartTime"=$3`,
      [teamAId, teamBId, matchTime]
    );
    if (existing.rows.length) {
      await pool.query(
        `UPDATE "Match" SET status=$1, venue=$2 WHERE id=$3`,
        [status, venue, existing.rows[0].id]
      );
      return existing.rows[0].id;
    }
    const ins = await pool.query(
      `INSERT INTO "Match" ("teamAId","teamBId","matchStartTime",status,venue,"apiId") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [teamAId, teamBId, matchTime, status, venue, apiId]
    );
    return ins.rows[0].id;
  } catch (err) {
    console.warn('[RAPIDAPI] upsertMatch failed:', err.message);
    return null;
  }
}

async function upsertPlayer(name, teamId, role, imageUrl) {
  try {
    const existing = await pool.query(
      `SELECT id FROM "Player" WHERE name=$1 AND "teamId"=$2`,
      [name, teamId]
    );
    if (existing.rows.length) {
      await pool.query(
        `UPDATE "Player" SET role=$1, "imageUrl"=$2 WHERE id=$3`,
        [role, imageUrl, existing.rows[0].id]
      );
      return existing.rows[0].id;
    }
    const ins = await pool.query(
      `INSERT INTO "Player" (name,"teamId",role,"imageUrl") VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, teamId || 1, role, imageUrl]
    );
    return ins.rows[0].id;
  } catch (err) {
    console.warn('[RAPIDAPI] upsertPlayer failed:', err.message);
    return null;
  }
}

async function upsertMatchSquad(matchId, playerId) {
  try {
    const existing = await pool.query(
      `SELECT id FROM "MatchSquad" WHERE "matchId"=$1 AND "playerId"=$2`,
      [matchId, playerId]
    );
    if (!existing.rows.length) {
      await pool.query(
        `INSERT INTO "MatchSquad" ("matchId","playerId") VALUES ($1,$2)`,
        [matchId, playerId]
      );
    }
  } catch (err) {
    console.warn('[RAPIDAPI] upsertMatchSquad failed:', err.message);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

exports.getUpcomingMatches = async () => {
  const CACHE_KEY = 'rapidapi:currentMatches';

  const cached = await fromCache(CACHE_KEY);
  if (cached) {
    console.log('[RAPIDAPI] getUpcomingMatches → cache hit');
    return cached;
  }

  if (!RAPID_API_KEY) {
    console.warn('[RAPIDAPI] No RAPID_API_KEY. Returning empty.');
    return [];
  }

  let allMatches = [];
  try {
    const data = await get('/matches/v1/upcoming');
    const typeMatches = data.typeMatches || [];
    typeMatches.forEach(type => {
      (type.seriesMatches || []).forEach(sMatch => {
        const wrapper = sMatch.seriesAdWrapper;
        if (wrapper && wrapper.matches) {
          wrapper.matches.forEach(m => allMatches.push({ ...m, seriesName: wrapper.seriesName }));
        }
      });
    });
  } catch (err) {
    console.error('[RAPIDAPI] fetch failed:', err.message);
    return [];
  }

  const structured = [];
  for (const match of allMatches) {
    const info = match.matchInfo;
    if (!info) continue;

    const teamA     = info.team1.teamName;
    const teamB     = info.team2.teamName;
    const matchTime = new Date(parseInt(info.startDate));
    const venue     = info.venueInfo?.ground || 'Unknown Venue';
    const apiId     = String(info.matchId);
    let   status    = 'UPCOMING';
    if (info.state === 'In Progress') status = 'LIVE';
    if (info.state === 'Complete')    status = 'COMPLETED';

    const shortNameA = match.teamInfo?.[0]?.shortname || teamA.slice(0, 10).toUpperCase();
    const shortNameB = match.teamInfo?.[1]?.shortname || teamB.slice(0, 10).toUpperCase();
    const logoA      = match.teamInfo?.[0]?.img || null;
    const logoB      = match.teamInfo?.[1]?.img || null;

    const teamAId = await upsertTeam(teamA, shortNameA, logoA);
    const teamBId = await upsertTeam(teamB, shortNameB, logoB);

    if (!teamAId || !teamBId) {
      structured.push({ match_id: apiId, api_id: apiId, team_a: teamA, team_b: teamB, match_time: matchTime, status, venue, players: [] });
      continue;
    }

    const dbMatchId = await upsertMatch(teamAId, teamBId, matchTime, status, venue, apiId);

    structured.push({
      match_id:   dbMatchId ? String(dbMatchId) : apiId,
      api_id:     apiId,
      team_a:     teamA,
      team_b:     teamB,
      match_time: matchTime,
      status,
      venue,
      players:    [],
    });
  }

  await toCache(CACHE_KEY, structured);
  console.log(`[RAPIDAPI] getUpcomingMatches → ${structured.length} matches synced`);
  return structured;
};


exports.getMatchSquad = async (matchId, apiMatchId = null) => {
  let lookupId = apiMatchId;

  if (!lookupId) {
    try {
      const res = await pool.query(`SELECT "apiId" FROM "Match" WHERE id=$1`, [Number(matchId)]);
      lookupId = res.rows[0]?.apiId || String(matchId);
    } catch (_) { lookupId = String(matchId); }
  }

  const CACHE_KEY = `rapidapi:matchSquad:${lookupId}`;
  const cached = await fromCache(CACHE_KEY);
  if (cached) return cached;

  if (!RAPID_API_KEY) return { match_id: matchId, players: [] };

  let rawPlayers = [];
  try {
    const data = await get(`/msc/v1/squads/${lookupId}`);
    (data?.squads || []).forEach(teamSquad => {
      (teamSquad.players || []).forEach(p => rawPlayers.push({ ...p, teamName: teamSquad.teamName || '' }));
    });
  } catch (err) {
    console.warn(`[RAPIDAPI] squads fetch failed for ${lookupId}:`, err.message);
  }

  const playersList = [];
  for (const raw of rawPlayers) {
    const name     = raw.name || 'Unknown';
    const teamName = raw.teamName || '';
    const role     = normaliseRole(raw.role || '');
    const imageUrl = raw.playerImg?.startsWith('http') ? raw.playerImg
      : `https://img.cricapi.com/player/${raw.id || ''}.jpg`;

    const shortName = raw.teamShortName || teamName.slice(0, 10).toUpperCase();
    const teamId    = await upsertTeam(teamName, shortName, null);
    const playerId  = teamId ? await upsertPlayer(name, teamId, role, imageUrl) : null;

    if (playerId && typeof matchId === 'number' && !isNaN(matchId)) {
      await upsertMatchSquad(Number(matchId), playerId);
    }

    playersList.push({ id: playerId || raw.id || null, name, role, team: teamName, image: imageUrl });
  }

  const result = { match_id: String(matchId), players: playersList, fetched_at: new Date().toISOString() };
  await toCache(CACHE_KEY, result);
  console.log(`[RAPIDAPI] getMatchSquad(${lookupId}) → ${playersList.length} players`);
  return result;
};


exports.getMatchesWithPlayers = async () => {
  const matches = await exports.getUpcomingMatches();
  const hydrated = [];
  for (const match of matches) {
    const { players } = await exports.getMatchSquad(match.match_id, match.api_id);
    hydrated.push({ ...match, players });
  }
  return hydrated;
};

// ── Read-only RapidAPI endpoints ─────────────────────────────────────────────

exports.getSquad = async (seriesId) => {
  const data = await get(`/series/v1/${seriesId}/squads`);
  return {
    seriesId,
    seriesName: data.seriesName,
    squads: (data.squads || []).map(s => ({
      teamId:   s.teamId,
      teamName: s.teamName,
      players:  (s.squaddedPlayers || s.players || []).map(p => ({
        id:   p.id,
        name: p.name,
        role: p.role || 'BAT',
        img:  p.faceImageId ? `https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c${p.faceImageId}/i.jpg` : null
      }))
    }))
  };
};

exports.getScorecard = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);
  return { matchId, status: data.status, isMatchComplete: data.ismatchcomplete, scorecard: data.scorecard };
};

exports.getCommentary = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/comm`);
  return {
    matchId,
    commentary: (data.comwrapper || []).map(w => ({
      overNum: w.overNum,
      events: (w.commentsData || []).map(c => ({ event: c.event, overText: c.overText, html: c.commText }))
    }))
  };
};

exports.getLiveScore = async (matchId) => {
  const data     = await get(`/mcenter/v1/${matchId}/scard`);
  const scorecard = data.scorecard || [];
  const current   = scorecard[scorecard.length - 1] || {};
  return {
    matchId,
    status: data.status,
    isMatchComplete: data.ismatchcomplete,
    currentInnings: {
      battingTeam: current.batTeamDetails?.batTeamName,
      score:       current.scoreDetails?.runs,
      wickets:     current.scoreDetails?.wickets,
      overs:       current.scoreDetails?.overs,
      runRate:     current.scoreDetails?.runRate,
    },
    allInnings: scorecard.map(inn => ({
      batTeam: inn.batTeamDetails?.batTeamName,
      score:   inn.scoreDetails?.runs,
      wickets: inn.scoreDetails?.wickets,
      overs:   inn.scoreDetails?.overs
    }))
  };
};

exports.getLineup = async (matchId) => {
  const data  = await get(`/mcenter/v1/${matchId}/scard`);
  return {
    matchId,
    lineup: (data.scorecard || []).map(inn => ({
      teamName: inn.batTeamDetails?.batTeamName,
      batters:  Object.values(inn.batTeamDetails?.batsmenData || {}).map(b => ({ id: b.batId, name: b.batName, runs: b.runs, balls: b.balls })),
      bowlers:  Object.values(inn.bowlTeamDetails?.bowlersData || {}).map(b => ({ id: b.bowlId, name: b.bowlName, wickets: b.wickets, overs: b.overs }))
    }))
  };
};

exports.getFinalScore = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);
  return {
    matchId,
    result:   data.status,
    complete: data.ismatchcomplete,
    innings:  (data.scorecard || []).map(inn => ({
      team:    inn.batTeamDetails?.batTeamName,
      runs:    inn.scoreDetails?.runs,
      wickets: inn.scoreDetails?.wickets,
      overs:   inn.scoreDetails?.overs,
    }))
  };
};
