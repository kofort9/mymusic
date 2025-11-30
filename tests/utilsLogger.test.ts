import path from 'path';

const reloadLogger = (env: string) => {
  jest.resetModules();
  process.env.NODE_ENV = env;
  return jest.requireActual(path.join('..', 'src', 'utils', 'logger'));
};

describe('utils/logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  test('omits console transport in development to prevent TUI interference', () => {
    const { logger } = reloadLogger('development');
    const hasConsole = logger.transports.some((t: any) => t.name === 'console');
    expect(hasConsole).toBe(false);
  });

  test('omits console transport in production', () => {
    const { logger } = reloadLogger('production');
    const hasConsole = logger.transports.some((t: any) => t.name === 'console');
    expect(hasConsole).toBe(false);
  });
});
