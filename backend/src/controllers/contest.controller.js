const contestService = require('../services/contest.service');

exports.createContest = async (req, res) => {
  try {
    const { matchId, entryFee, totalSpots, prizePool } = req.body;
    const contest = await contestService.createContest({
      matchId: parseInt(matchId),
      entryFee: parseFloat(entryFee),
      totalSpots: parseInt(totalSpots),
      prizePool: parseFloat(prizePool)
    });
    res.status(201).json(contest);
  } catch (error) {
    console.error('[CONTEST CTRL] create error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getContestsByMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid match ID' });
    const contests = await contestService.getContestsByMatch(matchId);
    res.status(200).json(contests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching contests", error: error.message });
  }
};

exports.getAllContests = async (req, res) => {
  try {
    const contests = await contestService.getAllContests();
    res.status(200).json(contests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all contests", error: error.message });
  }
};

exports.joinContest = async (req, res) => {
  try {
    const { contestId, userTeamId } = req.body;
    const userId = req.user.userId;

    const entry = await contestService.joinContest(userId, contestId, userTeamId);
    
    res.status(201).json({ message: "Joined contest successfully", entry });
  } catch (error) {
    if (error.message === "Contest is full" || 
        error.message === "Insufficient wallet balance to join contest" ||
        error.message === "This team has already joined the contest.") {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === "Contest not found") {
      return res.status(404).json({ message: error.message });
    }
    console.error('[CONTEST CTRL]', error);
    res.status(500).json({ message: "Error joining contest", error: error.message });
  }
};
