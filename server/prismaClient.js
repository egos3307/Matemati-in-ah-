const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });
};

const prisma = global.prisma || prismaClientSingleton();

if (!global.prisma) {
  global.prisma = prisma;
}

module.exports = prisma;
