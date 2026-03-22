const teamRepo = require('../repositories/team.repository');

exports.getAllTeams = async () => {
  return await teamRepo.getAllTeams();
};

exports.createTeam = async (userId, matchId, captainId, viceCaptainId, playerIds) => {
  if (playerIds.length !== 11) {
    throw new Error("Team must have exactly 11 players");
  }

  return await teamRepo.createTeam(userId, matchId, captainId, viceCaptainId, playerIds);
};

exports.getUserTeamsByMatch = async (userId, matchId) => {
  if (isNaN(matchId)) {
    throw new Error("Invalid match ID");
  }
  return await teamRepo.getUserTeamsByMatch(userId, matchId);
};

exports.getMyMatches = async (userId) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  // Find all matches the user has created a team for
  const userTeams = await prisma.userTeam.findMany({
    where: { userId },
    include: {
      match: {
        include: {
          teamA: true,
          teamB: true
        }
      }
    },
    orderBy: {
      match: {
        matchStartTime: 'desc'
      }
    }
  });

  // Extract unique matches
  const matchMap = new Map();
  userTeams.forEach(ut => {
    if (!matchMap.has(ut.matchId)) {
      matchMap.set(ut.matchId, {
        ...ut.match,
        userTeamId: ut.id // reference to one of the user teams
      });
    }
  });

  return Array.from(matchMap.values());
};
