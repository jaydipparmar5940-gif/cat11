const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contest.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/:matchId', contestController.getContestsByMatch);
router.post('/join', authMiddleware, contestController.joinContest);

module.exports = router;
