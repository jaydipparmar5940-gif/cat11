require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const Queue = require('bull');

// Real scraper would use Puppeteer
// Mock data generation for local development without dependencies

const MOCK_EVENTS = [
  { runs: 1, fours: 0, sixes: 0 },
  { runs: 4, fours: 1, sixes: 0 },
  { runs: 6, fours: 0, sixes: 1 },
  { wickets: 1 },
  { catches: 1 },
  { stumpings: 1 },
  { runouts: 1 },
  { runs: 2, fours: 0, sixes: 0 },
  { runs: 0, fours: 0, sixes: 0 }
];

exports.getLiveMatches = async () => {
  // Mocking match data for local dev
  try {
    return [
      { id: 1, teamA: 'IND', teamB: 'AUS', status: 'LIVE' },
      { id: 2, teamA: 'ENG', teamB: 'PAK', status: 'UPCOMING' }
    ];
  } catch (error) {
    console.error(`[SCRAPER ERROR] ${error.message}`);
    return [];
  }
};

exports.getMatchScorecard = async (matchId) => {
  try {
    return {}; // Placeholder for player stats map
  } catch (error) {
    console.error(`[SCRAPER ERROR] ${error.message}`);
    return {};
  }
};

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let scoreQueue;

exports.startMockEventGenerator = async (matchId) => {
  if (!scoreQueue) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    scoreQueue = new Queue('score-updates', redisUrl);
  }

  console.log(`[SCRAPER] Fetching real players for Match ${matchId}...`);
  
  try {
    const matchRes = await pool.query('SELECT "teamAId", "teamBId" FROM "Match" WHERE id = $1', [matchId]);
    if (matchRes.rows.length === 0) throw new Error('Match not found');
    
    const { teamAId, teamBId } = matchRes.rows[0];
    const playerRes = await pool.query('SELECT id FROM "Player" WHERE "teamId" IN ($1, $2)', [teamAId, teamBId]);
    const playerIds = playerRes.rows.map(r => r.id);
    
    if (playerIds.length === 0) {
      console.warn(`[SCRAPER] No players found for teams ${teamAId} and ${teamBId}. Falling back to IDs 1-22.`);
      for (let i = 1; i <= 22; i++) playerIds.push(i);
    }

    console.log(`[SCRAPER] Started mock event generator for Match ${matchId} (${playerIds.length} players)`);
    let playerStatsMap = {};

    playerIds.forEach(id => {
      playerStatsMap[id] = { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0, played: true };
    });

    setInterval(() => {
      const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
      const randomEvent = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
      
      for (const [key, value] of Object.entries(randomEvent)) {
        playerStatsMap[randomPlayerId][key] = (playerStatsMap[randomPlayerId][key] || 0) + value;
      }

      console.log(`[SCRAPER] Generated event for Player ${randomPlayerId}:`, randomEvent);
      
      scoreQueue.add({
        matchId,
        playerStatsMap: { ...playerStatsMap }
      });
    }, 3000);

  } catch (err) {
    console.error(`[SCRAPER ERROR] Initialization failed: ${err.message}`);
  }
};

if (require.main === module) {
  console.log('[SCRAPER] Starting standalone mock generator...');
  require('dotenv').config();
  exports.startMockEventGenerator(1);
}
