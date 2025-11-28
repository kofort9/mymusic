import { AudioFeatureProvider } from './types';
import { AudioFeatures, TrackID } from '../types';
import { logger } from '../utils/logger';
import { prisma } from '../dbClient';

export class DatabaseProvider implements AudioFeatureProvider {
  name = 'database';

  getName(): string {
    return this.name;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test DB connection by trying to fetch count
      await prisma.track.count();
      return true;
    } catch (error) {
      logger.error(`[DatabaseProvider] DB not available: ${error}`, { error });
      return false;
    }
  }

  async getAudioFeatures(
    trackId: TrackID,
    _trackName?: string,
    _artist?: string
  ): Promise<AudioFeatures | null> {
    try {
      logger.info(`[DatabaseProvider] Looking up ${trackId} in local DB...`);

      const track = await prisma.track.findUnique({
        where: { spotifyId: trackId },
      });

      if (!track) {
        logger.info(`[DatabaseProvider] Track ${trackId} not found in DB`);
        return null;
      }

      logger.info(`[DatabaseProvider] Found track: ${track.title} by ${track.artist}`);

      return {
        tempo: track.bpm,
        key: track.key,
        mode: track.mode,
        energy: track.energy || undefined,
        valence: track.valence || undefined,
        danceability: track.danceability || undefined,
        acousticness: track.acousticness || undefined,
        instrumentalness: track.instrumentalness || undefined,
        liveness: track.liveness || undefined,
        speechiness: track.speechiness || undefined,
        time_signature: track.timeSignature || undefined,
      };
    } catch (error) {
      logger.error(`[DatabaseProvider] Error fetching from DB: ${error}`, { error });
      return null;
    }
  }
}
