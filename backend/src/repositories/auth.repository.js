const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

exports.createUser = async (name, email, phone, hashedPassword) => {
  return await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      walletBalance: 0,
      wallet: {
        create: { balance: 0 }
      }
    },
  });
};
