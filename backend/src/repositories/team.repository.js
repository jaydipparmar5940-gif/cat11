const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllTeams = async () => {
  return prisma.userTeam.findMany({
    include: {
      teamPlayers: {
        include: { player: true }
      },
      match: {
        include: {
          teamA: true,
          teamB: true
        }
      }
    }
  });
};

exports.createTeam = async (userId, matchId, captainId, viceCaptainId, playerIds) => {
  return prisma.userTeam.create({
    data: {
      userId,
      matchId,
      captainId,
      viceCaptainId,
      teamPlayers: {
        create: playerIds.map(pid => ({ playerId: pid }))
      }
    }
  });
};

exports.getUserTeamsByMatch = async (userId, matchId) => {
  return prisma.userTeam.findMany({
    where: { userId, matchId },
    include: {
      teamPlayers: {
        include: { player: true }
      }
    }
  });
};
