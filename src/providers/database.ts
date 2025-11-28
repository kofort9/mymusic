import { AudioFeatureProvider } from './types';
import { AudioFeatures, TrackID } from '../types';
import { Logger } from '../logger';
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
      Logger.error(`[DatabaseProvider] DB not available: ${error}`);
      return false;
    }
  }

  async getAudioFeatures(
    trackId: TrackID,
    _trackName?: string,
    _artist?: string
  ): Promise<AudioFeatures | null> {
    try {
      Logger.log(`[DatabaseProvider] Looking up ${trackId} in local DB...`);

      const track = await prisma.track.findUnique({
        where: { spotifyId: trackId },
      });

      if (!track) {
        Logger.log(`[DatabaseProvider] Track ${trackId} not found in DB`);
        return null;
      }

      Logger.log(`[DatabaseProvider] Found track: ${track.title} by ${track.artist}`);

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
      Logger.error(`[DatabaseProvider] Error fetching from DB: ${error}`);
      return null;
    }
  }
}
