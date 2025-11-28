import { logger } from './logger';

enum CircuitState {
    CLOSED,
    OPEN,
    HALF_OPEN,
}

interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private nextAttempt = Date.now();
    private readonly failureThreshold: number;
    private readonly resetTimeout: number;
    private readonly name: string;

    constructor(name: string, options: CircuitBreakerOptions = { failureThreshold: 5, resetTimeout: 30000 }) {
        this.name = name;
        this.failureThreshold = options.failureThreshold;
        this.resetTimeout = options.resetTimeout;
    }

    async execute<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() > this.nextAttempt) {
                this.state = CircuitState.HALF_OPEN;
                logger.warn(`[CircuitBreaker:${this.name}] Circuit half-open, trying next request.`);
            } else {
                const remaining = Math.ceil((this.nextAttempt - Date.now()) / 1000);
                throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN. Retrying in ${remaining}s.`);
            }
        }

        try {
            const result = await action();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.CLOSED;
            logger.info(`[CircuitBreaker:${this.name}] Circuit CLOSED (recovered).`);
        }
    }

    private onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.resetTimeout;
            logger.error(`[CircuitBreaker:${this.name}] Circuit OPENED due to ${this.failureCount} failures.`);
        }
    }
}
