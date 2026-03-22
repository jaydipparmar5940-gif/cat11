'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/rapidapi.controller');

// GET /api/squad?seriesId=<seriesId>
router.get('/squad',       ctrl.getSquad);

// GET /api/scorecard?matchId=<apiMatchId>
router.get('/scorecard',   ctrl.getScorecard);

// GET /api/commentary?matchId=<apiMatchId>
router.get('/commentary',  ctrl.getCommentary);

// GET /api/livescore?matchId=<apiMatchId>
router.get('/livescore',   ctrl.getLiveScore);

// GET /api/lineup?matchId=<apiMatchId>
router.get('/lineup',      ctrl.getLineup);

// GET /api/finalscore?matchId=<apiMatchId>
router.get('/finalscore',  ctrl.getFinalScore);

module.exports = router;
