import { getAudioFeatures, resetAudioProcessor, TestLRUCache } from '../src/audioProcessor';
import { Logger } from '../src/logger';
import { ProviderFactory } from '../src/providers/factory';
import { AudioFeatureProvider } from '../src/providers/types';

// Mock Logger
jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ProviderFactory
jest.mock('../src/providers/factory');

describe('Audio Processor', () => {
  const mockTrackId = 'spotify:track:test_track_id';
  let mockProvider: jest.Mocked<AudioFeatureProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the audio processor cache and providers between tests
    resetAudioProcessor();

    // Create a mock provider
    mockProvider = {
      getName: jest.fn().mockReturnValue('MockProvider'),
      isAvailable: jest.fn().mockResolvedValue(true),
      getAudioFeatures: jest.fn(),
    };

    // Mock the ProviderFactory to return our mock provider
    (ProviderFactory.createProviderChain as jest.Mock).mockResolvedValue([mockProvider]);
    (ProviderFactory.getDefaultProvider as jest.Mock).mockReturnValue(mockProvider);
  });

  test('fetches and returns valid audio features (BPM and Key)', async () => {
    // Mock successful response from provider
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 128.5,
      key: 5,
      mode: 0,
      energy: 0.8,
    });

    const features = await getAudioFeatures(mockTrackId);

    expect(features).not.toBeNull();
    expect(features?.tempo).toBe(128.5); // BPM check
    expect(features?.key).toBe(5); // Key check
    expect(features?.mode).toBe(0); // Mode check
    expect(features?.energy).toBe(0.8); // Energy check
    expect(mockProvider.getAudioFeatures).toHaveBeenCalledWith(mockTrackId, undefined, undefined);
  });

  test('handles null response from provider gracefully', async () => {
    // Provider returns null (e.g., track not found)
    mockProvider.getAudioFeatures.mockResolvedValue(null);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('caches audio features and returns cached value on second call', async () => {
    const mockFeatures = {
      tempo: 128.5,
      key: 5,
      mode: 0,
      energy: 0.8,
    };

    mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

    // First call - should fetch from provider
    const features1 = await getAudioFeatures(mockTrackId);
    expect(features1).not.toBeNull();
    expect(mockProvider.getAudioFeatures).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    // Second call - should return from cache
    const features2 = await getAudioFeatures(mockTrackId);
    expect(features2).toEqual(features1);
    expect(mockProvider.getAudioFeatures).not.toHaveBeenCalled();
  });

  test('handles provider error gracefully', async () => {
    // Provider throws an error
    mockProvider.getAudioFeatures.mockRejectedValue(new Error('Provider error'));

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles error with statusCode', async () => {
    const error = {
      statusCode: 404,
      message: 'Not found',
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles error with body', async () => {
    const error = {
      body: { error: 'Invalid track ID' },
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles error with headers', async () => {
    const error = {
      headers: { 'x-rate-limit': '100' },
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles error with all properties', async () => {
    const error = {
      statusCode: 500,
      body: { error: 'Internal server error' },
      headers: { 'content-type': 'application/json' },
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles error without specific properties', async () => {
    const error = { customProperty: 'value' };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles string error', async () => {
    const error = 'Simple string error';

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles error that cannot be stringified', async () => {
    const circularError: any = { message: 'Error' };
    circularError.self = circularError; // Create circular reference

    mockProvider.getAudioFeatures.mockRejectedValue(circularError);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('handles missing energy field', async () => {
    // Provider returns features without energy field
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 128.5,
      key: 5,
      mode: 0,
      // energy is missing
    });

    const features = await getAudioFeatures(mockTrackId);
    expect(features).not.toBeNull();
    expect(features?.tempo).toBe(128.5);
    expect(features?.key).toBe(5);
    expect(features?.mode).toBe(0);
    expect(features?.energy).toBeUndefined();
  });

  test('falls back to next provider when first returns null', async () => {
    const fallbackProvider: jest.Mocked<AudioFeatureProvider> = {
      getName: jest.fn().mockReturnValue('Fallback'),
      isAvailable: jest.fn().mockResolvedValue(true),
      getAudioFeatures: jest.fn().mockResolvedValue({
        tempo: 110,
        key: 1,
        mode: 1,
      }),
    };

    mockProvider.getAudioFeatures.mockResolvedValue(null);
    (ProviderFactory.createProviderChain as jest.Mock).mockResolvedValue([
      mockProvider,
      fallbackProvider,
    ]);

    const features = await getAudioFeatures(mockTrackId);
    expect(features?.tempo).toBe(110);
    expect(mockProvider.getAudioFeatures).toHaveBeenCalled();
    expect(fallbackProvider.getAudioFeatures).toHaveBeenCalled();
  });

  test('returns null when all providers fail', async () => {
    mockProvider.getAudioFeatures.mockRejectedValue(new Error('first fail'));
    const secondProvider: jest.Mocked<AudioFeatureProvider> = {
      getName: jest.fn().mockReturnValue('Second'),
      isAvailable: jest.fn().mockResolvedValue(true),
      getAudioFeatures: jest.fn().mockRejectedValue(new Error('second fail')),
    };

    (ProviderFactory.createProviderChain as jest.Mock).mockResolvedValue([
      mockProvider,
      secondProvider,
    ]);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('caches per track id (no cross-contamination)', async () => {
    const featureA = { tempo: 100, key: 1, mode: 1 };
    const featureB = { tempo: 105, key: 2, mode: 0 };

    mockProvider.getAudioFeatures.mockResolvedValueOnce(featureA).mockResolvedValueOnce(featureB);

    const first = await getAudioFeatures('trackA');
    const second = await getAudioFeatures('trackB');

    expect(first).toEqual(featureA);
    expect(second).toEqual(featureB);
    expect(mockProvider.getAudioFeatures).toHaveBeenCalledTimes(2);
  });

  test('falls back to default provider when provider chain is empty', async () => {
    const fallbackProvider: jest.Mocked<AudioFeatureProvider> = {
      getName: jest.fn().mockReturnValue('Fallback'),
      isAvailable: jest.fn(),
      getAudioFeatures: jest.fn().mockResolvedValue({
        tempo: 120,
        key: 7,
        mode: 1,
      }),
    };

    (ProviderFactory.createProviderChain as jest.Mock).mockResolvedValue([]);
    (ProviderFactory.getDefaultProvider as jest.Mock).mockReturnValue(fallbackProvider);

    const features = await getAudioFeatures('track-empty');

    expect(ProviderFactory.getDefaultProvider).toHaveBeenCalled();
    expect(fallbackProvider.getAudioFeatures).toHaveBeenCalledWith(
      'track-empty',
      undefined,
      undefined
    );
    expect(features).toEqual({ tempo: 120, key: 7, mode: 1 });
  });

  test('evicts oldest cached track when cache exceeds capacity', async () => {
    mockProvider.getAudioFeatures.mockResolvedValue({ tempo: 100, key: 1, mode: 1 });

    // Fill cache beyond its 100-item capacity
    const ids = Array.from({ length: 101 }, (_v, i) => `track-${i}`);
    for (const id of ids) {
      await getAudioFeatures(id);
    }

    expect(mockProvider.getAudioFeatures).toHaveBeenCalledTimes(101);

    // Oldest entry should have been evicted, so the provider is called again
    const features = await getAudioFeatures(ids[0]);
    expect(features).not.toBeNull();
    expect(mockProvider.getAudioFeatures).toHaveBeenCalledTimes(102);
  });

  test('rejects invalid tempo (too high)', async () => {
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 350, // Invalid: > 300
      key: 5,
      mode: 1,
    });

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull(); // Should be rejected by validation
  });

  test('rejects invalid tempo (negative)', async () => {
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: -10, // Invalid: < 0
      key: 5,
      mode: 1,
    });

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('rejects invalid key (too high)', async () => {
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 120,
      key: 15, // Invalid: > 11
      mode: 1,
    });

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('rejects invalid mode', async () => {
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 120,
      key: 5,
      mode: 2, // Invalid: > 1
    });

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
  });

  test('falls back to next provider when validation fails', async () => {
    const validProvider: jest.Mocked<AudioFeatureProvider> = {
      getName: jest.fn().mockReturnValue('ValidProvider'),
      isAvailable: jest.fn().mockResolvedValue(true),
      getAudioFeatures: jest.fn().mockResolvedValue({
        tempo: 120,
        key: 5,
        mode: 1,
      }),
    };

    // First provider returns invalid data
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 400, // Invalid
      key: 5,
      mode: 1,
    });

    (ProviderFactory.createProviderChain as jest.Mock).mockResolvedValue([
      mockProvider,
      validProvider,
    ]);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toEqual({ tempo: 120, key: 5, mode: 1 });
    expect(mockProvider.getAudioFeatures).toHaveBeenCalled();
    expect(validProvider.getAudioFeatures).toHaveBeenCalled();
  });

  test('LRUCache overwrites existing keys without growing size', () => {
    const cache = new TestLRUCache<string, number>(2);
    cache.set('track', 1);
    cache.set('track', 2); // triggers existing-key branch

    expect(cache.has('track')).toBe(true);
    expect(cache.get('track')).toBe(2);
  });

  test('LRUCache returns undefined for missing keys', () => {
    const cache = new TestLRUCache<string, number>(1);
    expect(cache.get('missing')).toBeUndefined();
  });

  test('respects AUDIO_FEATURE_PROVIDER environment override', async () => {
    const originalProviderEnv = process.env.AUDIO_FEATURE_PROVIDER;
    process.env.AUDIO_FEATURE_PROVIDER = 'custom, spotify';
    mockProvider.getAudioFeatures.mockResolvedValue({ tempo: 123, key: 1, mode: 1 });

    await getAudioFeatures('env-track');

    expect(ProviderFactory.createProviderChain).toHaveBeenCalledWith(['custom', 'spotify']);
    process.env.AUDIO_FEATURE_PROVIDER = originalProviderEnv;
  });
});
