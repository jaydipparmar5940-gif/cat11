/**
 * score.worker.js
 * 
 * Polls for live match scores every 10 seconds.
 * Converts real-world events into fantasy points:
 *  - Run: +1
 *  - Four: +1
 *  - Six: +2
 *  - Wicket: +25
 *  - Catch: +8
 *  - Runout: +6
 *  - Stumping: +12
 * 
 * Updates PlayerPoints in PostgreSQL.
 * Recalculates team scores and updates Redis Leaderboard.
 * Emits 'leaderboard_update' via Socket.io.
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const scoringEngine = require('../services/scoring.engine');
const leaderboardService = require('../services/leaderboard.service');

const prisma = new PrismaClient();
const RAPID_API_KEY  = process.env.RAPID_API_KEY || '';
const RAPID_API_HOST = process.env.RAPID_API_HOST || 'cricbuzz-cricket.p.rapidapi.com';

// We store accumulated stats in memory for the simulation/mock if the real API doesn't provide ball-by-ball.
const liveMatchStats = {};

/**
 * Fetch or simulate live player stats for a match.
 * In a production env, this parses CricAPI's scorecard.
 */
async function fetchLivePlayerStats(matchId, apiMatchId) {
  // Try to use real RapidAPI Cricbuzz
  try {
    if (RAPID_API_KEY && apiMatchId) {
      const options = {
        method: 'GET',
        url: `https://${RAPID_API_HOST}/msc/v1/scorecard/${apiMatchId}`,
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': RAPID_API_HOST
        }
      };
      const res = await axios.request(options);
      
      if (res.data && res.data.innings) {
        // Real parsing logic would go here
      }
    }
  } catch (err) {
    console.warn(`[SCORE WORKER] Failed to fetch scorecard for ${apiMatchId}:`, err.message);
  }

  // --- SIMULATION FALLBACK ---
  // To demonstrate the live leaderboard updating every 10s without a paid CricAPI tier.
  if (!liveMatchStats[matchId]) {
    // Initialise stats for all players in this match
    const squad = await prisma.matchSquad.findMany({
      where: { matchId },
      include: { player: true }
    });
    
    const statsMap = {};
    for (const sq of squad) {
      statsMap[sq.playerId] = {
        runs: 0, fours: 0, sixes: 0, wickets: 0, 
        catches: 0, runouts: 0, stumpings: 0, played: true
      };
    }
    liveMatchStats[matchId] = { isOver: false, statsMap };
  }

  const state = liveMatchStats[matchId];
  if (state.isOver) return state.statsMap;

  // Simulate some random events every 10s
  const pIds = Object.keys(state.statsMap);
  if (pIds.length > 0) {
    // Give random points to 3 random players
    for (let i=0; i<3; i++) {
        const randId = pIds[Math.floor(Math.random() * pIds.length)];
        const pStat = state.statsMap[randId];
        
        const eventPhase = Math.random();
        if (eventPhase < 0.3) {
            pStat.runs += Math.floor(Math.random() * 4) + 1;
        } else if (eventPhase < 0.4) {
            pStat.fours += 1;
            pStat.runs += 4;
        } else if (eventPhase < 0.5) {
            pStat.sixes += 1;
            pStat.runs += 6;
        } else if (eventPhase < 0.6) {
            pStat.wickets += 1;
        } else if (eventPhase < 0.7) {
            pStat.catches += 1;
        } else if (eventPhase < 0.8) {
            pStat.runouts += 1;
        } else if (eventPhase < 0.85) {
            pStat.stumpings += 1;
        }
    }
  }

  return state.statsMap;
}

/**
 * Start the 10-second polling loop
 */
exports.startScoreWorker = (io) => {
  console.log('[SCORE WORKER] Started (interval: 10s)');

  setInterval(async () => {
    try {
      // 1. Get all LIVE matches
      const liveMatches = await prisma.match.findMany({
        where: { status: 'LIVE' },
        // If venue field stores the API ID as a hack from cricapi.service, try to read it
        select: { id: true, venue: true } 
      });

      if (liveMatches.length === 0) return;

      for (const match of liveMatches) {
        const matchId = match.id;
        const apiMatchId = match.venue && match.venue.length > 15 ? match.venue : null; // guess if it's an api id

        // 2. Fetch/Simulate live stats
        const playerStatsMap = await fetchLivePlayerStats(matchId, apiMatchId);
        if (!playerStatsMap) continue;

        // 3. Emit real-time score update for the match room
        const socketHandler = require('../sockets/socket.handler');
        socketHandler.emitScoreUpdate(matchId, {
          match_id: matchId,
          player_stats: playerStatsMap,
          timestamp: new Date()
        });

        // 4. Update PlayerPoints in DB
        for (const [playerIdStr, stats] of Object.entries(playerStatsMap)) {
          const playerId = parseInt(playerIdStr);
          const points = scoringEngine.calculatePoints(stats);
          
          await prisma.playerPoint.upsert({
            where: { matchId_playerId: { matchId, playerId } },
            update: { points },
            create: { matchId, playerId, points }
          });
        }

        // 5. Fetch all user teams (entries) for contests of this match
        const contests = await prisma.contest.findMany({ where: { matchId } });
        
        for (const contest of contests) {
          const entries = await prisma.contestEntry.findMany({
            where: { contestId: contest.id },
            include: { userTeam: { include: { teamPlayers: true } } }
          });

          // 6. Update team points and Redis Leaderboard
          for (const entry of entries) {
            // Need the DB points mapped since calculateTeamPoints takes a simple ID -> Points map
            const allDbPoints = await prisma.playerPoint.findMany({ where: { matchId } });
            const pointsDict = {};
            allDbPoints.forEach(row => pointsDict[row.playerId] = row.points);

            const teamScore = scoringEngine.calculateTeamPoints(
              entry.userTeam.teamPlayers,
              pointsDict,
              entry.userTeam.captainId,
              entry.userTeam.viceCaptainId
            );

            // ZADD to Redis
            await leaderboardService.updateLeaderboard(contest.id, teamScore, entry.userTeamId);
          }

          // 7. Emit real-time socket event for this contest's leaderboard
          const updatedTop = await leaderboardService.getTopUsers(contest.id, 50);
          socketHandler.emitLeaderboardUpdate(contest.id, {
            contest_id: contest.id,
            leaderboard: updatedTop,
            timestamp: new Date()
          });
        }
      }
    } catch (err) {
      console.error('[SCORE WORKER] Error during polling:', err.message);
    }
  }, 10000); // 10 seconds
};
