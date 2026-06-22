const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- Kayıtlı Kullanıcılar ---');
  users.forEach(u => {
    console.log(`Role: ${u.role} | Email: ${u.email} | Code: ${u.studentCode} | Name: ${u.name}`);
  });
  console.log('---------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
