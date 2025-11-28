import { main, isTerminalTooNarrow } from '../src/main';

jest.useFakeTimers();

// Mocks
jest.mock('../src/auth', () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/library', () => ({
  loadLibrary: jest.fn().mockResolvedValue([
    {
      track_id: 'spotify:track:lib1',
      track_name: 'Lib1',
      artist: 'Artist',
      camelot_key: '8A',
      bpm: 128,
    },
  ]),
}));

jest.mock('../src/spotifyClient', () => ({
  pollCurrentlyPlaying: jest.fn(),
}));

jest.mock('../src/audioProcessor', () => ({
  getAudioFeatures: jest.fn().mockResolvedValue({ tempo: 128, key: 9, mode: 0, time_signature: 4 }),
}));

jest.mock('../src/camelot', () => ({
  convertToCamelot: jest.fn().mockReturnValue('8A'),
}));

jest.mock('../src/mixingEngine', () => ({
  getCompatibleKeys: jest.fn().mockReturnValue({ Smooth: ['8A'] }),
  filterMatches: jest.fn().mockReturnValue([]),
}));

const renderTrainBoardMock = jest.fn();
jest.mock('../src/display', () => ({
  PhraseCounter: class {
    calculate() {
      return null;
    }
  },
  renderTrainBoard: (...args: any[]) => renderTrainBoardMock(...args),
}));

jest.mock('../src/animation', () => ({
  runFlipClockAnimation: jest.fn().mockImplementation(async (_t, _a, cb) => {
    // Simulate a couple of frames to touch animation callback paths
    cb('FlipTrack', 'FlipArtist');
    cb('FinalTrack', 'FinalArtist');
  }),
}));

jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
    getLogs: jest.fn().mockReturnValue([]),
  },
}));

describe('Main integration loop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (process.stdin as any).setRawMode = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders at least one frame in normal width', async () => {
    const { pollCurrentlyPlaying } = require('../src/spotifyClient');
    pollCurrentlyPlaying
      .mockResolvedValueOnce({
        track_id: 'spotify:track:curr',
        track_name: 'Now',
        artist: 'Artist',
        camelot_key: '',
        audio_features: { tempo: 0, key: 0, mode: 0 },
        progress_ms: 0,
        duration_ms: 1000,
        timestamp: Date.now(),
        isPlaying: true,
      })
      .mockResolvedValueOnce(null);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await main();
    jest.advanceTimersByTime(200); // let UI loop tick a couple times
    process.emit('SIGINT');
    await Promise.resolve();

    expect(renderTrainBoardMock).toHaveBeenCalled();

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  test('narrow terminal bypasses renderTrainBoard', async () => {
    Object.defineProperty(process.stdout, 'columns', { writable: true, value: 60 });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await main();
    jest.advanceTimersByTime(150);
    process.emit('SIGINT');
    await Promise.resolve();

    expect(renderTrainBoardMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('\n⚠️  Terminal too narrow!');

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    stdoutSpy.mockRestore();
    Object.defineProperty(process.stdout, 'columns', { writable: true, value: 80 });
  });

  test('triggers flip animation on track change', async () => {
    const { pollCurrentlyPlaying } = require('../src/spotifyClient');
    const { runFlipClockAnimation } = require('../src/animation');

    pollCurrentlyPlaying
      .mockResolvedValueOnce({
        track_id: 'spotify:track:curr',
        track_name: 'Now',
        artist: 'Artist',
        camelot_key: '',
        audio_features: { tempo: 0, key: 0, mode: 0 },
        progress_ms: 0,
        duration_ms: 1000,
        timestamp: Date.now(),
        isPlaying: true,
      })
      .mockResolvedValueOnce({
        track_id: 'spotify:track:new',
        track_name: 'Next',
        artist: 'Artist2',
        camelot_key: '',
        audio_features: { tempo: 0, key: 0, mode: 0 },
        progress_ms: 0,
        duration_ms: 1000,
        timestamp: Date.now(),
        isPlaying: true,
      })
      .mockResolvedValueOnce(null);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await main();
    await jest.advanceTimersByTimeAsync(6000); // allow first poll + scheduled second poll (DEFAULT_POLL_INTERVAL)
    await jest.advanceTimersByTimeAsync(200); // give UI loop a tick
    process.emit('SIGINT');
    await Promise.resolve();

    expect(runFlipClockAnimation).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test('isTerminalTooNarrow helper', () => {
    expect(isTerminalTooNarrow(79)).toBe(true);
    expect(isTerminalTooNarrow(80)).toBe(false);
  });
});
