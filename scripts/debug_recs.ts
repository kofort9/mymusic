import { loadLibrary } from './library';
import { getCompatibleKeys, filterMatches } from './mixingEngine';
import { CurrentTrack } from './types';

async function debugRecommendations() {
  console.log('=== DEBUG: Recommendation Flow ===\n');

  // Step 1: Load library
  console.log('Step 1: Loading library from Prisma...');
  const library = await loadLibrary();
  console.log(`✓ Loaded ${library.length} tracks from database`);

  if (library.length > 0) {
    console.log('Sample tracks:');
    library.slice(0, 3).forEach(t => {
      console.log(`  - ${t.track_name} by ${t.artist}`);
      console.log(`    Camelot: ${t.camelot_key}, BPM: ${t.bpm}`);
    });
  }

  // Step 2: Create mock current track
  console.log('\nStep 2: Creating mock current track...');
  const mockTrack: CurrentTrack = {
    track_id: 'spotify:track:test',
    track_name: 'Test Track',
    artist: 'Test Artist',
    progress_ms: 10000,
    duration_ms: 200000,
    isPlaying: true,
    timestamp: Date.now(),
    audio_features: {
      tempo: 120,
      key: 0,
      mode: 0,
      time_signature: 4,
    },
    camelot_key: '5A', // C Minor
  };
  console.log(`✓ Mock track: ${mockTrack.track_name}`);
  console.log(`  Camelot: ${mockTrack.camelot_key}, BPM: ${mockTrack.audio_features.tempo}`);

  // Step 3: Get compatible keys
  console.log('\nStep 3: Getting compatible keys...');
  const compatibleKeys = getCompatibleKeys(mockTrack.camelot_key);
  console.log('Compatible keys by shift type:');
  Object.entries(compatibleKeys).forEach(([type, keys]) => {
    console.log(`  ${type}: ${keys.join(', ')}`);
  });

  // Step 4: Filter matches
  console.log('\nStep 4: Filtering matches...');
  const recommendations = filterMatches(mockTrack, library, compatibleKeys);
  console.log(`✓ Found ${recommendations.length} recommendations`);

  if (recommendations.length > 0) {
    console.log('Sample recommendations:');
    recommendations.slice(0, 5).forEach(r => {
      console.log(`  - ${r.track_name} by ${r.artist}`);
      console.log(`    Camelot: ${r.camelot_key}, BPM: ${r.bpm}, Type: ${r.shiftType}`);
    });
  } else {
    console.log('❌ NO RECOMMENDATIONS FOUND');
    console.log('\nDEBUGGING:');

    // Check BPM range
    const minBpm = mockTrack.audio_features.tempo * 0.9;
    const maxBpm = mockTrack.audio_features.tempo * 1.1;
    console.log(`BPM Range: ${minBpm} - ${maxBpm}`);

    const allKeys = Object.values(compatibleKeys).flat();
    const tracksInBpmRange = library.filter(t => t.bpm >= minBpm && t.bpm <= maxBpm);
    console.log(`Tracks in BPM range: ${tracksInBpmRange.length}`);

    const tracksWithMatchingKey = library.filter(t => allKeys.includes(t.camelot_key));
    console.log(`Tracks with matching key: ${tracksWithMatchingKey.length}`);
  }

  console.log('\n=== END DEBUG ===');
}

debugRecommendations()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .then(() => process.exit(0));
