import winston from 'winston';
import Transport from 'winston-transport';

const isDev = process.env.NODE_ENV !== 'production';

class MemoryTransport extends Transport {
  public logs: string[] = [];
  private MAX_LOGS = 20;

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: Record<string, unknown>, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    const level = (info.level as string) || 'info';
    const message = (info.message as string) || '';
    const errorMeta = info.error as { message?: string } | undefined;
    const detailedError = errorMeta?.message ? ` | ${errorMeta.message}` : '';
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${detailedError}`;

    this.logs.push(formattedMessage);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    callback();
  }
}

const memoryTransport = new MemoryTransport();

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'spotifydj' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    memoryTransport,
  ],
});

// Console transport disabled to prevent interference with TUI
// Logs are still written to files (error.log, combined.log) and memory (for debug mode)
// If you need console logs for debugging, temporarily uncomment the block below:
/*
if (isDev) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'],
    }));
}
*/

export const addRequestId = (requestId: string) => {
  return logger.child({ requestId });
};

export const getLogs = () => {
  return memoryTransport.logs;
};
