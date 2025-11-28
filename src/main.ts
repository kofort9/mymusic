import { authenticate } from './auth';
import { pollCurrentlyPlaying } from './spotifyClient';
import { getAudioFeatures } from './audioProcessor';
import { convertToCamelot } from './camelot';
import { loadLibrary } from './library';
import { getCompatibleKeys, filterMatches } from './mixingEngine';
import { PhraseCounter, renderNarrowWarning, renderTrainBoard } from './display';
import { CurrentTrack, MatchedTrack, ShiftType, LibraryTrack } from './types';
import { refreshLibrary } from './refreshLibrary';
import * as readline from 'readline';
import { logger, getLogs } from './utils/logger';
import { runFlipClockAnimation } from './animation';
import { disconnectPrisma } from './dbClient';
import { runFirstRunWizard } from './setupWizard';
import { startServer } from './server';
import { POLLING, UI } from './constants';

export function isTerminalTooNarrow(width?: number): boolean {
  const terminalWidth = width ?? process.stdout.columns ?? UI.MIN_TERMINAL_WIDTH;
  return terminalWidth < UI.MIN_TERMINAL_WIDTH;
}

async function main() {
  const isDebugMode = process.argv.includes('--debug');

  if (isDebugMode) {
    logger.info('Debug mode enabled.');
  }

  logger.info('Initializing Real-Time DJ Assistant...');
  startServer();

  let library: LibraryTrack[] = [];
  try {
    library = await loadLibrary();
    logger.info(`Library loaded: ${library.length} tracks.`);
  } catch (error) {
    logger.error('Failed to load library:', { error });
    process.exit(1);
  }

  await runFirstRunWizard(library.length);

  try {
    await authenticate();
    logger.info('Authenticated with Spotify.');
  } catch (error) {
    logger.error('Authentication failed. Check your Spotify credentials and try again.', { error });
    console.error('\nAuthentication failed. Ensure SPOTIFY_CLIENT_ID/SECRET/REDIRECT_URI are set in .env and re-run `npm start`.');
    console.error('If prompted, complete the browser login to Spotify so tokens.json can be saved locally.\n');
    process.exit(1);
  }

  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  readline.emitKeypressEvents(process.stdin);

  let currentTrack: CurrentTrack | null = null;
  let recommendations: MatchedTrack[] = [];
  let lastTrackId: string | null = null;
  const phraseCounter = new PhraseCounter();
  let isAnimating = false;

  let showExitWarning = false;
  let exitWarningTimeout: NodeJS.Timeout | null = null;
  let debugMessage: string | undefined = undefined;
  let pollTimeout: NodeJS.Timeout | null = null;
  let uiInterval: NodeJS.Timeout | null = null;
  let isRefreshingLibrary = false;
  let showHelp = false;
  let isShuttingDown = false;

  // UI State
  let selectedCategory: ShiftType | 'ALL' = 'ALL';
  const categories = ['ALL', ...Object.values(ShiftType)];
  let scrollOffset = 0;

  const silenceConsoleLogger = () => {
    const transports = (logger as any).transports as Array<any> | undefined;
    if (!transports) return;
    transports.forEach(t => {
      if ((t as any).name === 'console') {
        (t as any).silent = true;
      }
    });
  };

  // Cleanup handler
  const cleanup = () => {
    if (isShuttingDown) return; // Prevent double cleanup
    isShuttingDown = true;

    // Clear timers first to stop any new renders
    if (exitWarningTimeout) clearTimeout(exitWarningTimeout);
    if (pollTimeout) clearTimeout(pollTimeout);
    if (uiInterval) clearInterval(uiInterval);

    // Remove listeners
    process.stdin.removeListener('keypress', onKeypress);
    if (process.stdin.pause) {
      process.stdin.pause();
    }

    // Show cursor and clear screen
    process.stdout.write('\x1b[?25h'); // Show cursor
    process.stdout.write('\x1b[2J\x1b[0f'); // Clear screen

    // Silence console transport so shutdown logs don't clutter the farewell
    silenceConsoleLogger();
    logger.info('Goodbye!');
    if (process.env.NODE_ENV !== 'test') {
      // User-facing farewell without JSON metadata noise
      const farewell = [
        '',
        'SpotifyDJ · Session ended gracefully',
        '',
        'Thanks for grooving with us. See you next set! ✨',
        '',
      ].join('\n');
      // eslint-disable-next-line no-console
      console.log(farewell);
    }
  };

  // Async cleanup for graceful shutdown
  const gracefulShutdown = async () => {
    if (isShuttingDown) return;
    cleanup();
    await disconnectPrisma();
    process.exit(0);
  };

  const triggerLibraryRefresh = async () => {
    if (isRefreshingLibrary) {
      debugMessage = 'Library refresh already running...';
      renderCurrentState();
      return;
    }

    isRefreshingLibrary = true;
    debugMessage = 'Refreshing library from CSV...';
    renderCurrentState();

    try {
      const result = await refreshLibrary({ quiet: true });
      if (result.success) {
        library = await loadLibrary();
        debugMessage = 'Library refreshed.';

        if (currentTrack) {
          // Use current track features if available, otherwise fall back to library values
          const libraryMatch = library.find(t => t.track_id === currentTrack?.track_id);
          const effectiveCamelot = (
            currentTrack.camelot_key ||
            libraryMatch?.camelot_key ||
            ''
          ).trim();
          const effectiveBpm = currentTrack.audio_features?.tempo || libraryMatch?.bpm || 0;

          if (!effectiveCamelot || effectiveBpm <= 0) {
            debugMessage =
              'Library refreshed. Current track missing BPM/key; waiting for Spotify features or library entry.';
            recommendations = [];
          } else {
            const compatibleKeys = getCompatibleKeys(effectiveCamelot);
            const useRelaxedFilter = selectedCategory === 'ALL';
            const updatedTrack: CurrentTrack = {
              ...currentTrack,
              camelot_key: effectiveCamelot,
              audio_features: {
                ...currentTrack.audio_features,
                tempo: effectiveBpm,
              },
            };
            recommendations = filterMatches(
              updatedTrack,
              library,
              compatibleKeys,
              useRelaxedFilter
            );
            currentTrack = updatedTrack;
          }
        }
      } else {
        debugMessage = `Refresh failed: ${result.error || 'Unknown error'}`;
      }
    } catch (err) {
      const e = err as Error;
      debugMessage = `Refresh error: ${e.message || err}`;
    } finally {
      isRefreshingLibrary = false;
      renderCurrentState();
    }
  };

  // Keypress Handler
  const onKeypress = (str: string, key: readline.Key) => {
    if (isShuttingDown) return;
    if (key.ctrl && key.name === 'c') {
      if (showExitWarning) {
        void gracefulShutdown();
      } else {
        showExitWarning = true;
        renderCurrentState();
        if (exitWarningTimeout) clearTimeout(exitWarningTimeout);
        exitWarningTimeout = setTimeout(() => {
          showExitWarning = false;
          renderCurrentState();
        }, UI.EXIT_WARNING_TIMEOUT);
      }
    } else if (key.name === 'tab') {
      // Cycle categories
      const currentIndex = categories.indexOf(selectedCategory);
      const nextIndex = (currentIndex + 1) % categories.length;
      selectedCategory = categories[nextIndex] as ShiftType | 'ALL';
      scrollOffset = 0; // Reset scroll on category change
      renderCurrentState();
    } else if (key.name === 'w') {
      // Scroll Up
      scrollOffset = Math.max(0, scrollOffset - 1);
      renderCurrentState();
    } else if (key.name === 's') {
      // Scroll Down
      scrollOffset++; // Bound check happens in display
      renderCurrentState();
    } else if (key.name === 'r') {
      void triggerLibraryRefresh();
    } else if (key.name === 'h') {
      showHelp = !showHelp;
      renderCurrentState();
    }
  };

  process.stdin.on('keypress', onKeypress);

  const renderCurrentState = () => {
    // Don't render if shutdown is in progress
    if (isShuttingDown) return;

    const logs = isDebugMode ? getLogs() : [];

    // Check minimum terminal width
    const terminalWidth = process.stdout.columns || UI.MIN_TERMINAL_WIDTH;
    if (isTerminalTooNarrow(terminalWidth)) {
      renderNarrowWarning(terminalWidth);
      return;
    }

    let phraseInfo = null;
    if (currentTrack && currentTrack.audio_features.tempo > 0) {
      phraseInfo = phraseCounter.calculate(
        currentTrack.audio_features.tempo,
        currentTrack.progress_ms,
        currentTrack.timestamp,
        currentTrack.audio_features.time_signature,
        currentTrack.isPlaying ?? true
      );
    }

    const notices: string[] = [];
    const currentTrackId = currentTrack?.track_id;
    const libraryMatch = currentTrackId
      ? library.find(track => track.track_id === currentTrackId)
      : undefined;

    const hasTempo = Boolean(currentTrack?.audio_features?.tempo && currentTrack.audio_features.tempo > 0);
    const hasCamelot = Boolean(currentTrack?.camelot_key);
    const libHasTempo = Boolean(libraryMatch?.bpm && libraryMatch.bpm > 0);
    const libHasCamelot = Boolean(libraryMatch?.camelot_key);

    if (!currentTrack) {
      notices.push('No playback detected on Spotify. Start a track to see harmonic matches.');
    } else if (!hasTempo || !hasCamelot || !libHasTempo || !libHasCamelot) {
      notices.push(
        'Missing BPM/Key for current track. Press r to refresh library or enable SongBPM fallback in .env.'
      );
    }

    renderTrainBoard(
      currentTrack,
      recommendations,
      phraseInfo,
      showExitWarning,
      debugMessage,
      logs,
      selectedCategory,
      scrollOffset,
      showHelp,
      notices
    );
  };

  // Smart Polling Logic
  const pollLoop = async () => {
    if (isShuttingDown) return;
    let nextPollDelay: number = POLLING.DEFAULT_INTERVAL;

    try {
      const trackData = await pollCurrentlyPlaying();

      if (trackData) {
        if (trackData.track_id !== lastTrackId) {
          const isNewTrack = lastTrackId !== null; // Don't animate on first load
          lastTrackId = trackData.track_id;
          const features = await getAudioFeatures(
            trackData.track_id,
            trackData.track_name,
            trackData.artist
          );

          if (features) {
            debugMessage = undefined; // Clear debug message on success
            const camelotKey = convertToCamelot(features.key, features.mode);
            const newTrack: CurrentTrack = {
              ...trackData,
              audio_features: features,
              camelot_key: camelotKey,
              duration_ms: trackData.duration_ms,
              isPlaying: trackData.isPlaying,
              // Normalize timestamp to now when detecting a new track
              // This ensures progress bar starts correctly when app starts mid-song
              // We use progress_ms from Spotify as the base, and timestamp becomes our reference point
              timestamp: Date.now(),
            };

            // Run flip-clock animation for track transitions
            if (isNewTrack && !isAnimating) {
              isAnimating = true;
              await runFlipClockAnimation(
                newTrack.track_name,
                newTrack.artist,
                (animatedTrack, animatedArtist) => {
                  const animatedCurrentTrack = {
                    ...newTrack,
                    track_name: animatedTrack,
                    artist: animatedArtist,
                  };
                  const tempCompatibleKeys = getCompatibleKeys(camelotKey);
                  const tempRecommendations = filterMatches(
                    animatedCurrentTrack,
                    library,
                    tempCompatibleKeys,
                    selectedCategory === 'ALL'
                  );
                  renderTrainBoard(
                    animatedCurrentTrack,
                    tempRecommendations,
                    null,
                    showExitWarning,
                    debugMessage,
                    isDebugMode ? getLogs() : [],
                    selectedCategory,
                    scrollOffset,
                    showHelp
                  );
                }
              );
              isAnimating = false;
            }

            currentTrack = newTrack;
            const compatibleKeys = getCompatibleKeys(camelotKey);
            const useRelaxedFilter = selectedCategory === 'ALL';
            recommendations = filterMatches(
              currentTrack,
              library,
              compatibleKeys,
              useRelaxedFilter
            );
          } else {
            currentTrack = trackData;
            recommendations = [];
            debugMessage = `Audio Features missing for ID: ${trackData.track_id}. Check logs.`;
          }
        } else if (currentTrack) {
          // Update existing track state
          // Update progress_ms from Spotify (most accurate source)
          currentTrack.progress_ms = trackData.progress_ms;
          // Update timestamp to now to maintain accurate elapsed time calculation
          // This ensures progress bar continues accurately between polls
          currentTrack.timestamp = Date.now();
          currentTrack.isPlaying = trackData.isPlaying;
        }

        // Calculate Smart Next Poll
        if (currentTrack && currentTrack.isPlaying) {
          const remainingMs = currentTrack.duration_ms - currentTrack.progress_ms;

          if (remainingMs <= POLLING.TRANSITION_THRESHOLD) {
            // Near end: Poll fast to catch transition
            nextPollDelay = POLLING.FAST_INTERVAL;
          } else if (remainingMs > 20000) {            // Long time remaining: Poll slower (but cap at MAX to catch manual skips)
            nextPollDelay = POLLING.MAX_INTERVAL;
          } else {
            // Medium time remaining: Poll halfway or standard
            nextPollDelay = POLLING.DEFAULT_INTERVAL;
          }
        } else {
          // Paused: Poll standard/slow
          nextPollDelay = POLLING.DEFAULT_INTERVAL;
        }
      } else {
        currentTrack = null;
        recommendations = [];
        lastTrackId = null;
        debugMessage = undefined;
        // Nothing playing: Poll standard
        nextPollDelay = POLLING.DEFAULT_INTERVAL;
      }
    } catch (error) {
      // console.error("Error in poll loop:", error); // Don't log to stdout to keep UI clean, rely on debugMessage
      const err = error as Error;
      debugMessage = `Poll Error: ${err.message || 'Unknown error'}`;
      nextPollDelay = POLLING.DEFAULT_INTERVAL;
    }

    // Schedule next poll only if not shutting down
    if (!isShuttingDown) {
      pollTimeout = setTimeout(pollLoop, nextPollDelay);
    }
  };

  // Register cleanup handlers
  process.on('exit', cleanup);
  process.once('SIGTERM', () => {
    void gracefulShutdown();
  });
  process.once('SIGINT', () => {
    void gracefulShutdown();
  });

  // Handle terminal resize
  process.stdout.on('resize', () => {
    renderCurrentState();
  });

  // Start Polling
  pollLoop();

  // UI Loop (separate independent loop for smooth animations)
  uiInterval = setInterval(() => {
    if (!isShuttingDown) {
      renderCurrentState();
    }
  }, UI.REFRESH_RATE);

  // Initial clear
  process.stdout.write('\x1b[2J\x1b[0f');
  process.stdout.write('\x1b[?25l');
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main loop:', { error });
    process.exit(1);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Recommended: restart the process?
  // process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  process.exit(1);
});

export { main };
