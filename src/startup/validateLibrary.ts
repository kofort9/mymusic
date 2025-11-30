import { spotifyApi } from '../auth';
import { prisma } from '../dbClient';
import { ApiUsageTracker } from '../utils/apiUsageTracker';
import { logger } from '../utils/logger';

interface ValidationResult {
  totalLikedSongs: number;
  inDatabase: number;
  missingFromDb: number;
  incompleteTracks: number;
  apiCallsRemaining: number;
}

/**
 * Fetch all of user's liked songs from Spotify (paginated)
 */
async function fetchAllLikedSongs(): Promise<Array<{ id: string; name: string; artists: string }>> {
  const tracks: Array<{ id: string; name: string; artists: string }> = [];
  let offset = 0;
  const limit = 50;

  let hasMore = true;

  while (hasMore) {
    try {
      const response = await spotifyApi.getMySavedTracks({ limit, offset });

      if (!response.body.items || response.body.items.length === 0) {
        hasMore = false;
        continue;
      }

      for (const item of response.body.items) {
        if (item.track) {
          tracks.push({
            id: item.track.uri,
            name: item.track.name,
            artists: item.track.artists.map((a: { name: string }) => a.name).join(', '),
          });
        }
      }

      offset += limit;

      // Respect rate limits
      if (response.body.items.length < limit) {
        hasMore = false;
      }
    } catch (error) {
      logger.error('[ValidateLibrary] Error fetching liked songs', { error });
      hasMore = false;
    }
  }

  return tracks;
}

/**
 * Validate library by comparing Spotify "Liked Songs" with local DB
 */
export async function validateLibrary(): Promise<ValidationResult> {
  logger.info('[ValidateLibrary] Starting library validation...');

  // Fetch liked songs from Spotify
  const likedSongs = await fetchAllLikedSongs();
  logger.info(`[ValidateLibrary] Found ${likedSongs.length} liked songs on Spotify`);

  let inDatabase = 0;
  let missingFromDb = 0;
  let incompleteTracks = 0;

  for (const song of likedSongs) {
    const track = await prisma.track.findUnique({
      where: { spotifyId: song.id },
    });

    if (!track) {
      missingFromDb++;
      logger.debug(`[ValidateLibrary] Missing: ${song.name} - ${song.artists}`);
    } else {
      inDatabase++;
      if (track.bpm === 0 || track.key === -1) {
        incompleteTracks++;
        logger.debug(`[ValidateLibrary] Incomplete: ${song.name} - ${song.artists}`);
      }
    }
  }

  const tracker = ApiUsageTracker.getInstance();
  const result: ValidationResult = {
    totalLikedSongs: likedSongs.length,
    inDatabase,
    missingFromDb,
    incompleteTracks,
    apiCallsRemaining: tracker.getRemaining(),
  };

  logger.info('[ValidateLibrary] Validation complete', { result });
  return result;
}

/**
 * Display validation results to console
 */
export function displayValidationSummary(result: ValidationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Library Status:');
  console.log('='.repeat(60));
  console.log(`Total Liked Songs (Spotify):  ${result.totalLikedSongs}`);
  console.log(`In Local Database:            ${result.inDatabase}`);
  console.log(`Missing from Database:        ${result.missingFromDb}`);
  console.log(`Missing Audio Features:       ${result.incompleteTracks}`);
  console.log(`SongBPM API Calls Remaining:  ${result.apiCallsRemaining}/100`);
  console.log('='.repeat(60));

  if (result.missingFromDb > 0) {
    console.log(`\n💡 Tip: Export your library from Exportify and run 'npm run refresh:library'`);
  }

  if (result.incompleteTracks > 0) {
    console.log(`\n💡 Tip: Run 'npm run enrich:library' to fetch missing audio features`);
  }

  console.log('');
}
