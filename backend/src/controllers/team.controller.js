const teamService = require('../services/team.service');

exports.createTeam = async (req, res) => {
  try {
    const { matchId, captainId, viceCaptainId, playerIds } = req.body;
    const userId = req.user.userId;

    const userTeam = await teamService.createTeam(userId, matchId, captainId, viceCaptainId, playerIds);

    res.status(201).json({ message: "Team created successfully", userTeam });
  } catch (error) {
    console.error('[TEAM CTRL]', error);
    if (error.message === "Team must have exactly 11 players") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error creating team", error: error.message });
  }
};

exports.getMyMatches = async (req, res) => {
  try {
    const userId = req.user.userId;
    const matches = await teamService.getMyMatches(userId);
    res.status(200).json(matches);
  } catch (error) {
    console.error('[TEAM CTRL]', error);
    res.status(500).json({ message: "Error fetching my matches", error: error.message });
  }
};

exports.getUserTeamsByMatch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const matchId = parseInt(req.params.matchId);

    const userTeams = await teamService.getUserTeamsByMatch(userId, matchId);

    res.status(200).json(userTeams);
  } catch (error) {
    console.error('[TEAM CTRL]', error);
    if (error.message === "Invalid match ID") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error fetching user teams", error: error.message });
  }
};
