import { getAudioFeatures, resetAudioProcessor } from '../src/audioProcessor';
import { Logger } from '../src/logger';
import { ProviderFactory } from '../src/providers/factory';
import { AudioFeatureProvider } from '../src/providers/types';

// Mock Logger
jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn()
  }
}));

// Mock ProviderFactory
jest.mock('../src/providers/factory');

describe('Audio Processor', () => {
  const mockTrackId = 'test_track_id';
  let mockProvider: jest.Mocked<AudioFeatureProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the audio processor cache and providers between tests
    resetAudioProcessor();
    
    // Create a mock provider
    mockProvider = {
      getName: jest.fn().mockReturnValue('MockProvider'),
      isAvailable: jest.fn().mockResolvedValue(true),
      getAudioFeatures: jest.fn()
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
      energy: 0.8
    });

    const features = await getAudioFeatures(mockTrackId);

    expect(features).not.toBeNull();
    expect(features?.tempo).toBe(128.5); // BPM check
    expect(features?.key).toBe(5);       // Key check
    expect(features?.mode).toBe(0);      // Mode check
    expect(features?.energy).toBe(0.8);  // Energy check
    expect(mockProvider.getAudioFeatures).toHaveBeenCalledWith(mockTrackId, undefined, undefined);
    expect(Logger.log).toHaveBeenCalledWith(`Fetching features for ${mockTrackId}...`);
    expect(Logger.log).toHaveBeenCalledWith('Fetched: BPM=128.5, Key=5, Mode=0');
  });

  test('handles null response from provider gracefully', async () => {
    // Provider returns null (e.g., track not found)
    mockProvider.getAudioFeatures.mockResolvedValue(null);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.log).toHaveBeenCalledWith(`Fetching features for ${mockTrackId}...`);
  });

  test('caches audio features and returns cached value on second call', async () => {
    const mockFeatures = {
      tempo: 128.5,
      key: 5,
      mode: 0,
      energy: 0.8
    };

    mockProvider.getAudioFeatures.mockResolvedValue(mockFeatures);

    // First call - should fetch from provider
    const features1 = await getAudioFeatures(mockTrackId);
    expect(features1).not.toBeNull();
    expect(mockProvider.getAudioFeatures).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(`Fetching features for ${mockTrackId}...`);

    jest.clearAllMocks();

    // Second call - should return from cache
    const features2 = await getAudioFeatures(mockTrackId);
    expect(features2).toEqual(features1);
    expect(mockProvider.getAudioFeatures).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(`Cache hit for ${mockTrackId}`);
  });

  test('handles provider error gracefully', async () => {
    // Provider throws an error
    mockProvider.getAudioFeatures.mockRejectedValue(new Error('Provider error'));

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      expect.any(Error)
    );
  });

  test('handles error with statusCode', async () => {
    const error = {
      statusCode: 404,
      message: 'Not found'
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      error
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Status: 404'),
      error
    );
  });

  test('handles error with body', async () => {
    const error = {
      body: { error: 'Invalid track ID' }
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      error
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Body:'),
      error
    );
  });

  test('handles error with headers', async () => {
    const error = {
      headers: { 'x-rate-limit': '100' }
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      error
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Headers:'),
      error
    );
  });

  test('handles error with all properties', async () => {
    const error = {
      statusCode: 500,
      body: { error: 'Internal server error' },
      headers: { 'content-type': 'application/json' }
    };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      error
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Status: 500'),
      error
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Body:'),
      error
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Headers:'),
      error
    );
  });

  test('handles error without specific properties', async () => {
    const error = { customProperty: 'value' };

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      error
    );
  });

  test('handles string error', async () => {
    const error = 'Simple string error';

    mockProvider.getAudioFeatures.mockRejectedValue(error);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Audio features fetch error for ${mockTrackId}:`),
      error
    );
  });

  test('handles error that cannot be stringified', async () => {
    const circularError: any = { message: 'Error' };
    circularError.self = circularError; // Create circular reference

    mockProvider.getAudioFeatures.mockRejectedValue(circularError);

    const features = await getAudioFeatures(mockTrackId);
    expect(features).toBeNull();
    expect(Logger.error).toHaveBeenCalled();
  });

  test('handles missing energy field', async () => {
    // Provider returns features without energy field
    mockProvider.getAudioFeatures.mockResolvedValue({
      tempo: 128.5,
      key: 5,
      mode: 0
      // energy is missing
    });

    const features = await getAudioFeatures(mockTrackId);
    expect(features).not.toBeNull();
    expect(features?.tempo).toBe(128.5);
    expect(features?.key).toBe(5);
    expect(features?.mode).toBe(0);
    expect(features?.energy).toBeUndefined();
  });
});
