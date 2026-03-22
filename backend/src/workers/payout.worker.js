const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const IORedis = require('ioredis');

const prisma = new PrismaClient();

// Use IORedis instance for BullMQ to avoid maxListeners issues and share connections properly
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

const payoutQueue = new Queue('payout-queue', { connection });

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
}, { connection });

payoutWorker.on('failed', (job, err) => {
  console.error(`[PAYOUT QUEUE] Job ${job.id} failed:`, err.message);
});

module.exports = { payoutQueue };
