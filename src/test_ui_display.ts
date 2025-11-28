import { renderTrainBoard } from './display';
import { CurrentTrack } from './types';
import { loadLibrary } from './library';
import { getCompatibleKeys, filterMatches } from './mixingEngine';
import { prisma, disconnectPrisma } from './dbClient';

async function testUIDisplay() {
  console.log('=== Testing UI Display ===\n');

  // Get real track from DB
  const dbTrack = await prisma.track.findFirst();

  if (!dbTrack) {
    console.error('No tracks in database!');
    process.exit(1);
  }

  // Create mock current track with real data from DB
  const mockCurrentTrack: CurrentTrack = {
    track_id: dbTrack.spotifyId,
    track_name: dbTrack.title,
    artist: dbTrack.artist,
    progress_ms: 45000, // 45 seconds in
    duration_ms: 220000, // ~3:40 total
    isPlaying: true,
    timestamp: Date.now(),
    audio_features: {
      tempo: dbTrack.bpm,
      key: dbTrack.key,
      mode: dbTrack.mode,
      time_signature: 4,
      energy: dbTrack.energy || 0.8,
    },
    camelot_key: dbTrack.camelotKey,
  };

  console.log('Loading library for recommendations...');
  const library = await loadLibrary();
  console.log(`Loaded ${library.length} tracks\n`);

  // Get real recommendations
  const compatibleKeys = getCompatibleKeys(mockCurrentTrack.camelot_key);
  const recommendations = filterMatches(mockCurrentTrack, library, compatibleKeys);

  console.log(`Found ${recommendations.length} recommendations\n`);
  console.log('Rendering UI with real data...\n');
  console.log('═'.repeat(80));
  console.log('');

  // Render the actual UI
  renderTrainBoard(
    mockCurrentTrack,
    recommendations,
    null, // No phrase info for this test
    false, // No exit warning
    undefined, // No debug message
    [], // No logs
    'ALL', // Show all categories
    0 // No scroll offset
  );

  console.log('');
  console.log('═'.repeat(80));
  console.log('');
  console.log('✅ UI rendered successfully!');
  console.log('');
  console.log('Verify that:');
  console.log(`  ✓ Track shows: ${mockCurrentTrack.track_name} — ${mockCurrentTrack.artist}`);
  console.log(`  ✓ BPM shows: ${mockCurrentTrack.audio_features.tempo.toFixed(1)} (not 0.0)`);
  console.log(`  ✓ Camelot shows: ${mockCurrentTrack.camelot_key} (not -)`);
  console.log(`  ✓ BPM/Camelot appears on new line below track info`);
  console.log(`  ✓ Recommendations are showing (${recommendations.length} found)`);
  console.log(`  ✓ Status bar shows "w/s: scroll" (not "tab: cycle view")`);

  await disconnectPrisma();
}

testUIDisplay()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .then(() => process.exit(0));
