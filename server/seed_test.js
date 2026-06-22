const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { email: 'test@fulle.com' },
    update: { password: hashedPassword, role: 'TEACHER' },
    create: { email: 'test@fulle.com', password: hashedPassword, name: 'Test Hoca', role: 'TEACHER' },
  });
  console.log('Test hesabı oluşturuldu: test@fulle.com / 123456');
}

main().catch(console.error).finally(() => prisma.$disconnect());
