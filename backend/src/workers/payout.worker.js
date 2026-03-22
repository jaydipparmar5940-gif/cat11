const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { redisClient } = require('../utils/redis');

const prisma = new PrismaClient();

// Only initialize BullMQ if Redis is available
const payoutQueue = redisClient ? new Queue('payout-queue', { connection: redisClient }) : null;

if (redisClient) {
  const payoutWorker = new Worker('payout-queue', async (job) => {
  const { userId, winAmount, contestId, rank } = job.data;
  
  if (winAmount <= 0) return;

  const wallet = await prisma.userWallet.findUnique({ where: { userId } });
  if (wallet) {
    // We update the wallet dynamically inside the queue worker to prevent tying up the main thread
    await prisma.$transaction([
      prisma.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: winAmount } }
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'winning',
          amount: winAmount
        }
      })
    ]);
    console.log(`[PAYOUT QUEUE] Awarded ${winAmount} to User ${userId} for Contest ${contestId} (Rank ${rank})`);
  }
}, { connection: redisClient });

payoutWorker.on('failed', (job, err) => {
  console.error(`[PAYOUT QUEUE] Job ${job.id} failed:`, err.message);
});
}

module.exports = { payoutQueue };
