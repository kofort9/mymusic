import { authenticate } from './auth';
import { loadLibrary } from './library';
import { logger } from './utils/logger';
import { runFirstRunWizard } from './setupWizard';
import { startServer } from './server';
import { validateLibrary, displayValidationSummary } from './startup/validateLibrary';
import { Orchestrator } from './orchestrator';
import { InputHandler } from './inputHandler';
import { RenderLoop } from './renderLoop';
import { LibraryTrack } from './types';

async function main() {
  const isDebugMode = process.argv.includes('--debug');

  if (isDebugMode) {
    logger.info('Debug mode enabled.');
  }

  logger.info('Initializing Real-Time DJ Assistant...');
  process.stdout.write('\x1b[?25l'); // Hide cursor immediately
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
    console.error(
      '\nAuthentication failed. Ensure SPOTIFY_CLIENT_ID/SECRET/REDIRECT_URI are set in .env and re-run `npm start`.'
    );
    console.error(
      'If prompted, complete the browser login to Spotify so tokens.json can be saved locally.\n'
    );
    process.exit(1);
  }

  // Startup validation: check library status
  try {
    const validationResult = await validateLibrary();
    displayValidationSummary(validationResult);
    logger.info('Library validation complete');
  } catch (error) {
    logger.warn('Library validation failed (non-fatal)', { error });
  }

  // Initialize Components
  const orchestrator = new Orchestrator(library);

  // Graceful Shutdown Handler
  const gracefulShutdown = async () => {
    // Stop UI and Input immediately
    renderLoop.cleanup();
    inputHandler.cleanup();

    // Shutdown Orchestrator (stops polling, disconnects DB)
    await orchestrator.shutdown();

    process.exit(0);
  };

  const inputHandler = new InputHandler(orchestrator, () => void gracefulShutdown());
  const renderLoop = new RenderLoop(orchestrator, isDebugMode);

  // Start Components
  inputHandler.initialize();
  renderLoop.start();
  void orchestrator.startPolling();

  // Register cleanup handlers
  process.once('SIGTERM', () => {
    void gracefulShutdown();
  });
  process.once('SIGINT', () => {
    void gracefulShutdown();
  });
}

if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled error in main loop:', { error });
    process.exit(1);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', { error });
  process.exit(1);
});

export { main };
