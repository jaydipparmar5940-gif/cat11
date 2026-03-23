const matchRepo = require('../repositories/match.repository');
const cricapiService = require('./cricapi.service');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1
});

async function safeRedisGet(key) {
  try { return await redis.get(key); } catch (e) { return null; }
}
async function safeRedisSet(key, ttl, value) {
  try { await redis.setex(key, ttl, value); } catch (e) {}
}

async function attachPlayers(matchRow) {
  try {
    const rows = await matchRepo.getMatchPlayersByMatchId(matchRow.match_id);
    return { ...matchRow, players: rows };
  } catch (_) {
    return { ...matchRow, players: [] };
  }
}

async function seedFromCricApi() {
  console.log('[MATCH SERVICE] DB empty — fetching from CricAPI...');
  try {
    await cricapiService.getUpcomingMatches();
  } catch (err) {
    console.warn('[MATCH SERVICE] CricAPI seed failed:', err.message);
  }
}

exports.getUpcomingMatches = async () => {
  const CACHE_KEY = 'cache:matches:upcoming';
  const cached = await safeRedisGet(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  let rows = await matchRepo.getUpcomingMatches();
  if (rows.length === 0) {
    await seedFromCricApi();
    rows = await matchRepo.getUpcomingMatches();
  }

  const enriched = await Promise.all(rows.map(attachPlayers));
  const responseData = { success: true, count: enriched.length, data: enriched };

  await safeRedisSet(CACHE_KEY, 60, JSON.stringify(responseData));
  return responseData;
};

exports.getMatchDetails = async (matchId) => {
  const CACHE_KEY = `cache:match:${matchId}`;
  const cached = await safeRedisGet(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  let rows = await matchRepo.getMatchDetails(matchId);
  if (rows.length === 0) {
    await seedFromCricApi();
    rows = await matchRepo.getMatchDetails(matchId);
  }

  if (rows.length === 0) {
    throw new Error('Match not found');
  }

  const enriched = await attachPlayers(rows[0]);
  const responseData = { success: true, data: enriched };

  await safeRedisSet(CACHE_KEY, 60, JSON.stringify(responseData));
  return responseData;
};

exports.getMatchSquad = async (matchId) => {
  const matchRows = await matchRepo.getMatchContext(matchId);
  if (matchRows.length === 0) {
    throw new Error('Match not found');
  }

  let squadRows = await matchRepo.getMatchSquad(matchId);

  // Last resort: call CricAPI
  if (squadRows.length === 0) {
    const apiResult = await cricapiService.getMatchPlayers(matchId);
    return {
      success: true,
      match_id: matchId,
      source: 'cricapi',
      players: apiResult.players || [],
    };
  }

  return {
    success: true,
    match_id: matchId,
    source: 'database',
    players: squadRows,
  };
};

exports.getAllMatches = async (status) => {
  return await matchRepo.getAllMatchesWithStatus(status);
};

exports.getMatchContests = async (matchId) => {
  return await matchRepo.getMatchContests(matchId);
};
