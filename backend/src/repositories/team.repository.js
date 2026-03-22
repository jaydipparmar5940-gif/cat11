const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
