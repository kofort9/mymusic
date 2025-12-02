import { spotifyApi, saveTokens } from './auth';
import { CurrentTrack } from './types';
import { logger } from './utils/logger';
import { CircuitBreaker } from './utils/CircuitBreaker';

const spotifyBreaker = new CircuitBreaker('SpotifyAPI', {
  failureThreshold: 3,
  resetTimeout: 30000,
});

/**
 * Check if a track is saved in the user's liked songs
 * @param trackId Full Spotify URI (spotify:track:xxx) or just the track ID
 * @returns Promise<boolean> - true if track is liked, false otherwise
 */
export async function checkIfTrackIsLiked(trackId: string): Promise<boolean> {
  try {
    // Extract just the ID if full URI is provided
    const cleanId = trackId.replace('spotify:track:', '');
    const response = await spotifyApi.containsMySavedTracks([cleanId]);
    return response.body[0] ?? false;
  } catch (error) {
    logger.warn(`Failed to check if track is liked: ${trackId}`, { error });
    return false; // Default to false on error (safer - don't enrich if uncertain)
  }
}

export async function pollCurrentlyPlaying(): Promise<CurrentTrack | null> {
  try {
    return await spotifyBreaker.execute(async () => {
      const response = await spotifyApi.getMyCurrentPlayingTrack();

      if (response.statusCode === 204 || !response.body || !response.body.item) {
        return null;
      }

      if (response.body.currently_playing_type !== 'track') {
        return null; // Podcast or other media
      }

      const track = response.body.item as SpotifyApi.TrackObjectFull; // Cast if needed, depending on types

      if (!track.id) return null; // Skip local files or invalid IDs

      return {
        track_id: `spotify:track:${track.id}`, // Use full URI to match database format
        track_name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        camelot_key: '', // Filled later
        audio_features: { tempo: 0, key: 0, mode: 0 }, // Filled later
        progress_ms: response.body.progress_ms || 0,
        duration_ms: track.duration_ms, // Fetch duration
        timestamp: response.body.timestamp || Date.now(),
        isPlaying: response.body.is_playing,
      };
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 401) {
      logger.info('Token expired, attempting refresh...');
      try {
        const data = await spotifyApi.refreshAccessToken();
        const newAccessToken = data.body['access_token'];
        // refresh_token might not be returned if it hasn't changed/rotated
        const newRefreshToken = data.body['refresh_token'] || spotifyApi.getRefreshToken();

        spotifyApi.setAccessToken(newAccessToken);
        if (data.body['refresh_token']) {
          spotifyApi.setRefreshToken(newRefreshToken as string);
        }

        if (newRefreshToken) {
          saveTokens({
            access_token: newAccessToken,
            refresh_token: newRefreshToken as string,
          });
        }

        return pollCurrentlyPlaying(); // Retry once
      } catch (refreshError) {
        logger.error('Session expired. Please restart to re-authenticate.', {
          error: refreshError,
        });
        return null;
      }
    }
    logger.error('Polling error:', { error });
    return null;
  }
}
