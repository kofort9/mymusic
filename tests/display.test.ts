import { PhraseCounter, renderTrainBoard } from '../src/display';
import { CurrentTrack, MatchedTrack, ShiftType } from '../src/types';

// Mock package.json for version info
jest.mock(
  '../package.json',
  () => ({
    version: '2.0.54',
  }),
  { virtual: true }
);

// Mock camelotColors
jest.mock('../src/camelotColors', () => ({
  getCamelotColor: jest.fn((code: string) => '#FFFFFF'),
}));

// Declare spy variables
let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;
let stdoutWriteSpy: jest.SpyInstance;

describe('Display', () => {
  beforeEach(() => {
    // Set up mocks before each test
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Mock process.stdout.columns and rows
    Object.defineProperty(process.stdout, 'columns', {
      writable: true,
      value: 80,
    });
    Object.defineProperty(process.stdout, 'rows', {
      writable: true,
      value: 24,
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('PhraseCounter', () => {
    test('calculates phrase info correctly for 128 BPM', () => {
      const counter = new PhraseCounter();
      const bpm = 128;
      const progressMs = 0;
      const timestamp = Date.now();

      jest.setSystemTime(timestamp);

      const result = counter.calculate(bpm, progressMs, timestamp);

      expect(result.beatsRemaining).toBeCloseTo(32, 1);
      expect(result.phraseCount).toBe(1);
      expect(result.timeRemainingSeconds).toBeGreaterThan(0);
    });

    test('calculates beats remaining correctly', () => {
      const counter = new PhraseCounter();
      const bpm = 128;
      const beatDurationMs = 60000 / bpm; // ~468.75ms per beat
      const progressMs = beatDurationMs * 16; // 16 beats = halfway through phrase
      const timestamp = Date.now();

      jest.setSystemTime(timestamp);

      const result = counter.calculate(bpm, progressMs, timestamp);

      expect(result.beatsRemaining).toBeCloseTo(16, 1);
      expect(result.phraseCount).toBeGreaterThanOrEqual(1);
    });

    test('handles zero BPM gracefully', () => {
      const counter = new PhraseCounter();
      const result = counter.calculate(0, 0, Date.now());

      expect(result.beatsRemaining).toBe(32);
      expect(result.timeRemainingSeconds).toBe(0);
      expect(result.phraseCount).toBe(1);
    });

    test('handles negative BPM gracefully', () => {
      const counter = new PhraseCounter();
      const result = counter.calculate(-10, 0, Date.now());

      expect(result.beatsRemaining).toBe(32);
      expect(result.timeRemainingSeconds).toBe(0);
      expect(result.phraseCount).toBe(1);
    });

    test('freezes progress when not playing', () => {
      const counter = new PhraseCounter();
      const now = Date.now();
      jest.setSystemTime(now);

      const playing = counter.calculate(120, 1000, now, 4, true);
      jest.advanceTimersByTime(1000);
      const paused = counter.calculate(120, 1000, now, 4, false);

      expect(paused.beatsRemaining).toBeCloseTo(playing.beatsRemaining, 5);
    });

    test('accounts for elapsed time since timestamp', () => {
      const counter = new PhraseCounter();
      const bpm = 128;
      const progressMs = 0;
      const timestamp = Date.now() - 1000; // 1 second ago

      jest.setSystemTime(Date.now());

      const result = counter.calculate(bpm, progressMs, timestamp);

      // Should account for ~2 beats that elapsed (128 BPM = ~2 beats per second)
      expect(result.beatsRemaining).toBeLessThan(32);
    });

    test('handles invalid timestamp (zero or negative)', () => {
      const counter = new PhraseCounter();
      const bpm = 128;
      const progressMs = 0;
      const now = Date.now();

      jest.setSystemTime(now);

      const result = counter.calculate(bpm, progressMs, 0);

      // Should use current time instead
      expect(result.beatsRemaining).toBeCloseTo(32, 1);
    });

    test('calculates phrase count correctly', () => {
      const counter = new PhraseCounter();
      const bpm = 128;
      const beatDurationMs = 60000 / bpm;
      // 64 beats = 2 full phrases
      const progressMs = beatDurationMs * 64;
      const timestamp = Date.now();

      jest.setSystemTime(timestamp);

      const result = counter.calculate(bpm, progressMs, timestamp);

      // Should be at start of a new phrase (phraseCount = 1)
      expect(result.phraseCount).toBeGreaterThanOrEqual(1);
    });

    test('handles very high BPM', () => {
      const counter = new PhraseCounter();
      const result = counter.calculate(200, 0, Date.now());

      expect(result.beatsRemaining).toBeLessThanOrEqual(32);
      expect(result.timeRemainingSeconds).toBeGreaterThan(0);
    });

    test('handles very low BPM', () => {
      const counter = new PhraseCounter();
      const result = counter.calculate(60, 0, Date.now());

      expect(result.beatsRemaining).toBeLessThanOrEqual(32);
      expect(result.timeRemainingSeconds).toBeGreaterThan(0);
    });
  });

  describe('Progress Bar Logic', () => {
    // Helper function from original test
    function generateProgressBar(progressMs: number, durationMs: number): string {
      if (durationMs <= 0) return '▱'.repeat(10);

      const percent = Math.min(1, Math.max(0, progressMs / durationMs));
      const barLength = 10;
      const fillCount = Math.round(percent * barLength);
      const emptyCount = barLength - fillCount;

      return '▰'.repeat(fillCount) + '▱'.repeat(emptyCount);
    }

    test('0% progress should be empty', () => {
      expect(generateProgressBar(0, 1000)).toBe('▱▱▱▱▱▱▱▱▱▱');
    });

    test('100% progress should be full', () => {
      expect(generateProgressBar(1000, 1000)).toBe('▰▰▰▰▰▰▰▰▰▰');
    });

    test('50% progress should be half full', () => {
      expect(generateProgressBar(500, 1000)).toBe('▰▰▰▰▰▱▱▱▱▱');
    });

    test('Rounding logic (e.g., 14% -> 1 block)', () => {
      expect(generateProgressBar(140, 1000)).toBe('▰▱▱▱▱▱▱▱▱▱');
    });

    test('Rounding logic (e.g., 16% -> 2 blocks)', () => {
      expect(generateProgressBar(160, 1000)).toBe('▰▰▱▱▱▱▱▱▱▱');
    });

    test('handles zero duration', () => {
      expect(generateProgressBar(100, 0)).toBe('▱▱▱▱▱▱▱▱▱▱');
    });

    test('handles progress exceeding duration', () => {
      expect(generateProgressBar(2000, 1000)).toBe('▰▰▰▰▰▰▰▰▰▰');
    });

    test('handles negative progress', () => {
      expect(generateProgressBar(-100, 1000)).toBe('▱▱▱▱▱▱▱▱▱▱');
    });

    test('progress bar accurately maps to duration at key percentages', () => {
      const duration = 10000; // 10 seconds

      // 0% should be empty
      expect(generateProgressBar(0, duration)).toBe('▱▱▱▱▱▱▱▱▱▱');

      // 10% should be 1 block (10% of 10 = 1)
      expect(generateProgressBar(1000, duration)).toBe('▰▱▱▱▱▱▱▱▱▱');

      // 50% should be 5 blocks
      expect(generateProgressBar(5000, duration)).toBe('▰▰▰▰▰▱▱▱▱▱');

      // 90% should be 9 blocks
      expect(generateProgressBar(9000, duration)).toBe('▰▰▰▰▰▰▰▰▰▱');

      // 100% should be full
      expect(generateProgressBar(10000, duration)).toBe('▰▰▰▰▰▰▰▰▰▰');

      // Over 100% should still be full (clamped)
      expect(generateProgressBar(15000, duration)).toBe('▰▰▰▰▰▰▰▰▰▰');
    });

    test('progress bar handles edge cases accurately', () => {
      // Very small duration
      expect(generateProgressBar(1, 10)).toBe('▰▱▱▱▱▱▱▱▱▱');

      // Progress exactly at boundaries
      expect(generateProgressBar(0, 1000)).toBe('▱▱▱▱▱▱▱▱▱▱');
      expect(generateProgressBar(1000, 1000)).toBe('▰▰▰▰▰▰▰▰▰▰');

      // Very large duration
      expect(generateProgressBar(500000, 1000000)).toBe('▰▰▰▰▰▱▱▱▱▱');
    });
  });

  describe('renderTrainBoard progress timing', () => {
    test('progress bar reflects elapsed time when playing', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Test Track',
        artist: 'Artist',
        camelot_key: '8A',
        audio_features: { tempo: 120, key: 0, mode: 1 },
        progress_ms: 1000,
        duration_ms: 5000,
        timestamp: now,
        isPlaying: true,
      };

      // Capture console output to inspect bar fill length
      renderTrainBoard(currentTrack, [], null, false);
      const firstOutput = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .join('\n');

      jest.advanceTimersByTime(1000); // simulate 1s of playback
      renderTrainBoard(currentTrack, [], null, false);
      const secondOutput = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .join('\n');

      const barRegex = /[▰▱]+/g;
      const bars1 = firstOutput.match(barRegex);
      const bars2 = secondOutput.match(barRegex);

      const fill1 = bars1?.[0].match(/▰/g)?.length || 0;
      const fill2 = bars2?.[0].match(/▰/g)?.length || 0;

      expect(fill1).toBeGreaterThan(0);
      expect(fill2).toBeGreaterThan(0);
      // After 1s, the filled portion should increase or stay same by 1 rounding; allow >= for coarse rounding
      expect(fill2).toBeGreaterThanOrEqual(fill1);
      expect(fill2).toBeGreaterThan(fill1 - 1); // ensure not regressing significantly
    });

    test('progress bar does not advance when paused', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Paused Track',
        artist: 'Artist',
        camelot_key: '8A',
        audio_features: { tempo: 120, key: 0, mode: 1 },
        progress_ms: 2000,
        duration_ms: 6000,
        timestamp: now,
        isPlaying: false,
      };

      renderTrainBoard(currentTrack, [], null, false);
      const firstOutput = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .join('\n');

      jest.advanceTimersByTime(1000); // simulate time passing while paused
      renderTrainBoard(currentTrack, [], null, false);
      const secondOutput = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .join('\n');

      const barRegex = /[▰▱]+/g;
      const bars1 = firstOutput.match(barRegex);
      const bars2 = secondOutput.match(barRegex);

      expect(bars2?.[0].match(/▰/g)?.length || 0).toBe(bars1?.[0].match(/▰/g)?.length || 0);
    });
  });

  describe('renderTrainBoard', () => {
    test('renders waiting message when no track is playing', () => {
      Object.defineProperty(process.stdout, 'columns', { writable: true, value: 80 });
      renderTrainBoard(null, [], null, false);

      expect(stdoutWriteSpy).toHaveBeenCalled();
      // console.log is used for content output, process.stdout.write for screen control
      const calls = consoleLogSpy.mock.calls;
      const hasWaitingMessage = calls.some(
        call => call[0] && call[0].toString().includes('Waiting for playback')
      );
      expect(hasWaitingMessage).toBe(true);
    });

    test('renders track information when track is playing', () => {
      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      renderTrainBoard(currentTrack, [], null, false);

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls;
      const hasTrackName = calls.some(call => call[0] && call[0].toString().includes('Test Track'));
      expect(hasTrackName).toBe(true);
    });

    test('renders recommendations when available', () => {
      const recommendations: MatchedTrack[] = [
        {
          track_id: 'spotify:track:rec1',
          track_name: 'Recommendation 1',
          artist: 'Artist 1',
          camelot_key: '9A',
          bpm: 128,
          shiftType: ShiftType.SMOOTH,
        },
        {
          track_id: 'spotify:track:rec2',
          track_name: 'Recommendation 2',
          artist: 'Artist 2',
          camelot_key: '10A',
          bpm: 130,
          shiftType: ShiftType.ENERGY_UP,
        },
      ];

      renderTrainBoard(null, recommendations, null, false);

      const calls = consoleLogSpy.mock.calls;
      const hasRecommendations = calls.some(
        call => call[0] && call[0].toString().includes('Recommendations')
      );
      expect(hasRecommendations).toBe(true);
    });

    test('renders phrase info when provided', () => {
      const phraseInfo = {
        beatsRemaining: 16,
        timeRemainingSeconds: 7.5,
        phraseCount: 2,
      };

      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      renderTrainBoard(currentTrack, [], phraseInfo, false);

      const calls = consoleLogSpy.mock.calls;
      const hasPhraseInfo = calls.some(
        call => call[0] && call[0].toString().includes('Phrase Matching')
      );
      expect(hasPhraseInfo).toBe(true);
    });

    test('shows non-4/4 warning when phrase info is zero beats', () => {
      const phraseInfo = { beatsRemaining: 0, timeRemainingSeconds: 0, phraseCount: 0 };
      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0, time_signature: 3 },
        progress_ms: 0,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      renderTrainBoard(currentTrack, [], phraseInfo, false);

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Non-4/4 time signature detected (3/4)');
    });

    test('renders debug message when provided', () => {
      renderTrainBoard(null, [], null, false, 'Test debug message');

      const calls = consoleLogSpy.mock.calls;
      const hasDebugMessage = calls.some(
        call => call[0] && call[0].toString().includes('DEBUG: Test debug message')
      );
      expect(hasDebugMessage).toBe(true);
    });

    test('shows exit warning when requested', () => {
      renderTrainBoard(null, [], null, true);
      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Press Ctrl-C again to exit');
    });

    test('renders debug logs when provided', () => {
      const logs = ['Log 1', 'Log 2', 'Log 3'];
      renderTrainBoard(null, [], null, false, undefined, logs);

      const calls = consoleLogSpy.mock.calls;
      const hasDebugLogs = calls.some(call => call[0] && call[0].toString().includes('DEBUG LOGS'));
      expect(hasDebugLogs).toBe(true);
    });

    test('groups recommendations by shift type', () => {
      const recommendations: MatchedTrack[] = [
        {
          track_id: 'spotify:track:rec1',
          track_name: 'Smooth Track',
          artist: 'Artist 1',
          camelot_key: '8A',
          bpm: 128,
          shiftType: ShiftType.SMOOTH,
        },
        {
          track_id: 'spotify:track:rec2',
          track_name: 'Energy Track',
          artist: 'Artist 2',
          camelot_key: '10A',
          bpm: 130,
          shiftType: ShiftType.ENERGY_UP,
        },
      ];

      renderTrainBoard(null, recommendations, null, false);

      const calls = consoleLogSpy.mock.calls;
      const output = calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Smooth');
      expect(output).toContain('Energy Up');
    });

    test('filters recommendations by selected category and scroll offset', () => {
      const recs: MatchedTrack[] = [];
      for (let i = 0; i < 12; i++) {
        recs.push({
          track_id: `spotify:track:rec${i}`,
          track_name: `Rec ${i}`,
          artist: 'Artist',
          camelot_key: '8A',
          bpm: 120,
          shiftType: i % 2 === 0 ? ShiftType.SMOOTH : ShiftType.ENERGY_UP,
        });
      }

      renderTrainBoard(
        {
          track_id: 'spotify:track:t1',
          track_name: 'Now',
          artist: 'Artist',
          camelot_key: '8A',
          audio_features: { tempo: 120, key: 0, mode: 1 },
          progress_ms: 0,
          duration_ms: 1000,
          timestamp: Date.now(),
          isPlaying: true,
        },
        recs,
        null,
        false,
        undefined,
        [],
        ShiftType.ENERGY_UP,
        5
      );

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Energy Up');
      expect(output).not.toContain('Rec 0'); // smooth tracks should be filtered out of rendered list
    });

    test('clamps negative scroll offset to valid range', () => {
      const recs: MatchedTrack[] = [
        {
          track_id: 'spotify:track:rec1',
          track_name: 'Rec 1',
          artist: 'A',
          camelot_key: '8A',
          bpm: 120,
          shiftType: ShiftType.SMOOTH,
        },
      ];

      renderTrainBoard(
        {
          track_id: 'spotify:track:t1',
          track_name: 'Now',
          artist: 'Artist',
          camelot_key: '8A',
          audio_features: { tempo: 120, key: 0, mode: 1 },
          progress_ms: 0,
          duration_ms: 1000,
          timestamp: Date.now(),
          isPlaying: true,
        },
        recs,
        null,
        false,
        undefined,
        [],
        'ALL',
        -10
      );

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Rec 1'); // still renders despite negative scroll
    });

    test('clamps oversized scroll offset to end of list', () => {
      const recs: MatchedTrack[] = [];
      for (let i = 0; i < 6; i++) {
        recs.push({
          track_id: `spotify:track:rec${i}`,
          track_name: `Rec ${i}`,
          artist: 'Artist',
          camelot_key: '8A',
          bpm: 120,
          shiftType: ShiftType.SMOOTH,
        });
      }

      renderTrainBoard(
        {
          track_id: 'spotify:track:t1',
          track_name: 'Now',
          artist: 'Artist',
          camelot_key: '8A',
          audio_features: { tempo: 120, key: 0, mode: 1 },
          progress_ms: 0,
          duration_ms: 1000,
          timestamp: Date.now(),
          isPlaying: true,
        },
        recs,
        null,
        false,
        undefined,
        [],
        'ALL',
        999
      );

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Rec 5');
    });

    test('handles long track names with truncation', () => {
      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'A'.repeat(100),
        artist: 'B'.repeat(100),
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      // Mock narrower terminal
      Object.defineProperty(process.stdout, 'columns', {
        writable: true,
        value: 70,
      });

      renderTrainBoard(currentTrack, [], null, false);

      // Should not throw and should handle truncation
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles very wide terminal without exceeding max width', () => {
      Object.defineProperty(process.stdout, 'columns', { writable: true, value: 200 });
      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Wide Track',
        artist: 'Artist',
        camelot_key: '8A',
        audio_features: { tempo: 120, key: 0, mode: 1 },
        progress_ms: 0,
        duration_ms: 100000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      renderTrainBoard(currentTrack, [], null, false);
      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).not.toContain('Terminal too narrow');
    });

    test('handles missing camelot key', () => {
      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      renderTrainBoard(currentTrack, [], null, false);

      const calls = consoleLogSpy.mock.calls;
      const output = calls.map(call => call[0]?.toString() || '').join('\n');
      // Strip ANSI codes for comparison and check for Camelot label with missing key
      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
      expect(cleanOutput).toMatch(/Camelot:\s+-/);
    });

    test('clamps negative scrollOffset to 0', () => {
      const recs: MatchedTrack[] = Array.from({ length: 5 }, (_, i) => ({
        track_id: `spotify:track:rec${i}`,
        track_name: `Rec ${i}`,
        artist: 'Artist',
        camelot_key: '8A',
        bpm: 120,
        shiftType: ShiftType.SMOOTH,
      }));

      renderTrainBoard(null, recs, null, false, undefined, [], 'ALL', -10);

      // Should render from scrollOffset 0 (clamped), so first track should be visible
      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Rec 0');
    });

    test('renders slow ripple accent when track is active', () => {
      jest.setSystemTime(new Date(0));

      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Ripple Track',
        artist: 'Artist',
        camelot_key: '8A',
        audio_features: { tempo: 120, key: 0, mode: 1 },
        progress_ms: 0,
        duration_ms: 1000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      renderTrainBoard(currentTrack, [], null, false);

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('▒');
    });

    test('ripple remains idle when no track is playing', () => {
      jest.setSystemTime(new Date(0));

      renderTrainBoard(null, [], null, false);

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).not.toContain('▒');
    });

    test('phrase scanline animates when above warning threshold', () => {
      jest.setSystemTime(new Date(0));

      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Scan Track',
        artist: 'Artist',
        camelot_key: '8A',
        audio_features: { tempo: 120, key: 0, mode: 1, time_signature: 4 },
        progress_ms: 0,
        duration_ms: 1000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      const phraseInfo = { beatsRemaining: 20, timeRemainingSeconds: 10, phraseCount: 1 };

      renderTrainBoard(currentTrack, [], phraseInfo, false);
      const firstBar = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .find(line => line.includes('█'));

      jest.advanceTimersByTime(300);
      renderTrainBoard(currentTrack, [], phraseInfo, false);
      const secondBar = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .filter(line => line.includes('█'))
        .pop();

      expect(firstBar).toBeDefined();
      expect(secondBar).toBeDefined();
      expect(firstBar).not.toBe(secondBar);
      expect(secondBar).toContain('\x1b[48;2');
    });

    test('phrase scanline freezes near final cue', () => {
      jest.setSystemTime(new Date(0));

      const currentTrack: CurrentTrack = {
        track_id: 'spotify:track:track1',
        track_name: 'Warning Track',
        artist: 'Artist',
        camelot_key: '8A',
        audio_features: { tempo: 120, key: 0, mode: 1, time_signature: 4 },
        progress_ms: 0,
        duration_ms: 1000,
        timestamp: Date.now(),
        isPlaying: true,
      };

      const phraseInfo = { beatsRemaining: 4, timeRemainingSeconds: 2, phraseCount: 1 };

      renderTrainBoard(currentTrack, [], phraseInfo, false);
      const firstBar = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .find(line => line.includes('█'));

      jest.advanceTimersByTime(500);
      renderTrainBoard(currentTrack, [], phraseInfo, false);
      const secondBar = consoleLogSpy.mock.calls
        .map(call => call[0]?.toString() || '')
        .filter(line => line.includes('█'))
        .pop();

      expect(firstBar).toBeDefined();
      expect(secondBar).toBe(firstBar);
      expect(secondBar).toContain('\x1b[48;2');
    });

    test('clamps scrollOffset exceeding max to valid range', () => {
      const recs: MatchedTrack[] = Array.from({ length: 20 }, (_, i) => ({
        track_id: `spotify:track:rec${i}`,
        track_name: `Rec ${i}`,
        artist: 'Artist',
        camelot_key: '8A',
        bpm: 120,
        shiftType: ShiftType.SMOOTH,
      }));

      // With 20 recommendations and limited terminal height, scrollOffset should be clamped
      renderTrainBoard(null, recs, null, false, undefined, [], 'ALL', 1000);

      // Should show scroll indicator or last tracks, not crash
      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      // Should either show scroll indicator or render valid tracks
      expect(output.length).toBeGreaterThan(0);
    });

    test('handles scrollOffset at boundary correctly', () => {
      const recs: MatchedTrack[] = Array.from({ length: 15 }, (_, i) => ({
        track_id: `spotify:track:rec${i}`,
        track_name: `Rec ${i}`,
        artist: 'Artist',
        camelot_key: '8A',
        bpm: 120,
        shiftType: ShiftType.SMOOTH,
      }));

      // Test with scrollOffset at a valid boundary
      renderTrainBoard(null, recs, null, false, undefined, [], 'ALL', 5);

      const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
