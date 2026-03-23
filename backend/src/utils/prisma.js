const { PrismaClient } = require('@prisma/client');

<<<<<<< HEAD
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
=======
let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !dbUrl.includes('pgbouncer=true')) {
  dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
}
>>>>>>> 913e5a59fff9de2c701748a63233eea30fcfe648

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

module.exports = prisma;
