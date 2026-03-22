const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getWalletByUserId = async (userId) => {
  return prisma.userWallet.findUnique({ where: { userId } });
};

exports.deposit = async (walletId, amount) => {
  return prisma.$transaction([
    prisma.userWallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } }
    }),
    prisma.transaction.create({
      data: {
        walletId,
        type: 'deposit',
        amount
      }
    })
  ]);
};

exports.withdraw = async (walletId, amount) => {
  return prisma.$transaction(async (tx) => {
    // Lock row to prevent race conditions during withdraw
    const [lockedWallet] = await tx.$queryRaw`SELECT id, balance FROM "UserWallet" WHERE id = ${walletId} FOR UPDATE`;
    if (!lockedWallet || parseFloat(lockedWallet.balance) < parseFloat(amount)) {
      throw new Error("Insufficient balance");
    }

    await tx.userWallet.update({
      where: { id: walletId },
      data: { balance: { decrement: amount } }
    });

    await tx.transaction.create({
      data: {
        walletId,
        type: 'withdraw',
        amount
      }
    });

    return await tx.userWallet.findUnique({ where: { id: walletId } });
  }, {
    maxWait: 5000,
    timeout: 10000
  });
};
