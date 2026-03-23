'use strict';
const Redis = require('ioredis');

let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
}

exports.safeRedisGet = async (key) => {
  if (!redis) return null;
  try { return await redis.get(key); } catch (_) { return null; }
};

exports.safeRedisSet = async (key, ttl, value) => {
  if (!redis) return;
  try { await redis.setex(key, ttl, value); } catch (_) {}
};
