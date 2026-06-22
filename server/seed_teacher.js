const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('FULLEmatematiği4455.', 10);
  
  const teacher = await prisma.user.upsert({
    where: { email: 'burakcelik@fullematematigi.com.tr' },
    update: {
        password: hashedPassword,
        role: 'TEACHER'
    },
    create: {
      email: 'burakcelik@fullematematigi.com.tr',
      password: hashedPassword,
      name: 'Burak Çelik',
      role: 'TEACHER',
    },
  });

  console.log('Öğretmen hesabı oluşturuldu/güncellendi:', teacher.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
