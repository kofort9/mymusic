import { spotifyApi } from '../auth';
import { AudioFeatures, TrackID } from '../types';
import { logger } from '../utils/logger';
import { AudioFeatureProvider } from './types';
import { RateLimiter } from '../utils/RateLimiter';

const spotifyLimiter = new RateLimiter('Spotify', {
  tokensPerInterval: 10,
  interval: 1000, // 10 requests per second
});

function sanitizeSpotifyTrackId(trackId: TrackID): string {
  return trackId.replace(/^spotify:track:/, '');
}

/**
 * Spotify Audio Feature Provider
 *
 * NOTE: Spotify's /audio-features endpoint is deprecated.
 * This provider may stop working in the future.
 * Consider migrating to an alternative provider.
 */
export class SpotifyProvider implements AudioFeatureProvider {
  getName(): string {
    return 'Spotify';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await spotifyApi.getMe();
      return true;
    } catch (error) {
      logger.error('Spotify provider not available:', { error });
      return false;
    }
  }

  async getAudioFeatures(
    trackId: TrackID,
    _trackName?: string,
    _artist?: string
  ): Promise<AudioFeatures | null> {
    // trackName and artist are ignored for Spotify (ID-based provider)
    try {
      const cleanId = sanitizeSpotifyTrackId(trackId);
      await spotifyLimiter.waitForToken();
      logger.info(`[${this.getName()}] Fetching features for ${trackId}...`);
      const response = await spotifyApi.getAudioFeaturesForTrack(cleanId);

      if (!response.body) {
        logger.error(`[${this.getName()}] No audio features body for track ${trackId}`);
        return null;
      }

      const data = response.body;

      if (!data) {
        logger.error(`[${this.getName()}] Audio features data is null for track ${trackId}`);
        return null;
      }

      const features: AudioFeatures = {
        tempo: data.tempo,
        key: data.key,
        mode: data.mode,
        energy: data.energy,
        time_signature: data.time_signature,
      };

      logger.info(
        `[${this.getName()}] Fetched: BPM=${features.tempo}, Key=${features.key}, Mode=${features.mode}, TimeSig=${features.time_signature}`
      );

      return features;
    } catch (error: unknown) {
      let errorDetails = '';
      const err = error as { statusCode?: number; body?: unknown; headers?: unknown };
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

      logger.error(
        `[${this.getName()}] Audio features fetch error for ${trackId}: ${errorDetails}`,
        { error }
      );

      // Log deprecation warning if we get a specific error
      if (err.statusCode === 410 || err.statusCode === 404) {
        logger.warn(
          `[${this.getName()}] WARNING: Endpoint may be deprecated! Consider switching to an alternative provider.`
        );
      }

      return null;
    }
  }
}
