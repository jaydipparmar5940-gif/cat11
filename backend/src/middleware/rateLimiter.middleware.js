const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../utils/redis');

// Fallback to memory store if redis is not available
const store = redisClient ? new RedisStore({
  sendCommand: (...args) => redisClient.call(...args),
}) : undefined;

/**
 * Generic API Limiter
 * Limits each IP to 150 requests per 15 minutes.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, 
  standardHeaders: true, 
  legacyHeaders: false, 
  store,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});

/**
 * Strict Limiter (e.g. for joins or auth)
 * Limits each IP to 20 requests per 5 minutes
 */
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  message: { message: "Too many requests. Please slow down." }
});

module.exports = { apiLimiter, strictLimiter };
