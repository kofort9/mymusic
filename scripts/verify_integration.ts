import { loadLibrary } from './library';
import { renderTrainBoard } from './display';
import { CurrentTrack, ShiftType, MatchedTrack } from './types';
import { filterMatches, getCompatibleKeys } from './mixingEngine';

async function verify() {
  console.log('Verifying library loading...');
  let library;
  try {
    library = await loadLibrary();
    console.log(`Library loaded with ${library.length} tracks.`);

    if (library.length === 0) {
      console.error('Library is empty!');
      process.exit(1);
    }
  } catch (e) {
    console.error('Failed to load library:', e);
    process.exit(1);
  }

  console.log('\nVerifying Logic & Display...');
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
      key: 1,
      mode: 1, // 1B (B Major) -> Camelot 1B? No, 1,1 is 3B? Wait, let's check map.
      // 1,1 -> 3B (Db Major).
      // Let's use a known one. 0,0 -> 5A (C Minor).
      time_signature: 4,
      energy: 0.8,
      valence: 0.5,
      danceability: 0.7,
      acousticness: 0.1,
      instrumentalness: 0,
      liveness: 0.2,
      speechiness: 0.05,
    },
    camelot_key: '5A', // C Minor
  };

  // 1. Verify BPM Filtering
  console.log('Test 1: BPM Filtering (±10%)');
  // Mock library with tracks inside and outside range
  // 120 BPM -> Range: 108 - 132
  const mockLibrary = [
    { ...library[0], track_id: 'spotify:track:1', bpm: 120, camelot_key: '5A' }, // Perfect match
    { ...library[0], track_id: 'spotify:track:2', bpm: 130, camelot_key: '5A' }, // Inside upper
    { ...library[0], track_id: 'spotify:track:3', bpm: 110, camelot_key: '5A' }, // Inside lower
    { ...library[0], track_id: 'spotify:track:4', bpm: 135, camelot_key: '5A' }, // Outside upper
    { ...library[0], track_id: 'spotify:track:5', bpm: 100, camelot_key: '5A' }, // Outside lower
  ];

  const compatibleKeys = getCompatibleKeys(mockTrack.camelot_key);
  const recommendations = filterMatches(mockTrack, mockLibrary, compatibleKeys);

  const recIds = recommendations.map(r => r.track_id);
  console.log('Recommendations IDs:', recIds);

  if (recIds.includes('spotify:track:4') || recIds.includes('spotify:track:5')) {
    console.error('FAILED: Tracks outside BPM range were recommended.');
    process.exit(1);
  }
  if (
    !recIds.includes('spotify:track:1') ||
    !recIds.includes('spotify:track:2') ||
    !recIds.includes('spotify:track:3')
  ) {
    console.error('FAILED: Valid tracks were skipped.');
    process.exit(1);
  }
  console.log('PASSED: BPM Filtering correct.');

  // 2. Verify Category Filtering in Display
  console.log('\nTest 2: Category Filtering (Visual Check)');
  // We can't easily assert console output programmatically without capturing stdout,
  // but we can ensure the function runs without error for specific categories.

  const mockRecs: MatchedTrack[] = [
    {
      ...library[0],
      track_id: 'spotify:track:1',
      bpm: 120,
      camelot_key: '5A',
      shiftType: ShiftType.SMOOTH,
    },
    {
      ...library[0],
      track_id: 'spotify:track:2',
      bpm: 120,
      camelot_key: '7A',
      shiftType: ShiftType.ENERGY_UP,
    },
  ];

  try {
    console.log('Rendering ENERGY_UP view...');
    renderTrainBoard(mockTrack, mockRecs, null, false, undefined, [], ShiftType.ENERGY_UP, 0);
    console.log('Rendered successfully.');

    console.log('Rendering ALL view...');
    renderTrainBoard(mockTrack, mockRecs, null, false, undefined, [], 'ALL', 0);
    console.log('Rendered successfully.');
  } catch (e) {
    console.error('Failed to render display:', e);
    process.exit(1);
  }

  console.log('\nVerification successful.');
  process.exit(0);
}

verify();
