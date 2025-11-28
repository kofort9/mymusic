import { filterMatches, getCompatibleKeys } from '../src/mixingEngine';
import { CurrentTrack, LibraryTrack, ShiftType } from '../src/types';

describe('Mixing Engine', () => {
  const currentTrack: CurrentTrack = {
    track_id: 'spotify:track:curr1',
    track_name: 'Current Song',
    artist: 'Artist A',
    camelot_key: '8A', // A Minor
    audio_features: { tempo: 128, key: 9, mode: 0 },
    progress_ms: 0,
    duration_ms: 180000, // Added duration_ms
    timestamp: Date.now(),
    isPlaying: true, // Added isPlaying
  };

  const library: LibraryTrack[] = [
    {
      track_id: 'spotify:track:t1',
      track_name: 'Smooth Match',
      artist: 'B',
      camelot_key: '8A',
      bpm: 128,
    },
    {
      track_id: 'spotify:track:t2',
      track_name: 'Smooth Match 2',
      artist: 'C',
      camelot_key: '9A',
      bpm: 128,
    },
    {
      track_id: 'spotify:track:t3',
      track_name: 'Energy Up',
      artist: 'D',
      camelot_key: '10A',
      bpm: 128,
    },
    {
      track_id: 'spotify:track:t4',
      track_name: 'Energy Down',
      artist: 'E',
      camelot_key: '6A',
      bpm: 128,
    },
    {
      track_id: 'spotify:track:t5',
      track_name: 'Mood Switch',
      artist: 'F',
      camelot_key: '8B',
      bpm: 128,
    },
    {
      track_id: 'spotify:track:t6',
      track_name: 'BPM Mismatch',
      artist: 'G',
      camelot_key: '8A',
      bpm: 150,
    },
    {
      track_id: 'spotify:track:t7',
      track_name: 'No Match',
      artist: 'H',
      camelot_key: '1A',
      bpm: 128,
    },
  ];

  describe('getCompatibleKeys', () => {
    test('identifies compatible keys correctly for 8A', () => {
      const keys = getCompatibleKeys('8A');
      expect(keys[ShiftType.SMOOTH]).toContain('8A');
      expect(keys[ShiftType.SMOOTH]).toContain('9A');
      expect(keys[ShiftType.SMOOTH]).toContain('7A');
      expect(keys[ShiftType.ENERGY_UP]).toContain('10A');
      expect(keys[ShiftType.MOOD_SWITCH]).toContain('8B');
    });

    test('handles wrap-around for key 1 (wraps to 12)', () => {
      const keys = getCompatibleKeys('1A');
      // Smooth: 1A, 12A (1-1), 2A (1+1)
      expect(keys[ShiftType.SMOOTH]).toContain('1A');
      expect(keys[ShiftType.SMOOTH]).toContain('12A');
      expect(keys[ShiftType.SMOOTH]).toContain('2A');
      // Energy Down: 11A (1-2 wraps to 11)
      expect(keys[ShiftType.ENERGY_DOWN]).toContain('11A');
    });

    test('handles wrap-around for key 12 (wraps to 1)', () => {
      const keys = getCompatibleKeys('12A');
      // Smooth: 12A, 11A (12-1), 1A (12+1 wraps to 1)
      expect(keys[ShiftType.SMOOTH]).toContain('12A');
      expect(keys[ShiftType.SMOOTH]).toContain('11A');
      expect(keys[ShiftType.SMOOTH]).toContain('1A');
      // Energy Up: 2A (12+2 wraps to 2)
      expect(keys[ShiftType.ENERGY_UP]).toContain('2A');
    });

    test('handles wrap-around for key 2 (Energy Down wraps to 12)', () => {
      const keys = getCompatibleKeys('2A');
      // Energy Down: 12A (2-2 wraps to 12)
      expect(keys[ShiftType.ENERGY_DOWN]).toContain('12A');
    });

    test('handles wrap-around for key 11 (Energy Up wraps to 1)', () => {
      const keys = getCompatibleKeys('11A');
      // Energy Up: 1A (11+2 wraps to 1)
      expect(keys[ShiftType.ENERGY_UP]).toContain('1A');
    });

    test('handles Rhythmic Breaker wrap-around', () => {
      const keys = getCompatibleKeys('8A');
      // 8 + 7 = 15, wraps to 3
      expect(keys[ShiftType.RHYTHMIC_BREAKER]).toContain('3A');
    });

    test('handles Major keys (B)', () => {
      const keys = getCompatibleKeys('5B');
      expect(keys[ShiftType.SMOOTH]).toContain('5B');
      expect(keys[ShiftType.SMOOTH]).toContain('4B');
      expect(keys[ShiftType.SMOOTH]).toContain('6B');
      expect(keys[ShiftType.MOOD_SWITCH]).toContain('5A');
      expect(keys[ShiftType.ENERGY_UP]).toContain('7B');
      expect(keys[ShiftType.ENERGY_DOWN]).toContain('3B');
    });

    test('throws error for invalid Camelot code', () => {
      expect(() => getCompatibleKeys('invalid')).toThrow('Invalid Camelot code: invalid');
      expect(() => getCompatibleKeys('13A')).toThrow('Invalid Camelot code: 13A');
      expect(() => getCompatibleKeys('8C')).toThrow('Invalid Camelot code: 8C');
      expect(() => getCompatibleKeys('')).toThrow('Invalid Camelot code:');
      expect(() => getCompatibleKeys('A')).toThrow('Invalid Camelot code: A');
    });

    test('includes all shift types', () => {
      const keys = getCompatibleKeys('8A');
      expect(keys).toHaveProperty(ShiftType.SMOOTH);
      expect(keys).toHaveProperty(ShiftType.MOOD_SWITCH);
      expect(keys).toHaveProperty(ShiftType.ENERGY_UP);
      expect(keys).toHaveProperty(ShiftType.ENERGY_DOWN);
      expect(keys).toHaveProperty(ShiftType.RHYTHMIC_BREAKER);
    });
  });

  describe('filterMatches', () => {
    test('filters library tracks correctly', () => {
      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const matches = filterMatches(currentTrack, library, keys);

      // Expected matches: t1 (8A), t2 (9A), t3 (10A), t4 (6A), t5 (8B)
      const matchIds = matches.map(m => m.track_id);
      expect(matchIds).toContain('spotify:track:t1');
      expect(matchIds).toContain('spotify:track:t2');
      expect(matchIds).toContain('spotify:track:t3');
      expect(matchIds).toContain('spotify:track:t4');
      expect(matchIds).toContain('spotify:track:t5');
      expect(matchIds).not.toContain('spotify:track:t6');
      expect(matchIds).not.toContain('spotify:track:t7');
    });

    test('annotates shift type correctly', () => {
      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const matches = filterMatches(currentTrack, library, keys);

      const energyUp = matches.find(m => m.track_id === 'spotify:track:t3');
      expect(energyUp?.shiftType).toBe(ShiftType.ENERGY_UP);

      const moodSwitch = matches.find(m => m.track_id === 'spotify:track:t5');
      expect(moodSwitch?.shiftType).toBe(ShiftType.MOOD_SWITCH);
    });

    test('excludes same track', () => {
      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const libraryWithCurrent: LibraryTrack[] = [
        ...library,
        {
          track_id: 'spotify:track:curr1',
          track_name: 'Current Song',
          artist: 'Artist A',
          camelot_key: '8A',
          bpm: 128,
        },
      ];

      const matches = filterMatches(currentTrack, libraryWithCurrent, keys);
      const matchIds = matches.map(m => m.track_id);
      expect(matchIds).not.toContain('spotify:track:curr1');
    });

    test('handles zero BPM (should not filter by BPM)', () => {
      const zeroBpmTrack: CurrentTrack = {
        ...currentTrack,
        audio_features: { tempo: 0, key: 9, mode: 0 },
      };

      const libraryWithVariousBpm: LibraryTrack[] = [
        {
          track_id: 'spotify:track:t1',
          track_name: 'Track 1',
          artist: 'A',
          camelot_key: '8A',
          bpm: 60,
        },
        {
          track_id: 'spotify:track:t2',
          track_name: 'Track 2',
          artist: 'B',
          camelot_key: '8A',
          bpm: 200,
        },
        {
          track_id: 'spotify:track:t3',
          track_name: 'Track 3',
          artist: 'C',
          camelot_key: '1A',
          bpm: 128,
        },
      ];

      const keys = getCompatibleKeys(zeroBpmTrack.camelot_key);
      const matches = filterMatches(zeroBpmTrack, libraryWithVariousBpm, keys);

      // Should match by key only, regardless of BPM
      const matchIds = matches.map(m => m.track_id);
      expect(matchIds).toContain('spotify:track:t1');
      expect(matchIds).toContain('spotify:track:t2');
      expect(matchIds).not.toContain('spotify:track:t3'); // Wrong key
    });

    test('handles negative BPM (should not filter by BPM)', () => {
      const negativeBpmTrack: CurrentTrack = {
        ...currentTrack,
        audio_features: { tempo: -10, key: 9, mode: 0 },
      };

      const libraryWithVariousBpm: LibraryTrack[] = [
        {
          track_id: 'spotify:track:t1',
          track_name: 'Track 1',
          artist: 'A',
          camelot_key: '8A',
          bpm: 60,
        },
        {
          track_id: 'spotify:track:t2',
          track_name: 'Track 2',
          artist: 'B',
          camelot_key: '8A',
          bpm: 200,
        },
      ];

      const keys = getCompatibleKeys(negativeBpmTrack.camelot_key);
      const matches = filterMatches(negativeBpmTrack, libraryWithVariousBpm, keys);

      // Should match by key only, regardless of BPM
      const matchIds = matches.map(m => m.track_id);
      expect(matchIds).toContain('spotify:track:t1');
      expect(matchIds).toContain('spotify:track:t2');
    });

    test('filters BPM within ±10% range', () => {
      const track128Bpm: CurrentTrack = {
        ...currentTrack,
        audio_features: { tempo: 128, key: 9, mode: 0 },
      };

      const libraryWithBpmRange: LibraryTrack[] = [
        {
          track_id: 'spotify:track:t1',
          track_name: 'Track 1',
          artist: 'A',
          camelot_key: '8A',
          bpm: 115.2,
        }, // 90% of 128
        {
          track_id: 'spotify:track:t2',
          track_name: 'Track 2',
          artist: 'B',
          camelot_key: '8A',
          bpm: 115.1,
        }, // Just below 90%
        {
          track_id: 'spotify:track:t3',
          track_name: 'Track 3',
          artist: 'C',
          camelot_key: '8A',
          bpm: 140.8,
        }, // 110% of 128
        {
          track_id: 'spotify:track:t4',
          track_name: 'Track 4',
          artist: 'D',
          camelot_key: '8A',
          bpm: 140.9,
        }, // Just above 110%
        {
          track_id: 'spotify:track:t5',
          track_name: 'Track 5',
          artist: 'E',
          camelot_key: '8A',
          bpm: 128,
        }, // Exact match
      ];

      const keys = getCompatibleKeys(track128Bpm.camelot_key);
      const matches = filterMatches(track128Bpm, libraryWithBpmRange, keys);

      const matchIds = matches.map(m => m.track_id);
      expect(matchIds).toContain('spotify:track:t1'); // Within range
      expect(matchIds).not.toContain('spotify:track:t2'); // Below range
      expect(matchIds).toContain('spotify:track:t3'); // Within range
      expect(matchIds).not.toContain('spotify:track:t4'); // Above range
      expect(matchIds).toContain('spotify:track:t5'); // Exact match
    });

    test('handles empty library', () => {
      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const matches = filterMatches(currentTrack, [], keys);
      expect(matches).toEqual([]);
    });

    test('handles library with no compatible keys', () => {
      const libraryNoMatch: LibraryTrack[] = [
        {
          track_id: 'spotify:track:t1',
          track_name: 'Track 1',
          artist: 'A',
          camelot_key: '1A',
          bpm: 128,
        },
        {
          track_id: 'spotify:track:t2',
          track_name: 'Track 2',
          artist: 'B',
          camelot_key: '2A',
          bpm: 128,
        },
      ];

      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const matches = filterMatches(currentTrack, libraryNoMatch, keys);
      expect(matches).toEqual([]);
    });

    test('prioritizes first matching shift type', () => {
      // Create a track that matches multiple shift types
      // Since we iterate through compatibleKeys in order, it should get the first match
      const libraryMultiMatch: LibraryTrack[] = [
        {
          track_id: 'spotify:track:t1',
          track_name: 'Track 1',
          artist: 'A',
          camelot_key: '8A',
          bpm: 128,
        }, // Matches SMOOTH
      ];

      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const matches = filterMatches(currentTrack, libraryMultiMatch, keys);

      expect(matches.length).toBe(1);
      // Should be SMOOTH since it's checked first
      expect(matches[0].shiftType).toBe(ShiftType.SMOOTH);
    });

    test('includes non-harmonic tracks when skipHarmonicFilter is true', () => {
      const incompatible: LibraryTrack[] = [
        {
          track_id: 'spotify:track:xx',
          track_name: 'Off-key',
          artist: 'Artist',
          camelot_key: '1A',
          bpm: 128,
        },
      ];

      const keys = getCompatibleKeys(currentTrack.camelot_key);
      const matches = filterMatches(currentTrack, incompatible, keys, true);

      expect(matches).toHaveLength(1);
      expect(matches[0].shiftType).toBe(ShiftType.RHYTHMIC_BREAKER);
    });
  });
});
