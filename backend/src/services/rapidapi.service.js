/**
 * rapidapi.service.js
 * Unified wrapper for RapidAPI Cricbuzz endpoints:
 *   - Upcoming Matches & Squads (with PostgreSQL persistence & Redis caching)
 *   - Scorecard / Live Score / Final Score / Commentary
 *
 * ENV required:
 *   RAPID_API_KEY  – RapidAPI key
 *   RAPID_API_HOST – cricbuzz-cricket.p.rapidapi.com
 *   REDIS_URL      – Redis connection string
 *   DATABASE_URL   – PostgreSQL connection string
 */

'use strict';

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1
});

const RAPID_API_KEY  = process.env.RAPID_API_KEY  || '';
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';
const CACHE_TTL      = 30; // seconds

const headers = () => ({
  'x-rapidapi-key':  RAPID_API_KEY,
  'x-rapidapi-host': RAPID_API_HOST
});

async function get(endpoint) {
  const res = await axios.get(`https://${RAPID_API_HOST}${endpoint}`, { headers: headers() });
  return res.data;
}

// ── Caching Helpers ─────────────────────────────────────────────────────────

async function fromCache(key) {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.warn('[RAPIDAPI] Redis read error:', e.message);
    return null;
  }
}

async function toCache(key, data) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
  } catch (e) {
    console.warn('[RAPIDAPI] Redis write error:', e.message);
  }
}

function normaliseRole(apiRole = '') {
  const r = apiRole.toLowerCase();
  if (r.includes('wicket') || r.includes('wk') || r.includes('keeper')) return 'WK';
  if (r.includes('all'))                                                  return 'AR';
  if (r.includes('bowl'))                                                 return 'BOWL';
  return 'BAT';
}

function resolveImage(player) {
  if (player.playerImg && player.playerImg.startsWith('http')) {
    return player.playerImg;
  }
  const pid = player.id || player.pid || '';
  return `https://img.cricapi.com/player/${pid}.jpg`;
}

// ── Database Synchronized Endpoints ─────────────────────────────────────────

exports.getUpcomingMatches = async () => {
  const CACHE_KEY = 'rapidapi:currentMatches';

  const cached = await fromCache(CACHE_KEY);
  if (cached) {
    console.log('[RAPIDAPI] getUpcomingMatches → cache hit');
    return cached;
  }

  if (!RAPID_API_KEY) {
    console.warn('[RAPIDAPI] No RapidAPI key set. Returning empty list.');
    return [];
  }

  let allMatches = [];
  try {
    const data = await get('/matches/v1/upcoming');
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
    console.error('[RAPIDAPI] matches fetch failed:', err.message);
    return [];
  }

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
      console.warn(`[RAPIDAPI] Team upsert failed for "${teamA}" vs "${teamB}":`, dbErr.message);
      structured.push({ match_id: apiMatchId, team_a: teamA, team_b: teamB, match_time: matchTime, players: [] });
      continue;
    }

    let dbMatch;
    try {
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
      console.warn('[RAPIDAPI] Match upsert failed for', teamA, 'vs', teamB, ':', dbErr.message);
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
      players:    [],
    });
  }

  await toCache(CACHE_KEY, structured);
  console.log(`[RAPIDAPI] getUpcomingMatches → fetched ${structured.length} matches`);
  return structured;
};


exports.getMatchSquad = async (matchId, apiMatchId = null) => {
  let lookupId = apiMatchId;
  
  if (!lookupId && typeof matchId === 'number') {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    lookupId = match?.apiId || String(matchId);
  } else if (!lookupId) {
    lookupId = String(matchId);
  }

  const CACHE_KEY = `rapidapi:matchSquad:${lookupId}`;

  const cached = await fromCache(CACHE_KEY);
  if (cached) {
    console.log(`[RAPIDAPI] getMatchSquad(${lookupId}) → cache hit`);
    return cached;
  }

  if (!RAPID_API_KEY) {
    console.warn('[RAPIDAPI] No RapidAPI key set. Cannot fetch squad.');
    return { match_id: matchId, players: [] };
  }

  let rawPlayers = [];
  try {
    const data = await get(`/msc/v1/squads/${lookupId}`);
    const squads = data?.squads || [];
    for (const teamSquad of squads) {
      const teamName = teamSquad.teamName || '';
      for (const p of teamSquad.players || []) {
        rawPlayers.push({ ...p, teamName });
      }
    }
  } catch (err) {
    console.warn(`[RAPIDAPI] squads fetch failed for ${lookupId}:`, err.message);
    rawPlayers = [];
  }

  const playersList = [];

  for (const raw of rawPlayers) {
    const name     = raw.name || 'Unknown';
    const teamName = raw.teamName || '';
    const role     = normaliseRole(raw.role || '');
    const imageUrl = resolveImage(raw);

    let dbTeam = null;
    try {
      const shortName = (raw.teamShortName || teamName.slice(0, 10).toUpperCase());
      dbTeam = await prisma.team.upsert({
        where:  { shortName },
        update: { name: teamName },
        create: { name: teamName, shortName },
      });
    } catch (_) { }

    let dbPlayer = null;
    try {
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
      console.warn('[RAPIDAPI] Player upsert failed:', dbErr.message);
    }

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
      } catch (_) { }
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
  console.log(`[RAPIDAPI] getMatchSquad(${lookupId}) → ${playersList.length} players mapped`);
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

// ── Generic RapidAPI Endpoints (Read-Only) ──────────────────────────────────

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
  return {
    matchId,
    status: data.status,
    isMatchComplete: data.ismatchcomplete,
    scorecard: data.scorecard
  };
};

exports.getCommentary = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/comm`);
  return {
    matchId,
    matchHeaders:    data.matchheaders,
    innings:         data.inningsid,
    commentary:      (data.comwrapper || []).map(w => ({
      overNum: w.overNum,
      events:  (w.commentsData || []).map(c => ({
        event:     c.event,
        overText:  c.overText,
        batTeamId: c.batTeamId,
        html:      c.commText
      }))
    }))
  };
};

exports.getLiveScore = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);

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
      batTeam:  inn.batTeamDetails?.batTeamName,
      score:    inn.scoreDetails?.runs,
      wickets:  inn.scoreDetails?.wickets,
      overs:    inn.scoreDetails?.overs
    }))
  };
};

exports.getLineup = async (matchId) => {
  const data  = await get(`/mcenter/v1/${matchId}/scard`);
  const cards = data.scorecard || [];

  const lineup = cards.map(inn => ({
    teamName: inn.batTeamDetails?.batTeamName,
    batters:  Object.values(inn.batTeamDetails?.batsmenData || {}).map(b => ({
      id:    b.batId,
      name:  b.batName,
      runs:  b.runs,
      balls: b.balls
    })),
    bowlers:  Object.values(inn.bowlTeamDetails?.bowlersData || {}).map(b => ({
      id:      b.bowlId,
      name:    b.bowlName,
      wickets: b.wickets,
      overs:   b.overs,
      runs:    b.runs
    }))
  }));

  return { matchId, lineup };
};

exports.getFinalScore = async (matchId) => {
  const data = await get(`/mcenter/v1/${matchId}/scard`);
  const sc   = data.scorecard || [];

  return {
    matchId,
    result:   data.status,
    complete: data.ismatchcomplete,
    innings:  sc.map(inn => ({
      team:     inn.batTeamDetails?.batTeamName,
      runs:     inn.scoreDetails?.runs,
      wickets:  inn.scoreDetails?.wickets,
      overs:    inn.scoreDetails?.overs,
      runRate:  inn.scoreDetails?.runRate,
    }))
  };
};
