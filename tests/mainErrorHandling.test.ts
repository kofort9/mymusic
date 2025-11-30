const renderTrainBoardMock = jest.fn().mockReturnValue({ clampedOffset: 0, maxScroll: 0 });
const renderNarrowWarningMock = jest.fn();

jest.mock('../src/auth', () => ({
  authenticate: jest.fn(),
}));

jest.mock('../src/library', () => ({
  loadLibrary: jest.fn(),
}));

jest.mock('../src/spotifyClient', () => ({
  pollCurrentlyPlaying: jest.fn(),
}));

jest.mock('../src/audioProcessor', () => ({
  getAudioFeatures: jest.fn(),
}));

jest.mock('../src/camelot', () => ({
  convertToCamelot: jest.fn().mockReturnValue('1A'),
}));

jest.mock('../src/mixingEngine', () => ({
  getCompatibleKeys: jest.fn().mockReturnValue({ Smooth: ['1A'] }),
  filterMatches: jest.fn().mockReturnValue([]),
}));

jest.mock('../src/display', () => ({
  PhraseCounter: jest.fn().mockImplementation(() => ({
    calculate: jest.fn().mockReturnValue(null),
  })),
  TerminalRenderer: jest.fn().mockImplementation(() => ({
    renderTrainBoard: (...args: any[]) => renderTrainBoardMock(...args),
    renderNarrowWarning: (...args: any[]) => renderNarrowWarningMock(...args),
    resetFrameCache: jest.fn(),
    writeFrame: jest.fn(),
  })),
}));

jest.mock('../src/animation', () => ({
  runFlipClockAnimation: jest.fn(),
}));

jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
    getLogs: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  getLogs: jest.fn().mockReturnValue([]),
}));

jest.mock('../src/setupWizard', () => ({
  runFirstRunWizard: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/server', () => ({
  startServer: jest.fn(),
}));

jest.mock('../src/refreshLibrary', () => ({
  refreshLibrary: jest.fn().mockResolvedValue({ success: true, output: '' }),
}));

jest.mock('../src/dbClient', () => ({
  disconnectPrisma: jest.fn().mockResolvedValue(undefined),
}));

let main: typeof import('../src/main').main;
let loadLibrary: jest.MockedFunction<typeof import('../src/library').loadLibrary>;
let authenticate: jest.MockedFunction<typeof import('../src/auth').authenticate>;
let pollCurrentlyPlaying: jest.MockedFunction<
  typeof import('../src/spotifyClient').pollCurrentlyPlaying
>;
let getAudioFeatures: jest.MockedFunction<typeof import('../src/audioProcessor').getAudioFeatures>;
let logger: typeof import('../src/utils/logger').logger;

describe('main error handling paths', () => {
  let originalColumns: number | undefined;
  let originalRawMode: any;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.clearAllMocks();
    originalColumns = (process.stdout as any).columns;
    Object.defineProperty(process.stdout, 'columns', { writable: true, value: 100 });
    originalRawMode = (process.stdin as any).setRawMode;
    (process.stdin as any).setRawMode = jest.fn();

    ({ main } = require('../src/main'));
    ({ loadLibrary } = require('../src/library'));
    ({ authenticate } = require('../src/auth'));
    ({ pollCurrentlyPlaying } = require('../src/spotifyClient'));
    ({ getAudioFeatures } = require('../src/audioProcessor'));
    ({ logger } = require('../src/utils/logger'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('exit');
    process.stdout.removeAllListeners('resize');
    (process.stdin as any).removeAllListeners('keypress');
    Object.defineProperty(process.stdout, 'columns', { writable: true, value: originalColumns });
    (process.stdin as any).setRawMode = originalRawMode;
  });

  test('exits when library fails to load', async () => {
    (loadLibrary as jest.Mock).mockRejectedValueOnce(new Error('load failed'));
    (authenticate as jest.Mock).mockResolvedValue(undefined);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(main()).rejects.toThrow('exit:1');
    expect(logger.error).toHaveBeenCalledWith('Failed to load library:', {
      error: expect.any(Error),
    });

    exitSpy.mockRestore();
    stdoutSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('exits when authentication fails', async () => {
    (loadLibrary as jest.Mock).mockResolvedValueOnce([]);
    (authenticate as jest.Mock).mockRejectedValueOnce(new Error('auth failed'));

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(main()).rejects.toThrow('exit:1');
    expect(logger.error).toHaveBeenCalledWith(
      'Authentication failed. Check your Spotify credentials and try again.',
      { error: expect.any(Error) }
    );
    expect(consoleErrorSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    stdoutSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('renders poll error debug message', async () => {
    (loadLibrary as jest.Mock).mockResolvedValueOnce([]);
    (authenticate as jest.Mock).mockResolvedValueOnce(undefined);
    (pollCurrentlyPlaying as jest.Mock)
      .mockRejectedValueOnce(new Error('poll fail'))
      .mockResolvedValueOnce(null);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await main();
    await Promise.resolve(); // allow initial poll loop to process
    await jest.advanceTimersByTimeAsync(150); // let UI loop render with debug message
    process.emit('SIGINT');
    await Promise.resolve();

    const debugCall = renderTrainBoardMock.mock.calls.find(
      call => typeof call[4] === 'string' && call[4].includes('Poll Error')
    );
    expect(debugCall?.[4]).toContain('Poll Error: poll fail');

    exitSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  test('shows missing audio features debug message', async () => {
    (loadLibrary as jest.Mock).mockResolvedValueOnce([]);
    (authenticate as jest.Mock).mockResolvedValueOnce(undefined);
    let resolvePoll: (value: unknown) => void;
    const pollPromise = new Promise(resolve => {
      resolvePoll = resolve;
    });
    (pollCurrentlyPlaying as jest.Mock)
      .mockReturnValueOnce(pollPromise)
      .mockResolvedValueOnce(null);

    let resolveFeatures: (value: unknown) => void;
    const featuresPromise = new Promise(resolve => {
      resolveFeatures = resolve;
    });
    (getAudioFeatures as jest.Mock).mockReturnValueOnce(featuresPromise);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await main();
    // Allow poll loop to process the first track before rendering
    resolvePoll!({
      track_id: 'spotify:track:123',
      track_name: 'Test Track',
      artist: 'Artist',
      camelot_key: '',
      audio_features: { tempo: 0, key: 0, mode: 0 },
      progress_ms: 0,
      duration_ms: 1000,
      timestamp: Date.now(),
      isPlaying: true,
    });
    resolveFeatures!(null);
    await pollPromise;
    await featuresPromise;
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(800);
    expect(renderTrainBoardMock).toHaveBeenCalled();
    process.emit('SIGINT');
    await Promise.resolve();

    const trackRender = renderTrainBoardMock.mock.calls.find(
      call => call[0]?.track_id === 'spotify:track:123'
    );
    expect(trackRender).toBeTruthy();
    expect(
      jest.requireMock('../src/mixingEngine').filterMatches as jest.Mock
    ).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    stdoutSpy.mockRestore();
  });
});
