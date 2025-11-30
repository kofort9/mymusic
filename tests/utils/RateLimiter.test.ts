import { RateLimiter } from '../../src/utils/RateLimiter';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    limiter = new RateLimiter('TestLimiter', {
      tokensPerInterval: 1,
      interval: 1000,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows requests within limit', async () => {
    await limiter.waitForToken(); // 1st token (consumed)
    // Should resolve immediately
  });

  test('waits when limit exceeded', async () => {
    await limiter.waitForToken(); // Consumes 1 token (0 left)

    const promise = limiter.waitForToken(); // Needs to wait

    // Advance time by 1s to refill
    jest.advanceTimersByTime(1000);

    await promise;
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit reached'));
  });
});
