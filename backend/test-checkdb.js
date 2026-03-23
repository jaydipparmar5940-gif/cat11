require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const all = await prisma.match.findMany({ select: { id: true, status: true, teamA: { select: { name: true }} }});
  console.log(`Total Matches: ${all.length}`);
  if (all.length > 0) {
    console.log('Sample matches:', all.slice(0, 5));
  }
}
check();
