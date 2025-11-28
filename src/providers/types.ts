import { AudioFeatures, TrackID } from '../types';

/**
 * Audio Feature Provider Interface
 *
 * Allows for multiple backend services to provide audio analysis data.
 * Implementations can include Spotify, self-hosted services, or third-party APIs.
 */
export interface AudioFeatureProvider {
  /**
   * Get audio features for a track
   * @param trackId The track identifier
   * @param trackName Optional track name (required for search-based providers like SongBPM)
   * @param artist Optional artist name (required for search-based providers like SongBPM)
   * @returns AudioFeatures or null if unavailable
   */
  getAudioFeatures(
    trackId: TrackID,
    trackName?: string,
    artist?: string
  ): Promise<AudioFeatures | null>;

  /**
   * Get provider name for logging
   */
  getName(): string;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}
