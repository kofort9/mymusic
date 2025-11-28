import { prisma, disconnectPrisma } from './dbClient';

async function checkTrackFormat() {
  console.log('Checking track ID format in database...\n');

  const sample = await prisma.track.findFirst();

  if (sample) {
    console.log('Sample track from DB:');
    console.log(`  spotifyId: "${sample.spotifyId}"`);
    console.log(`  title: ${sample.title}`);
    console.log(`  artist: ${sample.artist}`);
    console.log(`  BPM: ${sample.bpm}`);
    console.log(`  Camelot: ${sample.camelotKey}`);
    console.log('');

    console.log('ID Format Check:');
    console.log(`  Has "spotify:track:" prefix? ${sample.spotifyId.startsWith('spotify:track:')}`);
    console.log(`  Full ID: ${sample.spotifyId}`);
  }

  await disconnectPrisma();
}

checkTrackFormat()
  .catch(e => console.error(e))
  .then(() => process.exit(0));
