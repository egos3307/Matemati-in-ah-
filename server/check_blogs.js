const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const blogs = await prisma.blogPost.findMany();
  console.log('Blogs in DB:', blogs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
