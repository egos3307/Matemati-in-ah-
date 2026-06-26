const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: {
      studentId: { not: null }
    },
    select: {
      id: true,
      studentId: true
    }
  });

  const backupPath = path.join(__dirname, 'lessons_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(lessons, null, 2));
  console.log(`Successfully backed up ${lessons.length} lessons with student relationships to ${backupPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
