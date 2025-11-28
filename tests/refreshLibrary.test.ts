import { EventEmitter } from 'events';
import fs from 'fs';
import { spawn } from 'child_process';
import { refreshLibrary } from '../src/refreshLibrary';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('refreshLibrary CLI helper', () => {
  let existsSpy: jest.SpyInstance;

  const createMockChild = () => {
    const child = new EventEmitter() as any;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    return child;
  };

  beforeAll(() => {
    existsSpy = jest.spyOn(fs, 'existsSync');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    existsSpy.mockReturnValue(true);
  });

  afterAll(() => {
    existsSpy.mockRestore();
  });

  test('rejects when Liked_Songs.csv is missing', async () => {
    existsSpy.mockReturnValue(false);

    await expect(refreshLibrary()).rejects.toThrow('Liked_Songs.csv not found');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('runs prisma seed quietly and captures stdout', async () => {
    const child = createMockChild();
    (spawn as jest.Mock).mockReturnValue(child);

    const refreshPromise = refreshLibrary({ quiet: true });
    child.stdout.emit('data', 'seed output');
    child.emit('close', 0);

    const result = await refreshPromise;
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      ['prisma', 'db', 'seed'],
      expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] })
    );
    expect(result).toEqual({ success: true, output: 'seed output' });
  });

  test('surfaces stderr when prisma seed exits with failure', async () => {
    const child = createMockChild();
    (spawn as jest.Mock).mockReturnValue(child);

    const refreshPromise = refreshLibrary({ quiet: true });
    child.stderr.emit('data', 'boom');
    child.emit('close', 2);

    const result = await refreshPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('boom');
    expect(result.output).toBe('');
  });

  test('handles spawn errors gracefully', async () => {
    const child = createMockChild();
    (spawn as jest.Mock).mockReturnValue(child);

    const refreshPromise = refreshLibrary({ quiet: true });
    child.emit('error', new Error('spawn failed'));

    const result = await refreshPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('spawn failed');
  });

  test('uses inherited stdio when not in quiet mode', async () => {
    const child = createMockChild();
    (spawn as jest.Mock).mockReturnValue(child);

    const refreshPromise = refreshLibrary();
    child.emit('close', 0);

    const result = await refreshPromise;
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      ['prisma', 'db', 'seed'],
      expect.objectContaining({ stdio: 'inherit' })
    );
    expect(result.success).toBe(true);
  });
});
