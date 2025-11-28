import { PhraseCounter, renderTrainBoard } from '../src/display';
import { CurrentTrack, MatchedTrack, ShiftType } from '../src/types';

// Mock package.json for version info
jest.mock('../package.json', () => ({
  version: '2.0.54'
}), { virtual: true });

// Mock camelotColors
jest.mock('../src/camelotColors', () => ({
  getCamelotColor: jest.fn((code: string) => '#FFFFFF')
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
      value: 80
    });
    Object.defineProperty(process.stdout, 'rows', {
      writable: true,
      value: 24
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
      if (durationMs <= 0) return "▱".repeat(10);
      
      const percent = Math.min(1, Math.max(0, progressMs / durationMs));
      const barLength = 10;
      const fillCount = Math.round(percent * barLength);
      const emptyCount = barLength - fillCount;
      
      return "▰".repeat(fillCount) + "▱".repeat(emptyCount);
    }

    test('0% progress should be empty', () => {
      expect(generateProgressBar(0, 1000)).toBe("▱▱▱▱▱▱▱▱▱▱");
    });

    test('100% progress should be full', () => {
      expect(generateProgressBar(1000, 1000)).toBe("▰▰▰▰▰▰▰▰▰▰");
    });

    test('50% progress should be half full', () => {
      expect(generateProgressBar(500, 1000)).toBe("▰▰▰▰▰▱▱▱▱▱");
    });

    test('Rounding logic (e.g., 14% -> 1 block)', () => {
      expect(generateProgressBar(140, 1000)).toBe("▰▱▱▱▱▱▱▱▱▱");
    });

    test('Rounding logic (e.g., 16% -> 2 blocks)', () => {
      expect(generateProgressBar(160, 1000)).toBe("▰▰▱▱▱▱▱▱▱▱");
    });

    test('handles zero duration', () => {
      expect(generateProgressBar(100, 0)).toBe("▱▱▱▱▱▱▱▱▱▱");
    });

    test('handles progress exceeding duration', () => {
      expect(generateProgressBar(2000, 1000)).toBe("▰▰▰▰▰▰▰▰▰▰");
    });

    test('handles negative progress', () => {
      expect(generateProgressBar(-100, 1000)).toBe("▱▱▱▱▱▱▱▱▱▱");
    });
  });

  describe('renderTrainBoard', () => {
    test('renders waiting message when no track is playing', () => {
      renderTrainBoard(null, [], null, false);

      expect(stdoutWriteSpy).toHaveBeenCalled();
      // console.log is used for content output, process.stdout.write for screen control
      const calls = consoleLogSpy.mock.calls;
      const hasWaitingMessage = calls.some(call => 
        call[0] && call[0].toString().includes('Waiting for playback')
      );
      expect(hasWaitingMessage).toBe(true);
    });

    test('renders track information when track is playing', () => {
      const currentTrack: CurrentTrack = {
        track_id: 'track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true
      };

      renderTrainBoard(currentTrack, [], null, false);

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls;
      const hasTrackName = calls.some(call => 
        call[0] && call[0].toString().includes('Test Track')
      );
      expect(hasTrackName).toBe(true);
    });

    test('renders recommendations when available', () => {
      const recommendations: MatchedTrack[] = [
        {
          track_id: 'rec1',
          track_name: 'Recommendation 1',
          artist: 'Artist 1',
          camelot_key: '9A',
          bpm: 128,
          shiftType: ShiftType.SMOOTH
        },
        {
          track_id: 'rec2',
          track_name: 'Recommendation 2',
          artist: 'Artist 2',
          camelot_key: '10A',
          bpm: 130,
          shiftType: ShiftType.ENERGY_UP
        }
      ];

      renderTrainBoard(null, recommendations, null, false);

      const calls = consoleLogSpy.mock.calls;
      const hasRecommendations = calls.some(call => 
        call[0] && call[0].toString().includes('Recommendations')
      );
      expect(hasRecommendations).toBe(true);
    });

    test('renders phrase info when provided', () => {
      const phraseInfo = {
        beatsRemaining: 16,
        timeRemainingSeconds: 7.5,
        phraseCount: 2
      };

      const currentTrack: CurrentTrack = {
        track_id: 'track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true
      };

      renderTrainBoard(currentTrack, [], phraseInfo, false);

      const calls = consoleLogSpy.mock.calls;
      const hasPhraseInfo = calls.some(call => 
        call[0] && call[0].toString().includes('Phrase Matching')
      );
      expect(hasPhraseInfo).toBe(true);
    });

    test('renders debug message when provided', () => {
      renderTrainBoard(null, [], null, false, 'Test debug message');

      const calls = consoleLogSpy.mock.calls;
      const hasDebugMessage = calls.some(call => 
        call[0] && call[0].toString().includes('DEBUG: Test debug message')
      );
      expect(hasDebugMessage).toBe(true);
    });

    test('renders debug logs when provided', () => {
      const logs = ['Log 1', 'Log 2', 'Log 3'];
      renderTrainBoard(null, [], null, false, undefined, logs);

      const calls = consoleLogSpy.mock.calls;
      const hasDebugLogs = calls.some(call => 
        call[0] && call[0].toString().includes('DEBUG LOGS')
      );
      expect(hasDebugLogs).toBe(true);
    });

    test('groups recommendations by shift type', () => {
      const recommendations: MatchedTrack[] = [
        {
          track_id: 'rec1',
          track_name: 'Smooth Track',
          artist: 'Artist 1',
          camelot_key: '8A',
          bpm: 128,
          shiftType: ShiftType.SMOOTH
        },
        {
          track_id: 'rec2',
          track_name: 'Energy Track',
          artist: 'Artist 2',
          camelot_key: '10A',
          bpm: 130,
          shiftType: ShiftType.ENERGY_UP
        }
      ];

      renderTrainBoard(null, recommendations, null, false);

      const calls = consoleLogSpy.mock.calls;
      const output = calls.map(call => call[0]?.toString() || '').join('\n');
      expect(output).toContain('Smooth');
      expect(output).toContain('Energy Up');
    });

    test('handles long track names with truncation', () => {
      const currentTrack: CurrentTrack = {
        track_id: 'track1',
        track_name: 'A'.repeat(100),
        artist: 'B'.repeat(100),
        camelot_key: '8A',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true
      };

      // Mock narrower terminal
      Object.defineProperty(process.stdout, 'columns', {
        writable: true,
        value: 70
      });

      renderTrainBoard(currentTrack, [], null, false);

      // Should not throw and should handle truncation
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles missing camelot key', () => {
      const currentTrack: CurrentTrack = {
        track_id: 'track1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '',
        audio_features: { tempo: 128, key: 9, mode: 0 },
        progress_ms: 50000,
        duration_ms: 180000,
        timestamp: Date.now(),
        isPlaying: true
      };

      renderTrainBoard(currentTrack, [], null, false);

      const calls = consoleLogSpy.mock.calls;
      const output = calls.map(call => call[0]?.toString() || '').join('\n');
      // Strip ANSI codes for comparison and check for Camelot label with missing key
      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
      expect(cleanOutput).toMatch(/Camelot:\s+-/);
    });
  });
});
