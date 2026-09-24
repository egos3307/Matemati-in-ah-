const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_TEACHER_EMAIL || process.env.ADMIN_EMAIL;
  const rawPassword = process.env.INITIAL_TEACHER_PASSWORD;

  if (!email || !rawPassword) {
    console.log('⚠️ INITIAL_TEACHER_EMAIL ve INITIAL_TEACHER_PASSWORD ortam değişkenleri tanımlanmamış.');
    console.log('Kullanım: INITIAL_TEACHER_EMAIL="ogretmen@example.com" INITIAL_TEACHER_PASSWORD="gucluparola" node seed_teacher.js');
    return;
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  
  const teacher = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'HEAD_TEACHER'
    },
    create: {
      email,
      password: hashedPassword,
      name: process.env.INITIAL_TEACHER_NAME || 'Yönetici Öğretmen',
      role: 'HEAD_TEACHER',
    },
  });

  console.log('Öğretmen / Yönetici hesabı oluşturuldu/güncellendi:', teacher.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
