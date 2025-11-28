import {
  CustomApiProvider,
  parseMusicalKey,
  parseTimeSignature,
} from '../src/providers/customApiProvider';

// Mock the Logger to prevent console output during tests
jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('parseMusicalKey', () => {
  describe('Major keys', () => {
    test('parses "C Major" correctly', () => {
      expect(parseMusicalKey('C Major')).toEqual({ key: 0, mode: 1 });
    });

    test('parses "C# Major" correctly', () => {
      expect(parseMusicalKey('C# Major')).toEqual({ key: 1, mode: 1 });
    });

    test('parses "Db Major" correctly', () => {
      expect(parseMusicalKey('Db Major')).toEqual({ key: 1, mode: 1 });
    });

    test('parses "D Major" correctly', () => {
      expect(parseMusicalKey('D Major')).toEqual({ key: 2, mode: 1 });
    });

    test('parses "F# Major" correctly', () => {
      expect(parseMusicalKey('F# Major')).toEqual({ key: 6, mode: 1 });
    });

    test('parses "G Major" correctly', () => {
      expect(parseMusicalKey('G Major')).toEqual({ key: 7, mode: 1 });
    });

    test('parses "A Major" correctly', () => {
      expect(parseMusicalKey('A Major')).toEqual({ key: 9, mode: 1 });
    });

    test('parses "Bb Major" correctly', () => {
      expect(parseMusicalKey('Bb Major')).toEqual({ key: 10, mode: 1 });
    });

    test('parses "B Major" correctly', () => {
      expect(parseMusicalKey('B Major')).toEqual({ key: 11, mode: 1 });
    });
  });

  describe('Minor keys', () => {
    test('parses "A Minor" correctly', () => {
      expect(parseMusicalKey('A Minor')).toEqual({ key: 9, mode: 0 });
    });

    test('parses "C Minor" correctly', () => {
      expect(parseMusicalKey('C Minor')).toEqual({ key: 0, mode: 0 });
    });

    test('parses "F# Minor" correctly', () => {
      expect(parseMusicalKey('F# Minor')).toEqual({ key: 6, mode: 0 });
    });

    test('parses "Eb Minor" correctly', () => {
      expect(parseMusicalKey('Eb Minor')).toEqual({ key: 3, mode: 0 });
    });

    test('parses "G# Minor" correctly', () => {
      expect(parseMusicalKey('G# Minor')).toEqual({ key: 8, mode: 0 });
    });
  });

  describe('Case insensitivity', () => {
    test('parses lowercase "c major"', () => {
      expect(parseMusicalKey('c major')).toEqual({ key: 0, mode: 1 });
    });

    test('parses mixed case "C MAJOR"', () => {
      expect(parseMusicalKey('C MAJOR')).toEqual({ key: 0, mode: 1 });
    });

    test('parses "a minor" lowercase', () => {
      expect(parseMusicalKey('a minor')).toEqual({ key: 9, mode: 0 });
    });
  });

  describe('Alternative notations', () => {
    test('parses "C Maj" shorthand', () => {
      expect(parseMusicalKey('C Maj')).toEqual({ key: 0, mode: 1 });
    });

    test('parses "A Min" shorthand', () => {
      expect(parseMusicalKey('A Min')).toEqual({ key: 9, mode: 0 });
    });

    test('handles extra whitespace', () => {
      expect(parseMusicalKey('  C Major  ')).toEqual({ key: 0, mode: 1 });
    });
  });

  describe('Edge cases and invalid inputs', () => {
    test('returns null for empty string', () => {
      expect(parseMusicalKey('')).toBeNull();
    });

    test('returns null for null input', () => {
      expect(parseMusicalKey(null as unknown as string)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(parseMusicalKey(undefined as unknown as string)).toBeNull();
    });

    test('returns null for invalid key name', () => {
      expect(parseMusicalKey('X Major')).toBeNull();
    });

    test('returns null for number input', () => {
      expect(parseMusicalKey(123 as unknown as string)).toBeNull();
    });

    test('defaults to major when mode not specified', () => {
      // This is an edge case - if just "C" is provided
      expect(parseMusicalKey('C')).toEqual({ key: 0, mode: 1 });
    });
  });
});

describe('parseTimeSignature', () => {
  test('parses "4/4" correctly', () => {
    expect(parseTimeSignature('4/4')).toBe(4);
  });

  test('parses "3/4" correctly', () => {
    expect(parseTimeSignature('3/4')).toBe(3);
  });

  test('parses "6/8" correctly', () => {
    expect(parseTimeSignature('6/8')).toBe(6);
  });

  test('parses "2/4" correctly', () => {
    expect(parseTimeSignature('2/4')).toBe(2);
  });

  test('parses "5/4" correctly', () => {
    expect(parseTimeSignature('5/4')).toBe(5);
  });

  test('parses plain number "4"', () => {
    expect(parseTimeSignature('4')).toBe(4);
  });

  test('returns 4 as default for empty string', () => {
    expect(parseTimeSignature('')).toBe(4);
  });

  test('returns 4 as default for null', () => {
    expect(parseTimeSignature(null as unknown as string)).toBe(4);
  });

  test('returns 4 as default for undefined', () => {
    expect(parseTimeSignature(undefined as unknown as string)).toBe(4);
  });

  test('returns 4 as default for invalid string', () => {
    expect(parseTimeSignature('invalid')).toBe(4);
  });
});

describe('CustomApiProvider', () => {
  let provider: CustomApiProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CUSTOM_API_KEY: 'test-api-key',
      CUSTOM_API_URL: 'https://api.test.com',
    };
    provider = new CustomApiProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getName', () => {
    test('returns "SongBPM"', () => {
      expect(provider.getName()).toBe('SongBPM');
    });
  });

  describe('isAvailable', () => {
    test('returns true when API key is configured', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    test('returns false when API key is not configured', async () => {
      process.env.CUSTOM_API_KEY = '';
      const providerNoKey = new CustomApiProvider();
      const result = await providerNoKey.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('fetchSearchResults', () => {
    test('makes correct API call and returns HTML content', async () => {
      const mockHtml = '<html><body>Search results</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ html_content: mockHtml }),
      });

      const result = await provider.fetchSearchResults('Daft Punk Around the World');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/fetch_search_results',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: JSON.stringify({ query: 'Daft Punk Around the World' }),
        })
      );
      expect(result).toBe(mockHtml);
    });

    test('throws error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(provider.fetchSearchResults('test')).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      );
    });
  });

  describe('extractTrackUrl', () => {
    test('makes correct API call and returns track URL', async () => {
      const mockUrl = 'https://songbpm.com/@daft-punk/around-the-world';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ track_url: mockUrl }),
      });

      const result = await provider.extractTrackUrl('<html>search results</html>');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/extract_first_track_url',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ search_html: '<html>search results</html>' }),
        })
      );
      expect(result).toBe(mockUrl);
    });
  });

  describe('fetchTrackPage', () => {
    test('makes correct API call and returns track page HTML', async () => {
      const mockHtml = '<html><body>Track page</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ html_content: mockHtml }),
      });

      const result = await provider.fetchTrackPage('https://songbpm.com/@artist/track');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/fetch_track_page',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ track_url: 'https://songbpm.com/@artist/track' }),
        })
      );
      expect(result).toBe(mockHtml);
    });
  });

  describe('extractTrackMetadata', () => {
    test('makes correct API call and returns metadata', async () => {
      const mockMetadata = {
        bpm: 120,
        duration: '3:45',
        musical_key: 'C Major',
        time_signature: '4/4',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata,
      });

      const result = await provider.extractTrackMetadata('<html>track page</html>');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/extract_track_metadata',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ track_html: '<html>track page</html>' }),
        })
      );
      expect(result).toEqual(mockMetadata);
    });
  });

  describe('getAudioFeatures', () => {
    test('returns null when no track name or artist provided', async () => {
      const result = await provider.getAudioFeatures('spotify:track:123');
      expect(result).toBeNull();
    });

    test('completes full workflow and returns AudioFeatures', async () => {
      // Mock all 4 API calls in sequence
      mockFetch
        // Step 1: fetch_search_results
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>search</html>' }),
        })
        // Step 2: extract_first_track_url
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ track_url: 'https://songbpm.com/@daft-punk/around-the-world' }),
        })
        // Step 3: fetch_track_page
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>track</html>' }),
        })
        // Step 4: extract_track_metadata
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bpm: 121,
            duration: '7:09',
            musical_key: 'A Minor',
            time_signature: '4/4',
          }),
        });

      const result = await provider.getAudioFeatures(
        'spotify:track:123',
        'Around the World',
        'Daft Punk'
      );

      expect(result).toEqual({
        tempo: 121,
        key: 9, // A = 9
        mode: 0, // Minor = 0
        time_signature: 4,
      });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    test('returns null when no track found in search', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>search</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ track_url: '' }), // No track found
        });

      const result = await provider.getAudioFeatures(
        'spotify:track:123',
        'NonexistentTrack',
        'Unknown Artist'
      );

      expect(result).toBeNull();
    });

    test('returns null when musical key cannot be parsed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>search</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ track_url: 'https://songbpm.com/@artist/track' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>track</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bpm: 120,
            duration: '3:45',
            musical_key: 'Invalid Key Format',
            time_signature: '4/4',
          }),
        });

      const result = await provider.getAudioFeatures('spotify:track:123', 'Track', 'Artist');

      expect(result).toBeNull();
    });

    test('returns null when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.getAudioFeatures('spotify:track:123', 'Track', 'Artist');

      expect(result).toBeNull();
    });

    test('works with only artist name', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>search</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ track_url: 'https://songbpm.com/@artist/track' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>track</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bpm: 128,
            duration: '4:00',
            musical_key: 'F# Minor',
            time_signature: '4/4',
          }),
        });

      const result = await provider.getAudioFeatures(
        'spotify:track:123',
        undefined,
        'Daft Punk'
      );

      expect(result).toEqual({
        tempo: 128,
        key: 6,
        mode: 0,
        time_signature: 4,
      });
    });

    test('works with only track name', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>search</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ track_url: 'https://songbpm.com/@artist/track' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ html_content: '<html>track</html>' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bpm: 100,
            duration: '3:30',
            musical_key: 'E Major',
            time_signature: '3/4',
          }),
        });

      const result = await provider.getAudioFeatures(
        'spotify:track:123',
        'Around the World',
        undefined
      );

      expect(result).toEqual({
        tempo: 100,
        key: 4, // E = 4
        mode: 1, // Major = 1
        time_signature: 3,
      });
    });
  });
});

