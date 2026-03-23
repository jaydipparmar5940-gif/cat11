const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketHandler = require('../sockets/socket.handler');
const leaderboardService = require('../services/leaderboard.service');
const scoringEngine = require('../services/scoring.engine');

// --- MATCHES ---

exports.addMatch = async (req, res) => {
  try {
    const { teamAId, teamBId, matchStartTime, venue } = req.body;
    
    const match = await prisma.match.create({
      data: {
        teamAId,
        teamBId,
        matchStartTime: new Date(matchStartTime),
        venue,
        status: 'UPCOMING'
      }
    });
    res.status(201).json({ message: "Match created successfully", match });
  } catch (err) {
    res.status(500).json({ message: "Error adding match", error: err.message });
  }
};

exports.startMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const match = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'LIVE' }
    });
    
    // Emit socket update
    socketHandler.emitMatchStatus(matchId, { match_id: matchId, status: 'LIVE' });
    
    res.status(200).json({ message: "Match started", match });
  } catch (err) {
    res.status(500).json({ message: "Error starting match", error: err.message });
  }
};

exports.endMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const match = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'COMPLETED' }
    });

    // Close open contests for this match
    await prisma.contest.updateMany({
      where: { matchId, status: 'OPEN' },
      data: { status: 'CLOSED' }
    });

    // Emit socket update
    socketHandler.emitMatchStatus(matchId, { match_id: matchId, status: 'COMPLETED' });
    
    // Note: match-lifecycle.worker.js cron will handle the prize pool payouts automatically.
    
    res.status(200).json({ message: "Match ended and contests closed", match });
  } catch (err) {
    res.status(500).json({ message: "Error ending match", error: err.message });
  }
};


// --- PLAYERS ---

exports.editPlayer = async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const { name, role, imageUrl, teamId } = req.body;

    const data = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (teamId) data.teamId = teamId;

    const player = await prisma.player.update({
      where: { id: playerId },
      data
    });
    res.status(200).json({ message: "Player updated", player });
  } catch (err) {
    res.status(500).json({ message: "Error updating player", error: err.message });
  }
};


// --- CONTESTS ---

exports.createContest = async (req, res) => {
  try {
    const { matchId, entryFee, totalSpots, prizePool } = req.body;
    
    if (!matchId || entryFee === undefined || !totalSpots || prizePool === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const contest = await prisma.contest.create({
      data: {
        matchId,
        entryFee,
        totalSpots,
        prizePool,
        status: 'OPEN'
      }
    });

    res.status(201).json({ message: "Contest created successfully", contest });
  } catch (err) {
    res.status(500).json({ message: "Error creating contest", error: err.message });
  }
};

exports.recalculateLeaderboard = async (req, res) => {
  try {
    const contestId = parseInt(req.params.id);
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return res.status(404).json({ message: "Contest not found" });

    const matchId = contest.matchId;

    // Fetch all user teams (entries) for this contest
    const entries = await prisma.contestEntry.findMany({
      where: { contestId },
      include: { userTeam: { include: { teamPlayers: true } } }
    });

    // Fetch all DB points mapped
    const allDbPoints = await prisma.playerPoint.findMany({ where: { matchId } });
    const pointsDict = {};
    allDbPoints.forEach(row => pointsDict[row.playerId] = row.points);

    // Update team points and Redis Leaderboard
    for (const entry of entries) {
      const teamScore = scoringEngine.calculateTeamPoints(
        entry.userTeam.teamPlayers,
        pointsDict,
        entry.userTeam.captainId,
        entry.userTeam.viceCaptainId
      );

      // ZADD to Redis
      await leaderboardService.updateLeaderboard(contestId, teamScore, entry.userTeamId);
    }

    // Broadcast update
    const updatedTop = await leaderboardService.getTopUsers(contestId, 50);
    socketHandler.emitLeaderboardUpdate(contestId, {
      contest_id: contestId,
      leaderboard: updatedTop,
      timestamp: new Date()
    });

    res.status(200).json({ 
        message: "Leaderboard recalculated and broadcasted successfully", 
        processedEntries: entries.length 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error recalculating leaderboard", error: err.message });
  }
};

// --- MIGRATE & SEED ---

exports.migrateSeed = async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });
  const log = [];
  try {
    // 1. Add apiId column to Match if missing
    await pool.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "apiId" TEXT`);
    log.push('apiId column ensured on Match');

    // 2. Seed from RapidAPI
    const rapidapiService = require('../services/rapidapi.service');
    const matches = await rapidapiService.getUpcomingMatches();
    log.push(`Synced ${matches.length} matches from RapidAPI`);

    res.json({ success: true, log });
  } catch (err) {
    console.error('[ADMIN] migrateSeed error:', err.message);
    res.status(500).json({ success: false, error: err.message, log });
  } finally {
    pool.end();
  }
};
