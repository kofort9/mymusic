import { CircuitBreaker } from '../../src/utils/CircuitBreaker';
import { logger } from '../../src/utils/logger';

// Mock logger to avoid cluttering test output
jest.mock('../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    jest.clearAllMocks();
    breaker = new CircuitBreaker('TestBreaker', {
      failureThreshold: 3,
      resetTimeout: 1000,
    });
  });

  test('executes successful action', async () => {
    const action = jest.fn().mockResolvedValue('success');
    const result = await breaker.execute(action);
    expect(result).toBe('success');
    expect(action).toHaveBeenCalled();
  });

  test('opens circuit after failure threshold reached', async () => {
    const action = jest.fn().mockRejectedValue(new Error('fail'));

    // Fail 3 times
    await expect(breaker.execute(action)).rejects.toThrow('fail');
    await expect(breaker.execute(action)).rejects.toThrow('fail');
    await expect(breaker.execute(action)).rejects.toThrow('fail');

    // 4th attempt should fail fast with Circuit OPEN
    await expect(breaker.execute(action)).rejects.toThrow(/Circuit is OPEN/);
  });

  test('retries after reset timeout', async () => {
    const action = jest.fn().mockRejectedValue(new Error('fail'));

    // Fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(action);
      } catch (e) {}
    }

    // Verify open
    await expect(breaker.execute(action)).rejects.toThrow(/Circuit is OPEN/);

    // Wait for timeout
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 1100);

    // Next attempt should go through (half-open)
    action.mockResolvedValueOnce('recovered');
    const result = await breaker.execute(action);
    expect(result).toBe('recovered');
  });
});
