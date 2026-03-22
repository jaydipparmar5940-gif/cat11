const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma connection...');
    const userCount = await prisma.user.count();
    console.log('Current user count:', userCount);

    const testEmail = `test_${Date.now()}@example.com`;
    console.log('Creating test user:', testEmail);
    
    const newUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        phone: '1234567890',
        password: 'hashed_password_val',
        walletBalance: 0,
        wallet: {
          create: { balance: 0 }
        }
      },
      include: {
        wallet: true
      }
    });
    
    console.log('Success! Created user:', newUser.id);
    console.log('Wallet created:', newUser.wallet ? 'Yes' : 'No');
    
    // Cleanup
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('Test user deleted.');
    
  } catch (error) {
    console.error('Prisma Test Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
