const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123', 10);
  
  try {
    await prisma.user.delete({
      where: { email: 'ogretmen@fullematematik.com' }
    });
  } catch (e) {
    // ignore
  }

  const teacher = await prisma.user.upsert({
    where: { email: 'ogretmen@test.com' },
    update: {
      password: hashedPassword,
      name: 'Baş Öğretmen',
      role: 'TEACHER'
    },
    create: {
      email: 'ogretmen@test.com',
      password: hashedPassword,
      name: 'Baş Öğretmen',
      role: 'TEACHER',
    },
  });

  console.log({ teacher });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
