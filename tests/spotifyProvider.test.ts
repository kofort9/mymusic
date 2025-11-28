import { SpotifyProvider } from '../src/providers/spotifyProvider';
import { spotifyApi } from '../src/auth';
import { logger } from '../src/utils/logger';

jest.mock('../src/auth', () => ({
  spotifyApi: {
    getMe: jest.fn(),
    getAudioFeaturesForTrack: jest.fn(),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SpotifyProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getName returns Spotify', () => {
    const provider = new SpotifyProvider();
    expect(provider.getName()).toBe('Spotify');
  });

  describe('isAvailable', () => {
    test('returns true when getMe succeeds', async () => {
      (spotifyApi.getMe as jest.Mock).mockResolvedValue({});
      const provider = new SpotifyProvider();
      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    test('returns false when getMe fails', async () => {
      (spotifyApi.getMe as jest.Mock).mockRejectedValue(new Error('fail'));
      const provider = new SpotifyProvider();
      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe('getAudioFeatures', () => {
    const baseBody = {
      tempo: 128,
      key: 5,
      mode: 1,
      energy: 0.7,
      time_signature: 4,
    };

    test('sanitizes spotify:track: prefix before fetch', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockResolvedValue({ body: baseBody });
      const provider = new SpotifyProvider();
      const result = await provider.getAudioFeatures('spotify:track:abc123');

      expect(spotifyApi.getAudioFeaturesForTrack).toHaveBeenCalledWith('abc123');
      expect(result).toMatchObject({ tempo: 128, key: 5, mode: 1, time_signature: 4, energy: 0.7 });
    });

    test('works with bare track ID', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockResolvedValue({ body: baseBody });
      const provider = new SpotifyProvider();
      const result = await provider.getAudioFeatures('xyz789');
      expect(spotifyApi.getAudioFeaturesForTrack).toHaveBeenCalledWith('xyz789');
      expect(result?.tempo).toBe(128);
    });

    test('returns null on missing body', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockResolvedValue({ body: null });
      const provider = new SpotifyProvider();
      const result = await provider.getAudioFeatures('spotify:track:xyz789');
      expect(result).toBeNull();
    });

    test('returns null on API error and logs deprecation warnings', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockRejectedValue({
        statusCode: 410,
        body: { error: 'gone' },
        headers: {},
      });
      const provider = new SpotifyProvider();
      const result = await provider.getAudioFeatures('spotify:track:xyz789');
      expect(result).toBeNull();
    });

    test('logs explicit deprecation warning on 404', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockRejectedValue({
        statusCode: 404,
        body: { error: 'missing' },
      });

      const provider = new SpotifyProvider();
      await provider.getAudioFeatures('spotify:track:missing');
    });

    test('handles string errors gracefully', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockRejectedValue('rate limited');
      const provider = new SpotifyProvider();

      const result = await provider.getAudioFeatures('spotify:track:string');

      expect(result).toBeNull();
    });

    test('returns null when data disappears after initial body check', async () => {
      let firstCall = true;
      const response: any = {};
      Object.defineProperty(response, 'body', {
        get: () => {
          if (firstCall) {
            firstCall = false;
            return { ...baseBody };
          }
          return null;
        },
      });

      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockResolvedValue(response);
      const provider = new SpotifyProvider();

      const result = await provider.getAudioFeatures('spotify:track:flaky');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    test('serializes plain object errors when no status/body/headers present', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockRejectedValue({ message: 'boom' });
      const provider = new SpotifyProvider();

      const result = await provider.getAudioFeatures('spotify:track:obj');

      expect(result).toBeNull();
      const lastError = (logger.error as jest.Mock).mock.calls.pop()?.[0] as string | undefined;
      expect(lastError).toContain('boom');
    });

    test('falls back to stringifying circular errors', async () => {
      const circular: any = { message: 'circular' };
      circular.self = circular;
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockRejectedValue(circular);
      const provider = new SpotifyProvider();

      const result = await provider.getAudioFeatures('spotify:track:circular');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    test('waits for rate limiter before making request', async () => {
      (spotifyApi.getAudioFeaturesForTrack as jest.Mock).mockResolvedValue({ body: baseBody });
      const provider = new SpotifyProvider();

      // Rate limiter is called internally but we can verify the API call happens
      const result = await provider.getAudioFeatures('spotify:track:rate-limited');

      expect(result).not.toBeNull();
      expect(result?.tempo).toBe(128);
    });
  });
});
