import { SpotifyProvider } from '../src/providers/spotifyProvider';
import { spotifyApi } from '../src/auth';
import { Logger } from '../src/logger';

jest.mock('../src/auth', () => ({
  spotifyApi: {
    getMe: jest.fn(),
    getAudioFeaturesForTrack: jest.fn(),
  },
}));

jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
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
      expect(Logger.error).toHaveBeenCalled();
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
      expect(Logger.error).toHaveBeenCalled();
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
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
