import { logger as winstonLogger, getLogs } from './utils/logger';

/**
 * Thin compatibility wrapper around the shared winston logger.
 * Older code/tests import Logger, so we delegate to the new logger instance.
 */
export class Logger {
  static log(message: string): void {
    winstonLogger.info(message);
  }

  static error(message: string, error?: unknown): void {
    if (error) {
      winstonLogger.error(message, { error });
    } else {
      winstonLogger.error(message);
    }
  }

  static getLogs(): string[] {
    return getLogs();
  }
}

// Export the shared logger for modules using the new path
export { winstonLogger as logger, getLogs };
