'use strict';

const matchService = require('../services/match.service');
const rapidapiService = require('../services/rapidapi.service');

exports.getUpcomingMatches = async (req, res) => {
  try {
    const responseData = await matchService.getUpcomingMatches();
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('[MATCH CTRL] getUpcomingMatches:', error.message);
    return res.status(500).json({ message: 'Error fetching upcoming matches', error: error.message });
  }
};

exports.getMatchDetails = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid match ID' });

    const responseData = await matchService.getMatchDetails(matchId);
    return res.status(200).json(responseData);
  } catch (error) {
    if (error.message === 'Match not found') {
      return res.status(404).json({ message: error.message });
    }
    console.error('[MATCH CTRL] getMatchDetails:', error.message);
    return res.status(500).json({ message: 'Error fetching match details', error: error.stack });
  }
};

exports.getMatchSquad = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid match ID' });

    const responseData = await matchService.getMatchSquad(matchId);
    return res.status(200).json(responseData);
  } catch (error) {
    if (error.message === 'Match not found') {
      return res.status(404).json({ message: error.message });
    }
    console.error('[MATCH CTRL] getMatchSquad:', error.message);
    return res.status(500).json({ message: 'Error fetching match squad', error: error.message });
  }
};

exports.getAllMatches = async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await matchService.getAllMatches(status);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
};

exports.getMatchById = async (req, res) => {
  return exports.getMatchDetails(req, res);
};

exports.getMatchContests = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid match ID' });
    const rows = await matchService.getMatchContests(matchId);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching contests', error: error.message });
  }
};

exports.getLiveFromRapidApi = async (req, res) => {
  try {
    const matchId = req.query.id; // ?id=xxxxx
    if (!matchId) return res.status(400).json({ message: 'Need ?id= parameter for live score' });
    const score = await rapidapiService.getLiveScore(matchId);
    return res.status(200).json({ success: true, data: score });
  } catch (error) {
    console.error('[MATCH CTRL] getLiveFromRapidApi:', error.message);
    return res.status(500).json({ message: 'Error fetching live score', error: error.message });
  }
};

exports.getMatchSquadFromRapidApi = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const apiId   = req.query.apiId || null;
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid match ID' });
    const result = await rapidapiService.getMatchSquad(matchId, apiId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[MATCH CTRL] getMatchSquadFromRapidApi:', error.message);
    return res.status(500).json({ message: 'Error fetching squad from RapidAPI', error: error.message });
  }
};
