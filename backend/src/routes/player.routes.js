'use strict';

const express      = require('express');
const router       = express.Router();
const playerCtrl   = require('../controllers/player.controller');

// GET /api/players                   – all players (optional ?role= ?team= ?q=)
router.get('/',                  playerCtrl.getPlayers);

// GET /api/players/match/:matchId    – players for a specific match
router.get('/match/:matchId',    playerCtrl.getPlayersByMatch);

// GET /api/players/:id               – single player by ID
router.get('/:id',               playerCtrl.getPlayerById);

module.exports = router;
