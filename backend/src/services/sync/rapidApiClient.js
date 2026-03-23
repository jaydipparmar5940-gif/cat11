/**
 * rapidApiClient.js
 * Specialized axios instance for RapidAPI Cricbuzz.
 */

'use strict';

const axios = require('axios');

const RAPID_API_KEY  = process.env.RAPID_API_KEY;
const RAPID_API_HOST = 'cricbuzz-cricket.p.rapidapi.com';

if (!RAPID_API_KEY) {
  console.warn('[RAPID_API] Missing RAPID_API_KEY in environment.');
}

const client = axios.create({
  baseURL: `https://${RAPID_API_HOST}`,
  headers: {
    'x-rapidapi-key':  RAPID_API_KEY,
    'x-rapidapi-host': RAPID_API_HOST
  }
});

module.exports = client;
