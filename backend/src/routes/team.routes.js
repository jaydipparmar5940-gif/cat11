const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/create', authMiddleware, teamController.createTeam);
router.get('/my/matches', authMiddleware, teamController.getMyMatches);
router.get('/:matchId', authMiddleware, teamController.getUserTeamsByMatch);

module.exports = router;
