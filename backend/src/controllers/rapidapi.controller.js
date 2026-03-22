'use strict';

const svc = require('../services/rapidapi.service');

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json({ success: true, data });
  } catch (e) {
    console.error('[RAPIDAPI CTRL]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/squad?seriesId=<id>
exports.getSquad = handle(req => svc.getSquad(req.query.seriesId));

// GET /api/scorecard?matchId=<apiMatchId>
exports.getScorecard = handle(req => svc.getScorecard(req.query.matchId));

// GET /api/commentary?matchId=<apiMatchId>
exports.getCommentary = handle(req => svc.getCommentary(req.query.matchId));

// GET /api/livescore?matchId=<apiMatchId>
exports.getLiveScore = handle(req => svc.getLiveScore(req.query.matchId));

// GET /api/lineup?matchId=<apiMatchId>
exports.getLineup = handle(req => svc.getLineup(req.query.matchId));

// GET /api/finalscore?matchId=<apiMatchId>
exports.getFinalScore = handle(req => svc.getFinalScore(req.query.matchId));
