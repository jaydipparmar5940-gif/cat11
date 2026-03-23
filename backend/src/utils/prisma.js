const { PrismaClient } = require('@prisma/client');

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('pgbouncer=true')) {
  process.env.DATABASE_URL += (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'pgbouncer=true';
}

const prisma = new PrismaClient();

module.exports = prisma;
