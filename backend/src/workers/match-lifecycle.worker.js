/**
 * match-lifecycle.worker.js
 * Runs as a periodic cron to manage match status transitions:
 *   UPCOMING → LIVE (at matchStartTime)
 *   LIVE → COMPLETED (after ~4 hours - T20 duration)
 * Also closes contests for LIVE/COMPLETED matches.
 */

const { Pool } = require('pg');
const { payoutQueue } = require('./payout.worker');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const MATCH_DURATION_HOURS = 4; // Typical T20 match duration

async function runLifecycleCron() {
  const client = await pool.connect();
  try {
    // 1. Flip UPCOMING → LIVE when matchStartTime has passed
    const goLiveResult = await client.query(`
      UPDATE "Match"
      SET status = 'LIVE'
      WHERE status = 'UPCOMING'
        AND "matchStartTime" <= NOW()
      RETURNING id, status
    `);
    if (goLiveResult.rowCount > 0) {
      console.log(`[LIFECYCLE] ${goLiveResult.rowCount} match(es) → LIVE`);
    }

    // 2. Flip LIVE → COMPLETED after 4 hours
    const completeResult = await client.query(`
      UPDATE "Match"
      SET status = 'COMPLETED'
      WHERE status = 'LIVE'
        AND "matchStartTime" <= NOW() - INTERVAL '${MATCH_DURATION_HOURS} hours'
      RETURNING id, status
    `);
    if (completeResult.rowCount > 0) {
      console.log(`[LIFECYCLE] ${completeResult.rowCount} match(es) → COMPLETED`);
    }

    // 3. Close contests for LIVE or COMPLETED matches
    const closeContests = await client.query(`
      UPDATE "Contest" c
      SET status = 'CLOSED'
      FROM "Match" m
      WHERE c."matchId" = m.id
        AND m.status IN ('LIVE', 'COMPLETED')
        AND c.status = 'OPEN'
      RETURNING c.id
    `);
    if (closeContests.rowCount > 0) {
      console.log(`[LIFECYCLE] Closed ${closeContests.rowCount} contest(s) for live/completed matches`);
    }

    // 4. Settle contests and distribute winnings when matches are COMPLETED
    const settleContests = await client.query(`
      UPDATE "Contest" c
      SET status = 'SETTLED'
      FROM "Match" m
      WHERE c."matchId" = m.id
        AND m.status = 'COMPLETED'
        AND c.status = 'CLOSED'
      RETURNING c.id, c."prizePool"
    `);

    if (settleContests.rowCount > 0) {
      console.log(`[LIFECYCLE] Settling ${settleContests.rowCount} contest(s) and distributing winnings...`);
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const leaderboardService = require('../services/leaderboard.service');

      for (const row of settleContests.rows) {
        const contestId = row.id;
        const prizePool = parseFloat(row.prizePool);
        
        // Fetch top 3 from Redis
        const topTeams = await leaderboardService.getTopUsers(contestId, 3);
        
        if (topTeams.length > 0 && prizePool > 0) {
          // Standard distribution of prize pool: 1st=50%, 2nd=30%, 3rd=20%
          const distribution = [0.5, 0.3, 0.2];
          
          for (let i = 0; i < topTeams.length && i < distribution.length; i++) {
            const teamData = topTeams[i];
            const userTeamId = parseInt(teamData.userId); // Redis stores the userTeamId
            const winAmount = prizePool * distribution[i];
            
            if (winAmount > 0) {
              const userTeam = await prisma.userTeam.findUnique({ where: { id: userTeamId } });
              if (userTeam) {
                const userId = userTeam.userId;
                
                // Enqueue to BullMQ
                await payoutQueue.add('process-payout', {
                    userId,
                    winAmount,
                    contestId,
                    rank: i + 1
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 1000 }
                });
                
                console.log(`[LIFECYCLE] Queued payout of ${winAmount} for User ${userId}`);
              }
            }
          }
        }
      }
      await prisma.$disconnect();
    }

    // 4. Emit match_status changes for any matches that updated
    const socketHandler = require('../sockets/socket.handler');
    const updatedMatches = [...goLiveResult.rows, ...completeResult.rows];
    updatedMatches.forEach(m => {
      socketHandler.emitMatchStatus(m.id, { match_id: m.id, status: m.status });
    });

  } catch (err) {
    console.error('[LIFECYCLE] Cron error:', err.message);
  } finally {
    client.release();
  }
}

// Run immediately on start, then every 2 minutes
runLifecycleCron();
const INTERVAL_MS = 2 * 60 * 1000;
setInterval(runLifecycleCron, INTERVAL_MS);

console.log('[LIFECYCLE] Match lifecycle worker started (checking every 2 min)');

module.exports = { runLifecycleCron };
