import { getAudioFeatures, resetAudioProcessor } from './audioProcessor';
import { convertToCamelot } from './camelot';
import { prisma, disconnectPrisma } from './dbClient';

async function testCurrentTrackFlow() {
  console.log('=== Testing Current Track Display Flow ===\n');

  // Step 1: Get a real track from DB
  console.log('Step 1: Fetching a sample track from database...');
  const dbTrack = await prisma.track.findFirst();

  if (!dbTrack) {
    console.error('❌ No tracks in database!');
    process.exit(1);
  }

  console.log(`✓ Found track: ${dbTrack.title} by ${dbTrack.artist}`);
  console.log(`  spotifyId: ${dbTrack.spotifyId}`);
  console.log(`  BPM: ${dbTrack.bpm}`);
  console.log(`  Camelot: ${dbTrack.camelotKey}`);
  console.log('');

  // Step 2: Test with the full URI format (as spotifyClient now returns)
  console.log('Step 2: Testing getAudioFeatures with full URI...');
  resetAudioProcessor(); // Fresh start

  const trackId = dbTrack.spotifyId; // This is already in spotify:track:ID format
  console.log(`  Calling getAudioFeatures("${trackId}")`);

  const features = await getAudioFeatures(trackId, dbTrack.title, dbTrack.artist);

  if (!features) {
    console.error('❌ Failed to get audio features!');
    console.error('This means the database provider is not finding the track.');
    process.exit(1);
  }

  console.log('✓ Got audio features:');
  console.log(`  tempo (BPM): ${features.tempo}`);
  console.log(`  key: ${features.key}`);
  console.log(`  mode: ${features.mode}`);
  console.log('');

  // Step 3: Validate values match database
  console.log('Step 3: Validating values match database...');

  const bpmMatch = Math.abs(features.tempo - dbTrack.bpm) < 0.01;
  const keyMatch = features.key === dbTrack.key;
  const modeMatch = features.mode === dbTrack.mode;

  console.log(
    `  BPM matches: ${bpmMatch ? '✓' : '❌'} (DB: ${dbTrack.bpm}, Got: ${features.tempo})`
  );
  console.log(`  Key matches: ${keyMatch ? '✓' : '❌'} (DB: ${dbTrack.key}, Got: ${features.key})`);
  console.log(
    `  Mode matches: ${modeMatch ? '✓' : '❌'} (DB: ${dbTrack.mode}, Got: ${features.mode})`
  );
  console.log('');

  if (!bpmMatch || !keyMatch || !modeMatch) {
    console.error('❌ Values do not match database!');
    process.exit(1);
  }

  // Step 4: Test Camelot conversion
  console.log('Step 4: Testing Camelot conversion...');
  const camelotKey = convertToCamelot(features.key, features.mode);
  const camelotMatch = camelotKey === dbTrack.camelotKey;

  console.log(
    `  Camelot matches: ${camelotMatch ? '✓' : '❌'} (DB: ${dbTrack.camelotKey}, Got: ${camelotKey})`
  );
  console.log('');

  if (!camelotMatch) {
    console.error('❌ Camelot key does not match!');
    process.exit(1);
  }

  // Step 5: Simulate display formatting
  console.log('Step 5: Testing display formatting...');
  const bpmVal = features.tempo.toFixed(1);
  const displayStr = `BPM: ${bpmVal}  •  Camelot: ${camelotKey}`;

  console.log(`  Display string: "${displayStr}"`);
  console.log('');

  // Verify no default values
  if (bpmVal === '0.0' || camelotKey === '-') {
    console.error('❌ Display shows default values!');
    console.error('  BPM should not be 0.0');
    console.error('  Camelot should not be -');
    process.exit(1);
  }

  console.log('✅ All tests passed!');
  console.log('');
  console.log('Summary:');
  console.log(`  ✓ Database provider fetches track with URI format`);
  console.log(`  ✓ BPM, Key, Mode match database`);
  console.log(`  ✓ Camelot conversion correct`);
  console.log(`  ✓ Display formatting correct`);
  console.log(`  ✓ No default values (0.0 or -) shown`);
  console.log('');
  console.log('The current track should now display:');
  console.log(`  ${dbTrack.title} — ${dbTrack.artist}`);
  console.log(`  ${displayStr}`);

  await disconnectPrisma();
}

testCurrentTrackFlow()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .then(() => process.exit(0));
