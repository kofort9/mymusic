import { authenticate } from './auth';
import { pollCurrentlyPlaying } from './spotifyClient';
import { getAudioFeatures } from './audioProcessor';
import { convertToCamelot } from './camelot';
import { loadLibrary } from './library';
import { getCompatibleKeys, filterMatches } from './mixingEngine';
import { PhraseCounter, renderTrainBoard } from './display';
import { CurrentTrack, MatchedTrack } from './types';
import * as readline from 'readline';
import { Logger } from './logger';
import { runFlipClockAnimation } from './animation';

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds default
const MAX_POLL_INTERVAL = 10000;    // Cap at 10 seconds to detect skips
const FAST_POLL_INTERVAL = 1000;    // 1 second during transition window
const TRANSITION_THRESHOLD = 5000;  // 5 seconds remaining = start fast polling
const UI_REFRESH_RATE = 100;

async function main() {
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  readline.emitKeypressEvents(process.stdin);

  const isDebugMode = process.argv.includes('--debug');

  if (isDebugMode) {
    Logger.log("Debug mode enabled.");
  }

  Logger.log("Initializing Real-Time DJ Assistant...");

  let library;
  try {
    library = loadLibrary();
    Logger.log(`Library loaded: ${library.length} tracks.`);
  } catch (error) {
    Logger.error("Failed to load library:", error);
    process.exit(1);
  }

  try {
    await authenticate();
    Logger.log("Authenticated with Spotify.");
  } catch (error) {
    Logger.error("Authentication failed:", error);
    process.exit(1);
  }

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

  // Keypress Handler
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      if (showExitWarning) {
        process.exit(0); // Cleanup handler will be called automatically
      } else {
        showExitWarning = true;
        renderCurrentState();
        if (exitWarningTimeout) clearTimeout(exitWarningTimeout);
        exitWarningTimeout = setTimeout(() => {
          showExitWarning = false;
          renderCurrentState(); 
        }, 1000); 
      }
    }
  });

  const renderCurrentState = () => {
    const logs = isDebugMode ? Logger.getLogs() : [];
    
    // Check minimum terminal width
    const terminalWidth = process.stdout.columns || 80;
    if (terminalWidth < 80) {
      process.stdout.write('\x1b[2J\x1b[0f');
      console.log('\n⚠️  Terminal too narrow!');
      console.log(`Minimum width: 80 characters`);
      console.log(`Current width: ${terminalWidth} characters`);
      console.log(`\nPlease resize your terminal window.`);
      return;
    }
    
    if (currentTrack && currentTrack.audio_features.tempo > 0) {
      const phraseInfo = phraseCounter.calculate(
        currentTrack.audio_features.tempo, 
        currentTrack.progress_ms, 
        currentTrack.timestamp,
        currentTrack.audio_features.time_signature
      );
      renderTrainBoard(currentTrack, recommendations, phraseInfo, showExitWarning, debugMessage, logs);
    } else {
      renderTrainBoard(currentTrack, recommendations, null, showExitWarning, debugMessage, logs);
    }
  };

  // Smart Polling Logic
  const pollLoop = async () => {
    let nextPollDelay = DEFAULT_POLL_INTERVAL;

    try {
      const trackData = await pollCurrentlyPlaying();
      
      if (trackData) {
        if (trackData.track_id !== lastTrackId) {
          const isNewTrack = lastTrackId !== null; // Don't animate on first load
          lastTrackId = trackData.track_id;
          const features = await getAudioFeatures(trackData.track_id, trackData.track_name, trackData.artist);
          
          if (features) {
            debugMessage = undefined; // Clear debug message on success
            const camelotKey = convertToCamelot(features.key, features.mode);
            const newTrack: CurrentTrack = {
              ...trackData,
              audio_features: features,
              camelot_key: camelotKey,
              duration_ms: trackData.duration_ms,
              isPlaying: trackData.isPlaying
            };
            
            // Run flip-clock animation for track transitions
            if (isNewTrack && !isAnimating) {
              isAnimating = true;
              await runFlipClockAnimation(
                newTrack.track_name,
                newTrack.artist,
                (animatedTrack, animatedArtist) => {
                  const animatedCurrentTrack = { ...newTrack, track_name: animatedTrack, artist: animatedArtist };
                  const tempCompatibleKeys = getCompatibleKeys(camelotKey);
                  const tempRecommendations = filterMatches(animatedCurrentTrack, library, tempCompatibleKeys);
                  renderTrainBoard(animatedCurrentTrack, tempRecommendations, null, showExitWarning, debugMessage, isDebugMode ? Logger.getLogs() : []);
                }
              );
              isAnimating = false;
            }
            
            currentTrack = newTrack;
            const compatibleKeys = getCompatibleKeys(camelotKey);
            recommendations = filterMatches(currentTrack, library, compatibleKeys);
          } else {
             currentTrack = trackData;
             recommendations = [];
             debugMessage = `Audio Features missing for ID: ${trackData.track_id}. Check logs.`;
          }
        } else if (currentTrack) {
            // Update existing track state
            currentTrack.progress_ms = trackData.progress_ms;
            currentTrack.timestamp = trackData.timestamp;
            currentTrack.isPlaying = trackData.isPlaying;
        }

        // Calculate Smart Next Poll
        if (currentTrack && currentTrack.isPlaying) {
            const remainingMs = currentTrack.duration_ms - currentTrack.progress_ms;
            
            if (remainingMs <= TRANSITION_THRESHOLD) {
                // Near end: Poll fast to catch transition
                nextPollDelay = FAST_POLL_INTERVAL;
            } else if (remainingMs > 20000) {
                // Long time remaining: Poll slower (but cap at MAX to catch manual skips)
                nextPollDelay = MAX_POLL_INTERVAL;
            } else {
                // Medium time remaining: Poll halfway or standard
                nextPollDelay = DEFAULT_POLL_INTERVAL;
            }
        } else {
            // Paused: Poll standard/slow
            nextPollDelay = DEFAULT_POLL_INTERVAL;
        }

      } else {
        currentTrack = null;
        recommendations = [];
        lastTrackId = null;
        debugMessage = undefined;
        // Nothing playing: Poll standard
        nextPollDelay = DEFAULT_POLL_INTERVAL;
      }
    } catch (error) {
      // console.error("Error in poll loop:", error); // Don't log to stdout to keep UI clean, rely on debugMessage
      const err = error as Error;
      debugMessage = `Poll Error: ${err.message || 'Unknown error'}`;
      nextPollDelay = DEFAULT_POLL_INTERVAL;
    }

    // Schedule next poll
    pollTimeout = setTimeout(pollLoop, nextPollDelay);
  };

  // Cleanup handler
  const cleanup = () => {
    if (exitWarningTimeout) clearTimeout(exitWarningTimeout);
    if (pollTimeout) clearTimeout(pollTimeout);
    if (uiInterval) clearInterval(uiInterval);
    process.stdout.write('\x1b[?25h'); // Show cursor
    Logger.log('\nGoodbye!');
  };

  // Register cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  // Handle terminal resize
  process.stdout.on('resize', () => {
    renderCurrentState();
  });

  // Start Polling
  pollLoop();

  // UI Loop (separate independent loop for smooth animations)
  uiInterval = setInterval(() => {
    renderCurrentState();
  }, UI_REFRESH_RATE);

  // Initial clear
  process.stdout.write('\x1b[2J\x1b[0f'); 
  process.stdout.write('\x1b[?25l'); 
}

main();
