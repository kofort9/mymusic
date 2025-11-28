import { Logger } from '../src/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    while (Logger.getLogs().length > 0) {
      Logger.getLogs().pop();
    }
  });

  test('logs info messages', () => {
    Logger.log('Test message');
    const logs = Logger.getLogs();

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('INFO: Test message');
  });

  test('logs error messages', () => {
    Logger.error('Test error');
    const logs = Logger.getLogs();

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('ERROR: Test error');
  });

  test('appends error object message', () => {
    const error = new Error('Detailed error');
    Logger.error('Test error', error);
    const logs = Logger.getLogs();

    expect(logs[0]).toContain('Detailed error');
  });

  test('limits log size to MAX_LOGS', () => {
    // Log more than MAX_LOGS (20) messages
    for (let i = 0; i < 25; i++) {
      Logger.log(`Message ${i}`);
    }

    const logs = Logger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(20);
    // Should keep the most recent logs
    expect(logs[logs.length - 1]).toContain('Message 24');
  });

  test('includes timestamp in logs', () => {
    Logger.log('Test');
    const logs = Logger.getLogs();

    // Should match format [HH:MM:SS]
    expect(logs[0]).toMatch(/\[\d{1,2}:\d{2}:\d{2}\]/);
  });
});
