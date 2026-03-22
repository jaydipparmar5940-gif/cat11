// Centralized Resilient Redis Client
// ---------------------------------
// This utility ensures the backend doesn't crash if Redis is unavailable.
// It provides safe wrappers for standard Redis, Bull (v3), and BullMQ (v5).

const IORedis = require('ioredis');
const Bull = require('bull');
const { Queue: BullMQQueue, Worker: BullMQWorker } = require('bullmq');

let redisClient = null;
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redisClient = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Critical for BullMQ
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redisClient.on('connect', () => console.log('✅ [REDIS] Connected'));
    redisClient.on('error', (err) => {
      console.error('❌ [REDIS] Error:', err.message);
      // We don't exit the process here to allow the app to function without Redis
    });
  } catch (err) {
    console.error('❌ [REDIS] Initialization failed:', err.message);
    redisClient = null;
  }
} else {
  console.warn('⚠️ [REDIS] No REDIS_URL provided. Redis-dependent features will be disabled.');
}

/**
 * Safe Bull (v3) Queue Creator
 */
const createSafeBullQueue = (name) => {
  if (redisClient) {
    try {
      return new Bull(name, REDIS_URL);
    } catch (err) {
      console.error(`❌ [BULL] Queue ${name} failed:`, err.message);
      return null;
    }
  }
  return null;
};

/**
 * Safe BullMQ (v5) Queue Creator
 */
const createSafeBullMQQueue = (name) => {
  if (redisClient) {
    try {
      return new BullMQQueue(name, { connection: redisClient });
    } catch (err) {
      console.error(`❌ [BULLMQ] Queue ${name} failed:`, err.message);
      return null;
    }
  }
  return null;
};

module.exports = {
  redisClient,
  createSafeBullQueue,
  createSafeBullMQQueue,
  isConnected: () => !!redisClient && redisClient.status === 'ready'
};
