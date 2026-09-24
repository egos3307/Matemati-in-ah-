const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const teacherEmail = process.env.INITIAL_TEACHER_EMAIL || process.env.ADMIN_EMAIL || 'ogretmen@example.com';
  const teacherPassword = process.env.INITIAL_TEACHER_PASSWORD || 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(teacherPassword, 10);

  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {
      password: hashedPassword,
      name: 'Yönetici Öğretmen',
      role: 'HEAD_TEACHER'
    },
    create: {
      email: teacherEmail,
      password: hashedPassword,
      name: 'Yönetici Öğretmen',
      role: 'HEAD_TEACHER',
    },
  });

  console.log('Seed tamamlandı:', { teacher: teacher.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
