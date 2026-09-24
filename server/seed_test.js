const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_TEACHER_EMAIL || 'test@example.com';
  const hashedPassword = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: 'TEACHER' },
    create: { email, password: hashedPassword, name: 'Test Hoca', role: 'TEACHER' },
  });
  console.log(`Test hesabı oluşturuldu: ${email} / 123456`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
