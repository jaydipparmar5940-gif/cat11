const { PrismaClient } = require('@prisma/client');

let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !dbUrl.includes('pgbouncer=true')) {
  dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

module.exports = prisma;
