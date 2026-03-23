/**
 * sync.routes.js
 * API Endpoints to trigger sync manually.
 */

'use strict';

const express = require('express');
const router  = express.Router();

const { syncMatches }   = require('../services/sync/matchSync.service');
const { syncPlayers }   = require('../services/sync/playerSync.service');
const { syncLineups }   = require('../services/sync/lineupSync.service');
const { syncLive }      = require('../services/sync/liveSync.service');
const { syncScorecard } = require('../services/sync/scorecardSync.service');

// GET /api/sync/matches
router.get('/matches', async (req, res) => {
  try {
    const result = await syncMatches();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/players/:match_id
// :match_id is the API ID (e.g. 150259)
router.get('/players/:match_id', async (req, res) => {
  try {
    const result = await syncPlayers(req.params.match_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/lineups/:match_id
router.get('/lineups/:match_id', async (req, res) => {
  try {
    const result = await syncLineups(req.params.match_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/live/:match_id
router.get('/live/:match_id', async (req, res) => {
  try {
    const result = await syncLive(req.params.match_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/scorecard/:match_id
router.get('/scorecard/:match_id', async (req, res) => {
  try {
    const result = await syncScorecard(req.params.match_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
