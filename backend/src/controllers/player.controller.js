'use strict';

const playerService = require('../services/player.service');

exports.getPlayers = async (req, res) => {
  try {
    const { role, team, q } = req.query;
    const players = await playerService.getPlayers(role, team, q);

    return res.status(200).json({
      success: true,
      count:   players.length,
      data:    players,
    });
  } catch (error) {
    console.error('[PLAYER CTRL] getPlayers:', error.message);
    return res.status(500).json({ message: 'Error fetching players', error: error.message });
  }
};

exports.getPlayerById = async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    if (isNaN(playerId)) return res.status(400).json({ message: 'Invalid player ID' });

    const player = await playerService.getPlayerById(playerId);

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    return res.status(200).json({ success: true, data: player });
  } catch (error) {
    console.error('[PLAYER CTRL] getPlayerById:', error.message);
    return res.status(500).json({ message: 'Error fetching player', error: error.message });
  }
};

exports.getPlayersByMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid match ID' });

    const result = await playerService.getPlayersByMatch(matchId);

    return res.status(200).json({
      success:  true,
      match_id: matchId,
      count:    result.count,
      players:  result.players,
      by_team:  result.by_team,
    });
  } catch (error) {
    if (error.message === "Match not found") {
      return res.status(404).json({ message: error.message });
    }
    console.error('[PLAYER CTRL] getPlayersByMatch:', error.message);
    return res.status(500).json({ message: 'Error fetching match players', error: error.message });
  }
};
