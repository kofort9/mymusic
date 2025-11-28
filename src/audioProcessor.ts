import { AudioFeatures, TrackID } from './types';
import { Logger } from './logger';
import { ProviderFactory } from './providers/factory';
import { AudioFeatureProvider } from './providers/types';

// LRU Cache implementation with max size
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add to end
    this.cache.set(key, value);
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

let featureCache = new LRUCache<TrackID, AudioFeatures>(100);
let providers: AudioFeatureProvider[] | null = null;

/**
 * Reset the audio processor state (for testing purposes)
 */
export function resetAudioProcessor(): void {
  featureCache = new LRUCache<TrackID, AudioFeatures>(100);
  providers = null;
}

/**
 * Get audio features using the configured provider with fallback support
 * @param trackId The track identifier
 * @param trackName Optional track name for providers that need it
 * @param artist Optional artist name for providers that need it
 */
export async function getAudioFeatures(
  trackId: TrackID,
  trackName?: string,
  artist?: string
): Promise<AudioFeatures | null> {
  // Return cached if available
  if (featureCache.has(trackId)) {
    Logger.log(`Cache hit for ${trackId}`);
    return featureCache.get(trackId)!;
  }

  // Initialize providers if needed
  if (!providers) {
    const providerNames = (process.env.AUDIO_FEATURE_PROVIDER || 'spotify')
      .split(',')
      .map(p => p.trim());

    providers = await ProviderFactory.createProviderChain(providerNames);

    if (providers.length === 0) {
      Logger.error('No audio feature providers available!');
      // Fallback to Spotify
      const spotifyProvider = ProviderFactory.getDefaultProvider();
      providers = [spotifyProvider];
    }
  }

  // Try each provider in order
  for (const provider of providers) {
    try {
      Logger.log(`Fetching features for ${trackId}...`);
      const features = await provider.getAudioFeatures(trackId, trackName, artist);

      if (features) {
        Logger.log(`Fetched: BPM=${features.tempo}, Key=${features.key}, Mode=${features.mode}`);
        featureCache.set(trackId, features);
        return features;
      }
    } catch (error: unknown) {
      const err = error as { statusCode?: number; body?: unknown; headers?: unknown };
      let errorDetails = '';
      if (err.statusCode) errorDetails += ` Status: ${err.statusCode}`;
      if (err.body) errorDetails += ` Body: ${JSON.stringify(err.body)}`;
      if (err.headers) errorDetails += ` Headers: ${JSON.stringify(err.headers)}`;

      if (!errorDetails && typeof error === 'object') {
        try {
          errorDetails = JSON.stringify(error, null, 2);
        } catch (e) {
          errorDetails = String(error);
        }
      }

      Logger.error(`Audio features fetch error for ${trackId}:${errorDetails}`, error);
      continue; // Try next provider
    }
  }

  return null;
}
