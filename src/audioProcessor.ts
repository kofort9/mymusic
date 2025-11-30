import { AudioFeatures, TrackID, AudioFeaturesSchema } from './types';
import { logger } from './utils/logger';
import { ProviderFactory } from './providers/factory';
import { AudioFeatureProvider } from './providers/types';
import { prisma } from './dbClient';
import { convertToCamelot } from './camelot';
import { checkIfTrackIsLiked } from './spotifyClient';

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

// Exported for targeted cache behavior tests
export { LRUCache as TestLRUCache };

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
    logger.info(`Cache hit for ${trackId}`);
    return featureCache.get(trackId)!;
  }

  // Initialize providers if needed
  if (!providers) {
    const providerNames = (process.env.AUDIO_FEATURE_PROVIDER || 'spotify')
      .split(',')
      .map(p => p.trim());

    providers = await ProviderFactory.createProviderChain(providerNames);

    if (providers.length === 0) {
      logger.error('No audio feature providers available!');
      // Fallback to Spotify
      const spotifyProvider = ProviderFactory.getDefaultProvider();
      providers = [spotifyProvider];
    }
  }

  // Try each provider in order
  for (const provider of providers) {
    try {
      logger.info(`Fetching features for ${trackId}...`);
      const features = await provider.getAudioFeatures(trackId, trackName, artist);

      if (features) {
        const validation = AudioFeaturesSchema.safeParse(features);
        if (!validation.success) {
          logger.error(`Validation failed for ${trackId}`, { errors: validation.error.format() });
          continue; // Try next provider
        }

        logger.info(`Fetched: BPM=${features.tempo}, Key=${features.key}, Mode=${features.mode}`);
        featureCache.set(trackId, features);

        // Passive enrichment: Auto-save to DB (Pokédex style!)
        passivelyEnrichDB(trackId, trackName, artist, features).catch((err: Error) => {
          logger.warn(`Passive enrichment failed for ${trackId}`, { error: err });
        });

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

      logger.error(`Audio features fetch error for ${trackId}:${errorDetails}`, { error });
      continue; // Try next provider
    }
  }

  return null;
}

/**
 * Passively enrich the database with audio features captured during playback.
 * This runs in the background and doesn't block the main flow.
 * Like a Pokédex - capture data as you play songs!
 */
async function passivelyEnrichDB(
  trackId: TrackID,
  trackName?: string,
  artist?: string,
  features?: AudioFeatures
): Promise<void> {
  if (!features || !trackName || !artist) return;

  try {
    // Check if track is in liked songs before enriching (v0.1.2+)
    const isLiked = await checkIfTrackIsLiked(trackId);
    if (!isLiked) {
      logger.debug(`🎮 Pokédex: Skipping non-liked track: ${trackName} - ${artist}`);
      return;
    }

    // Check if track already exists
    const existing = await prisma.track.findUnique({
      where: { spotifyId: trackId },
    });

    // Only save if it doesn't exist or has incomplete features
    if (!existing || existing.bpm === 0 || existing.key === -1) {
      const camelotKey = convertToCamelot(features.key, features.mode);

      await prisma.track.upsert({
        where: { spotifyId: trackId },
        update: {
          bpm: features.tempo,
          key: features.key,
          mode: features.mode,
          camelotKey,
          timeSignature: features.time_signature || 4,
          energy: features.energy || 0,
          valence: features.valence || 0,
          danceability: features.danceability || 0,
          acousticness: features.acousticness || 0,
          instrumentalness: features.instrumentalness || 0,
          liveness: features.liveness || 0,
          speechiness: features.speechiness || 0,
        },
        create: {
          spotifyId: trackId,
          title: trackName,
          artist: artist,
          album: 'Unknown', // We don't have album info here
          camelotKey,
          bpm: features.tempo,
          key: features.key,
          mode: features.mode,
          timeSignature: features.time_signature || 4,
          energy: features.energy || 0,
          valence: features.valence || 0,
          danceability: features.danceability || 0,
          acousticness: features.acousticness || 0,
          instrumentalness: features.instrumentalness || 0,
          liveness: features.liveness || 0,
          speechiness: features.speechiness || 0,
          durationMs: 0, // We don't have duration here
        },
      });

      logger.info(`📝 Passively enriched DB: ${trackName} - ${artist}`);
    }
  } catch (error) {
    // Don't throw - this is background enrichment
    logger.debug(`Passive enrichment skipped for ${trackId}`, { error });
  }
}
