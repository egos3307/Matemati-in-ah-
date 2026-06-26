const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const backupPath = path.join(__dirname, 'lessons_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found at:', backupPath);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`Found ${backupData.length} records to restore.`);

  for (const item of backupData) {
    console.log(`Connecting lesson ${item.id} to student ${item.studentId}`);
    try {
      await prisma.lesson.update({
        where: { id: item.id },
        data: {
          students: {
            connect: { id: item.studentId }
          }
        }
      });
      console.log(`Successfully connected lesson ${item.id} to student ${item.studentId}`);
    } catch (e) {
      console.error(`Error connecting lesson ${item.id}:`, e.message);
    }
  }

  console.log('Restoration completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
