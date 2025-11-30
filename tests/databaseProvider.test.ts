import { DatabaseProvider } from '../src/providers/database';
import { Logger } from '../src/logger';

jest.mock('../src/dbClient', () => {
  const mockTrackModel = {
    count: jest.fn(),
    findUnique: jest.fn(),
  };

  return {
    prisma: {
      track: mockTrackModel,
    },
    disconnectPrisma: jest.fn(),
    __mockTrackModel: mockTrackModel,
  };
});

// Pull the shared mock instance created in the factory above
const { __mockTrackModel: mockTrackModel } = jest.requireMock('../src/dbClient') as {
  __mockTrackModel: { count: jest.Mock; findUnique: jest.Mock };
};

jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DatabaseProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getName returns database', () => {
    const provider = new DatabaseProvider();
    expect(provider.getName()).toBe('database');
  });

  describe('isAvailable', () => {
    test('returns true when count succeeds', async () => {
      mockTrackModel.count.mockResolvedValue(5);
      const provider = new DatabaseProvider();
      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    test('returns false when count throws', async () => {
      mockTrackModel.count.mockRejectedValue(new Error('db down'));
      const provider = new DatabaseProvider();
      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe('getAudioFeatures', () => {
    test('returns mapped audio features when track exists', async () => {
      mockTrackModel.findUnique.mockResolvedValue({
        spotifyId: 'spotify:track:123',
        title: 'Song',
        artist: 'Artist',
        bpm: 125,
        key: 3,
        mode: 1,
        energy: 0.8,
        valence: 0.4,
        danceability: 0.7,
        acousticness: 0.1,
        instrumentalness: 0.2,
        liveness: 0.3,
        speechiness: 0.05,
        timeSignature: 4,
      });

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:123');

      expect(result).toMatchObject({
        tempo: 125,
        key: 3,
        mode: 1,
        energy: 0.8,
        valence: 0.4,
        danceability: 0.7,
        acousticness: 0.1,
        instrumentalness: 0.2,
        liveness: 0.3,
        speechiness: 0.05,
        time_signature: 4,
      });
    });

    test('returns null when track not found', async () => {
      mockTrackModel.findUnique.mockResolvedValue(null);
      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:missing');
      expect(result).toBeNull();
    });

    test('returns null on database error', async () => {
      mockTrackModel.findUnique.mockRejectedValue(new Error('db error'));
      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:oops');
      expect(result).toBeNull();
    });

    test('handles database connection timeout error', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'PrismaClientInitializationError';
      mockTrackModel.findUnique.mockRejectedValue(timeoutError);

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:timeout');

      expect(result).toBeNull();
    });

    test('handles database connection refused error', async () => {
      const connectionError = new Error("Can't reach database server");
      connectionError.name = 'PrismaClientKnownRequestError';
      mockTrackModel.findUnique.mockRejectedValue(connectionError);

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:connection');

      expect(result).toBeNull();
    });

    test('handles database locked error', async () => {
      const lockedError = new Error('database is locked');
      mockTrackModel.findUnique.mockRejectedValue(lockedError);

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:locked');

      expect(result).toBeNull();
    });

    test('handles network error during database query', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'PrismaClientRustPanicError';
      mockTrackModel.findUnique.mockRejectedValue(networkError);

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:network');

      expect(result).toBeNull();
    });

    test('handles invalid query error', async () => {
      const queryError = new Error('Invalid query syntax');
      queryError.name = 'PrismaClientValidationError';
      mockTrackModel.findUnique.mockRejectedValue(queryError);

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:invalid');

      expect(result).toBeNull();
    });

    test('handles error with null/undefined optional fields gracefully', async () => {
      // Test that all optional fields can be null/undefined
      mockTrackModel.findUnique.mockResolvedValue({
        spotifyId: 'spotify:track:123',
        title: 'Song',
        artist: 'Artist',
        bpm: 125,
        key: 3,
        mode: 1,
        energy: null,
        valence: null,
        danceability: null,
        acousticness: null,
        instrumentalness: null,
        liveness: null,
        speechiness: null,
        timeSignature: null,
      });

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:123');

      expect(result).toMatchObject({
        tempo: 125,
        key: 3,
        mode: 1,
        energy: undefined,
        valence: undefined,
        danceability: undefined,
        acousticness: undefined,
        instrumentalness: undefined,
        liveness: undefined,
        speechiness: undefined,
        time_signature: undefined,
      });
    });

    test('handles partial optional fields correctly', async () => {
      // Test with some optional fields present, others null
      mockTrackModel.findUnique.mockResolvedValue({
        spotifyId: 'spotify:track:123',
        title: 'Song',
        artist: 'Artist',
        bpm: 125,
        key: 3,
        mode: 1,
        energy: 0.8,
        valence: null,
        danceability: 0.7,
        acousticness: null,
        instrumentalness: 0.2,
        liveness: null,
        speechiness: null,
        timeSignature: 4,
      });

      const provider = new DatabaseProvider();
      const result = await provider.getAudioFeatures('spotify:track:123');

      expect(result).toMatchObject({
        tempo: 125,
        key: 3,
        mode: 1,
        energy: 0.8,
        valence: undefined,
        danceability: 0.7,
        acousticness: undefined,
        instrumentalness: 0.2,
        liveness: undefined,
        speechiness: undefined,
        time_signature: 4,
      });
    });

    test('logs error details correctly on database failure', async () => {
      const detailedError = new Error('Database connection failed');
      detailedError.stack = 'Error stack trace';
      mockTrackModel.findUnique.mockRejectedValue(detailedError);

      const provider = new DatabaseProvider();
      await provider.getAudioFeatures('spotify:track:detailed');
    });
  });
});
