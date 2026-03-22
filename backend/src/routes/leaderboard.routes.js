const express = require('express');
const router = express.Router();
const leaderboardService = require('../services/leaderboard.service');

router.get('/:contestId', async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const leaderboard = await leaderboardService.getTopUsers(contestId);
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard", error: error.message });
  }
});

module.exports = router;
