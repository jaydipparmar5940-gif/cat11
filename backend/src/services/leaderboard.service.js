/**
 * leaderboard.service.js
 *
 * Manages the Redis-backed contest leaderboards using Sorted Sets.
 * Key format:   leaderboard:{contest_id}
 * Member:       user_id  (or userTeamId)
 * Score:        points
 */

const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1
});

redis.on('error', (err) => {
  console.error(`[REDIS ERROR] Connection failed: ${err.message}`);
});

/**
 * Add or update player points on the leaderboard
 * @param {string|number} contestId 
 * @param {string|number} userId 
 * @param {number} points 
 */
exports.updateLeaderboard = async (contestId, points, userId) => {
  try {
    // ZADD adds the specified member with the specified score to the sorted set
    // Sorted ascending by default in Redis, but we use ZREV* commands to view highest first
    await redis.zadd(`leaderboard:${contestId}`, points, userId);
  } catch (error) {
    console.error(`[REDIS ERROR] updateLeaderboard: ${error.message}`);
    throw error;
  }
};

/**
 * Get top N users from the leaderboard
 * @param {string|number} contestId 
 * @param {number} limit 
 */
exports.getTopUsers = async (contestId, limit = 50) => {
  try {
    // ZREVRANGE fetches elements sorted by score in descending order (highest score = rank 0)
    // 'WITHSCORES' makes Redis return [user_id_1, score_1, user_id_2, score_2, ...]
    const result = await redis.zrevrange(`leaderboard:${contestId}`, 0, limit - 1, 'WITHSCORES');
    
    const topUsers = [];
    for (let i = 0; i < result.length; i += 2) {
      topUsers.push({
        userId: result[i],
        points: parseFloat(result[i + 1]),
        rank: (i / 2) + 1
      });
    }
    return topUsers;
  } catch (error) {
    console.error(`[REDIS ERROR] getTopUsers: ${error.message}`);
    return [];
  }
};

/**
 * Get a specific user's rank on the leaderboard
 * @param {string|number} contestId 
 * @param {string|number} userId 
 * @returns {number|null} Rank (1-indexed) or null if not found
 */
exports.getUserRank = async (contestId, userId) => {
  try {
    // ZREVRANK returns the 0-based index of the member, sorted descending
    const rankIndex = await redis.zrevrank(`leaderboard:${contestId}`, userId);
    
    // If rankIndex is null, the user is not in this leaderboard
    if (rankIndex === null) {
      return null;
    }
    
    // Convert 0-indexed to 1-indexed rank
    return rankIndex + 1;
  } catch (error) {
    console.error(`[REDIS ERROR] getUserRank: ${error.message}`);
    return null;
  }
};

/**
 * Delete the leaderboard entirely (e.g., when contest is complete and archived)
 */
exports.clearLeaderboard = async (contestId) => {
  try {
    await redis.del(`leaderboard:${contestId}`);
  } catch (error) {
    console.error(`[REDIS ERROR] clearLeaderboard: ${error.message}`);
  }
};
