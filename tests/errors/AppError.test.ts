import { AppError } from '../../src/errors/AppError';

describe('AppError', () => {
  test('creates error with message and status code', () => {
    const error = new AppError('Test error', 400);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  test('creates error with non-operational flag', () => {
    const error = new AppError('Critical error', 500, false);

    expect(error.message).toBe('Critical error');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });

  test('defaults to operational error', () => {
    const error = new AppError('Default error', 404);

    expect(error.isOperational).toBe(true);
  });

  test('has proper prototype chain', () => {
    const error = new AppError('Test', 500);

    expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
  });

  test('captures stack trace', () => {
    const error = new AppError('Stack test', 500);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});
