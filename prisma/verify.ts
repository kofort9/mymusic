import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.track.count();
  console.log(`Total tracks in DB: ${count}`);

  if (count === 0) {
    console.error('No tracks found!');
    process.exit(1);
  }

  const sample = await prisma.track.findFirst();
  console.log('Sample track:', sample);

  // Check for Camelot key
  if (!sample?.camelotKey) {
    console.error('Camelot key missing in sample!');
    process.exit(1);
  }

  console.log('Verification successful.');
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
