import { logger } from './logger';

interface RateLimiterOptions {
  tokensPerInterval: number;
  interval: number; // in milliseconds
  maxTokens?: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly tokensPerInterval: number;
  private readonly interval: number;
  private readonly maxTokens: number;
  private readonly name: string;

  constructor(name: string, options: RateLimiterOptions) {
    this.name = name;
    this.tokensPerInterval = options.tokensPerInterval;
    this.interval = options.interval;
    this.maxTokens = options.maxTokens || options.tokensPerInterval;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.interval) * this.tokensPerInterval;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async waitForToken(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const timeUntilNextRefill = this.interval - (Date.now() - this.lastRefill);
    logger.warn(
      `[RateLimiter:${this.name}] Rate limit reached. Waiting ${timeUntilNextRefill}ms...`
    );

    return new Promise(resolve => {
      setTimeout(() => {
        this.waitForToken().then(resolve);
      }, timeUntilNextRefill);
    });
  }
}
