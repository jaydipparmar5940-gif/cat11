/**
 * cricapi.service.js
 * Fetches upcoming cricket matches and player data from CricAPI v1.
 * Uses Redis for 30s caching and Prisma for persistent storage.
 *
 * ENV required:
 *   CRIC_API_KEY  – API key from https://cricapi.com
 *   REDIS_URL     – Redis connection string
 *   DATABASE_URL  – PostgreSQL connection string (read by Prisma)
 */

'use strict';

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1
});

// ── Config ──────────────────────────────────────────────────────────
const RAPID_API_KEY  = process.env.RAPID_API_KEY || '';
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';
const CACHE_TTL    = 30; // seconds

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Read from Redis cache.
 * @param {string} key
 * @returns {any|null}
 */
async function fromCache(key) {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.warn('[CRICAPI] Redis read error:', e.message);
    return null;
  }
}

/**
 * Write to Redis cache with TTL.
 * @param {string} key
 * @param {any} data
 */
async function toCache(key, data) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
  } catch (e) {
    console.warn('[CRICAPI] Redis write error:', e.message);
  }
}

/**
 * Normalise a CricAPI role string to our internal enum.
 * @param {string} apiRole
 * @returns {'WK'|'BAT'|'AR'|'BOWL'}
 */
function normaliseRole(apiRole = '') {
  const r = apiRole.toLowerCase();
  if (r.includes('wicket') || r.includes('wk') || r.includes('keeper')) return 'WK';
  if (r.includes('all'))                                                  return 'AR';
  if (r.includes('bowl'))                                                 return 'BOWL';
  return 'BAT';
}

/**
 * Build a player image URL.
 * Falls back to the CricAPI CDN if the API doesn't supply one.
 * @param {Object} player  – raw player object from CricAPI
 * @returns {string}
 */
function resolveImage(player) {
  if (player.playerImg && player.playerImg.startsWith('http')) {
    return player.playerImg;
  }
  const pid = player.id || player.pid || '';
  return `https://img.cricapi.com/player/${pid}.jpg`;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Fetch upcoming & current cricket matches from CricAPI.
 * Results are cached in Redis for CACHE_TTL seconds.
 * Matches are upserted into the `Match` table via Prisma.
 *
 * @returns {Promise<Array>} Array of structured match objects.
 */
exports.getUpcomingMatches = async () => {
  const CACHE_KEY = 'cricapi:currentMatches';

  // 1. Try cache
  const cached = await fromCache(CACHE_KEY);
  if (cached) {
    console.log('[CRICAPI] getUpcomingMatches → cache hit');
    return cached;
  }

  if (!RAPID_API_KEY) {
    console.warn('[CRICAPI] No RapidAPI key set (RAPID_API_KEY). Returning empty list.');
    return [];
  }

  // 2. Call RapidAPI Cricbuzz
  let allMatches = [];
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPID_API_HOST}/matches/v1/upcoming`,
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST
      }
    };
    const { data } = await axios.request(options);
    
    // Parse RapidAPI Cricbuzz structure
    const typeMatches = data.typeMatches || [];
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
  } catch (err) {
    console.error('[CRICAPI] matches fetch failed:', err.message);
    return [];
  }

  // 3. Filter and Structuring
  const structured = [];
  for (const match of allMatches) {
    const info = match.matchInfo;
    if (!info) continue;

    const teamA = info.team1.teamName;
    const teamB = info.team2.teamName;
    const matchTime = new Date(parseInt(info.startDate));
    const venue = info.venueInfo?.ground || 'Unknown Venue';
    const apiMatchId = String(info.matchId);
    const seriesName = match.seriesName || info.seriesName;

    let status = 'UPCOMING';
    if (info.state === 'In Progress') status = 'LIVE';
    if (info.state === 'Complete') status = 'COMPLETED';

    // Upsert a "virtual" team A & team B (using shortName as unique key if real teams don't exist)
    let dbTeamA, dbTeamB;
    try {
      const shortNameA = match.teamInfo?.[0]?.shortname || teamA.slice(0, 10).toUpperCase();
      const logoA = match.teamInfo?.[0]?.img || null;
      dbTeamA = await prisma.team.findFirst({ where: { shortName: shortNameA } });
      if (dbTeamA && logoA) {
        dbTeamA = await prisma.team.update({ where: { id: dbTeamA.id }, data: { logo: logoA } });
      } else if (!dbTeamA) {
        dbTeamA = await prisma.team.create({
          data: { name: teamA, shortName: shortNameA, logo: logoA }
        });
      }

      const shortNameB = match.teamInfo?.[1]?.shortname || teamB.slice(0, 10).toUpperCase();
      const logoB = match.teamInfo?.[1]?.img || null;
      dbTeamB = await prisma.team.findFirst({ where: { shortName: shortNameB } });
      if (dbTeamB && logoB) {
        dbTeamB = await prisma.team.update({ where: { id: dbTeamB.id }, data: { logo: logoB } });
      } else if (!dbTeamB) {
        dbTeamB = await prisma.team.create({
          data: { name: teamB, shortName: shortNameB, logo: logoB }
        });
      }

    } catch (dbErr) {
      console.warn(`[CRICAPI] Team upsert failed for "${teamA}" vs "${teamB}":`, dbErr.message);
      structured.push({ match_id: apiMatchId, team_a: teamA, team_b: teamB, match_time: matchTime, players: [] });
      continue;
    }

    // Upsert the Match row (use venue+teams+time as natural key via apiMatchId stored as id would collide – store in venue field as a workaround)
    let dbMatch;
    try {
      // We store the CricAPI string id in the `venue` field prefixed so we can look it up
      // A cleaner solution would be an apiId field; for now we check by teamAId/teamBId/matchStartTime
      const existingMatch = await prisma.match.findFirst({
        where: { teamAId: dbTeamA.id, teamBId: dbTeamB.id, matchStartTime: matchTime },
      });

      if (existingMatch) {
        dbMatch = await prisma.match.update({
          where: { id: existingMatch.id },
          data:  { status, venue },
        });
      } else {
        dbMatch = await prisma.match.create({
          data: {
            teamAId:       dbTeamA.id,
            teamBId:       dbTeamB.id,
            matchStartTime: matchTime,
            status,
            venue,
            apiId:         apiMatchId,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[CRICAPI] Match upsert failed for', teamA, 'vs', teamB, ':', dbErr.message);
      structured.push({ match_id: apiMatchId, team_a: teamA, team_b: teamB, match_time: matchTime, players: [] });
      continue;
    }

    structured.push({
      match_id:   String(dbMatch.id),
      api_id:     apiMatchId,
      team_a:     teamA,
      team_b:     teamB,
      match_time: matchTime,
      status,
      venue,
      players:    [], // populated by getMatchPlayers()
    });
  }

  // 5. Cache & return
  await toCache(CACHE_KEY, structured);
  console.log(`[CRICAPI] getUpcomingMatches → fetched ${structured.length} matches from API`);
  return structured;
};


/**
 * Fetch players for a specific match from CricAPI.
 * Results are cached in Redis for CACHE_TTL seconds.
 * Players and MatchSquad entries are upserted into the DB.
 *
 * @param {string|number} matchId  – Internal DB match ID **or** CricAPI match ID.
 * @param {string}        apiMatchId – CricAPI match UUID (optional; falls back to matchId).
 * @returns {Promise<Object>} Structured match+players object.
 */
exports.getMatchPlayers = async (matchId, apiMatchId = null) => {
  let lookupId = apiMatchId;
  
  // 0. If no apiMatchId, try to find it in the DB Match record
  if (!lookupId && typeof matchId === 'number') {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    lookupId = match?.apiId || String(matchId);
  } else if (!lookupId) {
    lookupId = String(matchId);
  }

  const CACHE_KEY = `cricapi:matchPlayers:${lookupId}`;

  // 1. Try cache
  const cached = await fromCache(CACHE_KEY);
  if (cached) {
    console.log(`[CRICAPI] getMatchPlayers(${lookupId}) → cache hit`);
    return cached;
  }

  if (!RAPID_API_KEY) {
    console.warn('[CRICAPI] No RapidAPI key set (RAPID_API_KEY). Cannot fetch players.');
    return { match_id: matchId, players: [] };
  }

  // 2. Call RapidAPI players endpoint for this match
  let rawPlayers = [];
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPID_API_HOST}/msc/v1/squads/${lookupId}`,
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST
      }
    };
    const { data } = await axios.request(options);
    
    // Squad endpoint returns teams with playerIds
    const squads = data?.squads || [];
    for (const teamSquad of squads) {
      const teamName = teamSquad.teamName || '';
      // Note: We might need a separate call to get player details if only IDs are provided
      // But for this integration, we'll map what we have.
      for (const p of teamSquad.players || []) {
        rawPlayers.push({ ...p, teamName });
      }
    }
  } catch (err) {
    console.warn(`[CRICAPI] squads fetch failed for ${lookupId}:`, err.message);
    rawPlayers = [];
  }

  // 3. Upsert players & MatchSquad rows, build structured list
  const playersList = [];

  for (const raw of rawPlayers) {
    const name     = raw.name || 'Unknown';
    const teamName = raw.teamName || '';
    const role     = normaliseRole(raw.role || '');
    const imageUrl = resolveImage(raw);

    // Find or create the team in DB
    let dbTeam = null;
    try {
      const shortName = (raw.teamShortName || teamName.slice(0, 10).toUpperCase());
      dbTeam = await prisma.team.upsert({
        where:  { shortName },
        update: { name: teamName },
        create: { name: teamName, shortName },
      });
    } catch (_) { /* non-fatal */ }

    // Upsert player
    let dbPlayer = null;
    try {
      // Try to find by name + teamId first to avoid duplicates
      const existing = dbTeam
        ? await prisma.player.findFirst({ where: { name, teamId: dbTeam.id } })
        : null;

      if (existing) {
        dbPlayer = await prisma.player.update({
          where: { id: existing.id },
          data:  { role, imageUrl },
        });
      } else {
        dbPlayer = await prisma.player.create({
          data: {
            name,
            teamId:   dbTeam?.id || 1,
            role,
            imageUrl,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[CRICAPI] Player upsert failed:', dbErr.message);
    }

    // Upsert MatchSquad entry if we have a DB match
    if (dbPlayer && typeof matchId === 'number' && !isNaN(matchId)) {
      try {
        const existingSquad = await prisma.matchSquad.findFirst({
          where: { matchId: Number(matchId), playerId: dbPlayer.id },
        });
        if (!existingSquad) {
          await prisma.matchSquad.create({
            data: { matchId: Number(matchId), playerId: dbPlayer.id },
          });
        }
      } catch (_) { /* non-fatal */ }
    }

    playersList.push({
      id:    dbPlayer?.id   || raw.id    || null,
      name,
      role,
      team:  teamName,
      image: imageUrl,
    });
  }

  const result = {
    match_id:   String(matchId),
    players:    playersList,
    fetched_at: new Date().toISOString(),
  };

  await toCache(CACHE_KEY, result);
  console.log(`[CRICAPI] getMatchPlayers(${lookupId}) → ${playersList.length} players fetched`);
  return result;
};


/**
 * Combined helper: fetch upcoming matches AND hydrate players for each.
 * Returns structured JSON ready for the API response.
 * @returns {Promise<Array>}
 */
exports.getMatchesWithPlayers = async () => {
  const matches = await exports.getUpcomingMatches();
  const hydrated = [];

  for (const match of matches) {
    const { players } = await exports.getMatchPlayers(match.match_id, match.api_id);
    hydrated.push({ ...match, players });
  }

  return hydrated;
};
