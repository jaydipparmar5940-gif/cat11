'use strict';

const express        = require('express');
const router         = express.Router();
const matchCtrl      = require('../controllers/match.controller');

// GET all matches
router.get('/',               matchCtrl.getAllMatches);

// ── Primary endpoints (as specified) ──────────────────────────────────────
router.get('/upcoming',        matchCtrl.getUpcomingMatches);   // GET /api/matches/upcoming
router.get('/live',            matchCtrl.getLiveFromCricApi);   // GET /api/matches/live  (CricAPI direct)
router.get('/debug',           (req, res) => res.json({ db: process.env.DATABASE_URL }));
router.get('/debug-db',        async (req, res) => {
  try {
    const repo = require('../repositories/match.repository');
    const rows = await repo.getUpcomingMatches();
    res.json({ rows: rows.length });
  } catch(e) { res.json({ err: e.message }) }
});
router.get('/debug-svc', async (req, res) => {
  res.json(await require('../services/match.service').getUpcomingMatches());
});

router.get('/:id',             matchCtrl.getMatchDetails);      // GET /api/matches/:id
router.get('/:id/squad',       matchCtrl.getMatchSquad);        // GET /api/matches/:id/squad
router.get('/:id/contests',    matchCtrl.getMatchContests);     // GET /api/matches/:id/contests
router.get('/:id/cricplayers', matchCtrl.getMatchPlayersFromCricApi); // GET /api/matches/:id/cricplayers

module.exports = router;
