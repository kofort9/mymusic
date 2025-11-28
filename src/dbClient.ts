import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err) {
    // Swallow disconnect errors to avoid masking process exit
    // eslint-disable-next-line no-console
    console.error('[Prisma] disconnect failed', err);
  }
}

export { prisma, disconnectPrisma };
