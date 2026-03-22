const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getContestsByMatch = async (matchId) => {
  return prisma.contest.findMany({ where: { matchId } });
};

exports.findContestEntry = async (contestId, userTeamId) => {
  return prisma.contestEntry.findUnique({
    where: { contestId_userTeamId: { contestId, userTeamId } }
  });
};

exports.findContestById = async (contestId) => {
  return prisma.contest.findUnique({ where: { id: contestId } });
};

exports.joinContestTransaction = async (userId, contestId, userTeamId, entryFee) => {
  return prisma.$transaction(async (tx) => {
    // Lock the wallet row
    const [lockedWallet] = await tx.$queryRaw`SELECT id, balance FROM "UserWallet" WHERE "userId" = ${userId} FOR UPDATE`;
    if (!lockedWallet || parseFloat(lockedWallet.balance) < parseFloat(entryFee)) {
      throw new Error("Insufficient wallet balance to join contest");
    }

    // Lock the contest row
    const [lockedContest] = await tx.$queryRaw`SELECT id, "joinedSpots", "totalSpots" FROM "Contest" WHERE id = ${contestId} FOR UPDATE`;
    if (lockedContest.joinedSpots >= lockedContest.totalSpots) {
      throw new Error("Contest is full");
    }

    // Decrement balance
    await tx.userWallet.update({
      where: { id: lockedWallet.id },
      data: { balance: { decrement: entryFee } }
    });

    // Update spots
    await tx.contest.update({
      where: { id: lockedContest.id },
      data: { joinedSpots: { increment: 1 } }
    });

    // Log transaction
    await tx.transaction.create({
      data: {
        walletId: lockedWallet.id,
        type: 'entry_fee',
        amount: entryFee
      }
    });

    // Create entry
    return await tx.contestEntry.create({
      data: {
        contestId,
        userId,
        userTeamId,
        points: 0
      }
    });
  }, {
    maxWait: 5000, 
    timeout: 10000 
  });
};
