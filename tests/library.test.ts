import { loadLibrary } from '../src/library';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    track: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

describe('Library Loader', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('loads valid library successfully', async () => {
    const mockTracks = [
      {
        spotifyId: 'test1',
        title: 'Test Track',
        artist: 'Test Artist',
        camelotKey: '8A',
        bpm: 128.0,
        energy: 0.8,
      },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);

    const library = await loadLibrary();

    expect(library).toHaveLength(1);
    expect(library[0].track_name).toBe('Test Track');
    expect(library[0].camelot_key).toBe('8A');
    expect(library[0].energy).toBe(0.8);
  });

  test('throws error if DB fetch fails', async () => {
    (prisma.track.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

    await expect(loadLibrary()).rejects.toThrow('Failed to load library from DB');
  });
});
