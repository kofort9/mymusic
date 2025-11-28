import winston from 'winston';
import Transport from 'winston-transport';

const isDev = process.env.NODE_ENV !== 'production';

class MemoryTransport extends Transport {
    public logs: string[] = [];
    private MAX_LOGS = 20;

    constructor(opts?: Transport.TransportStreamOptions) {
        super(opts);
    }

    log(info: any, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
        const message = `[${timestamp}] ${info.level.toUpperCase()}: ${info.message}`;

        this.logs.push(message);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }

        callback();
    }
}

const memoryTransport = new MemoryTransport();

export const logger = winston.createLogger({
    level: isDev ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'spotifydj' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        memoryTransport
    ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (isDev) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

export const addRequestId = (requestId: string) => {
    return logger.child({ requestId });
}

export const getLogs = () => {
    return memoryTransport.logs;
}
