import { pollCurrentlyPlaying } from '../src/spotifyClient';
import { spotifyApi, saveTokens } from '../src/auth';
import { Logger } from '../src/logger';

// Mock the auth module
jest.mock('../src/auth', () => ({
  spotifyApi: {
    getMyCurrentPlayingTrack: jest.fn(),
    refreshAccessToken: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    getRefreshToken: jest.fn()
  },
  saveTokens: jest.fn()
}));

// Mock Logger
jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Spotify Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pollCurrentlyPlaying', () => {
    test('returns track data when track is playing', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            id: 'track123',
            name: 'Test Track',
            artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }],
            duration_ms: 180000
          },
          progress_ms: 50000,
          timestamp: 1234567890,
          is_playing: true,
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).not.toBeNull();
      expect(result?.track_id).toBe('spotify:track:track123');
      expect(result?.track_name).toBe('Test Track');
      expect(result?.artist).toBe('Artist 1, Artist 2');
      expect(result?.progress_ms).toBe(50000);
      expect(result?.duration_ms).toBe(180000);
      expect(result?.isPlaying).toBe(true);
    });

    test('returns null when no track is playing (204 status)', async () => {
      const mockResponse = {
        statusCode: 204,
        body: null
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).toBeNull();
    });

    test('returns null when response body is null', async () => {
      const mockResponse = {
        statusCode: 200,
        body: null
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).toBeNull();
    });

    test('returns null when item is missing', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).toBeNull();
    });

    test('returns null for non-track media (podcast)', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            id: 'episode123',
            name: 'Test Podcast'
          },
          currently_playing_type: 'episode'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).toBeNull();
    });

    test('returns null for tracks without ID (local files)', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            name: 'Local Track',
            artists: [{ name: 'Local Artist' }],
            duration_ms: 180000
          },
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).toBeNull();
    });

    test('handles missing progress_ms gracefully', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            id: 'track123',
            name: 'Test Track',
            artists: [{ name: 'Artist 1' }],
            duration_ms: 180000
          },
          timestamp: 1234567890,
          is_playing: true,
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const result = await pollCurrentlyPlaying();

      expect(result).not.toBeNull();
      expect(result?.progress_ms).toBe(0);
    });

    test('handles missing timestamp gracefully', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            id: 'track123',
            name: 'Test Track',
            artists: [{ name: 'Artist 1' }],
            duration_ms: 180000
          },
          progress_ms: 50000,
          is_playing: true,
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockResolvedValue(mockResponse);

      const beforeTime = Date.now();
      const result = await pollCurrentlyPlaying();
      const afterTime = Date.now();

      expect(result).not.toBeNull();
      expect(result?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('refreshes token on 401 error and retries', async () => {
      const errorResponse = {
        statusCode: 401,
        message: 'Unauthorized'
      };

      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            id: 'track123',
            name: 'Test Track',
            artists: [{ name: 'Artist 1' }],
            duration_ms: 180000
          },
          progress_ms: 50000,
          timestamp: 1234567890,
          is_playing: true,
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock)
        .mockRejectedValueOnce(errorResponse)
        .mockResolvedValueOnce(mockResponse);
      
      (spotifyApi.refreshAccessToken as jest.Mock).mockResolvedValue({
        body: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token'
        }
      });
      (spotifyApi.getRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');

      const result = await pollCurrentlyPlaying();

      expect(spotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(spotifyApi.setAccessToken).toHaveBeenCalledWith('new_access_token');
      expect(saveTokens).toHaveBeenCalledWith({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token'
      });
      expect(result).not.toBeNull();
      expect(result?.track_id).toBe('spotify:track:track123');
    });

    test('handles refresh failure gracefully', async () => {
      const errorResponse = {
        statusCode: 401,
        message: 'Unauthorized'
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockRejectedValue(errorResponse);
      (spotifyApi.refreshAccessToken as jest.Mock).mockRejectedValue(new Error('Refresh failed'));

      const result = await pollCurrentlyPlaying();

      expect(Logger.error).toHaveBeenCalledWith(
        'Session expired. Please restart to re-authenticate.',
        expect.any(Error)
      );
      expect(result).toBeNull();
    });

    test('handles refresh without new refresh token', async () => {
      const errorResponse = {
        statusCode: 401,
        message: 'Unauthorized'
      };

      const mockResponse = {
        statusCode: 200,
        body: {
          item: {
            id: 'track123',
            name: 'Test Track',
            artists: [{ name: 'Artist 1' }],
            duration_ms: 180000
          },
          progress_ms: 50000,
          timestamp: 1234567890,
          is_playing: true,
          currently_playing_type: 'track'
        }
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock)
        .mockRejectedValueOnce(errorResponse)
        .mockResolvedValueOnce(mockResponse);
      
      (spotifyApi.refreshAccessToken as jest.Mock).mockResolvedValue({
        body: {
          access_token: 'new_access_token'
          // No refresh_token in response
        }
      });
      (spotifyApi.getRefreshToken as jest.Mock).mockReturnValue('old_refresh_token');

      const result = await pollCurrentlyPlaying();

      expect(spotifyApi.setRefreshToken).not.toHaveBeenCalled();
      expect(saveTokens).toHaveBeenCalledWith({
        access_token: 'new_access_token',
        refresh_token: 'old_refresh_token'
      });
      expect(result).not.toBeNull();
    });

    test('handles non-401 errors gracefully', async () => {
      const errorResponse = {
        statusCode: 500,
        message: 'Internal Server Error'
      };

      (spotifyApi.getMyCurrentPlayingTrack as jest.Mock).mockRejectedValue(errorResponse);

      const result = await pollCurrentlyPlaying();

      expect(Logger.error).toHaveBeenCalledWith('Polling error:', errorResponse);
      expect(result).toBeNull();
    });
  });
});
