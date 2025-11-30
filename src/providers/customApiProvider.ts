import { AudioFeatures, TrackID } from '../types';
import { logger } from '../utils/logger';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { RateLimiter } from '../utils/RateLimiter';
import { AudioFeatureProvider } from './types';
import { ApiUsageTracker } from '../utils/apiUsageTracker';

const songBpmBreaker = new CircuitBreaker('SongBPM', {
  failureThreshold: 5,
  resetTimeout: 60000,
});

const songBpmLimiter = new RateLimiter('SongBPM', {
  tokensPerInterval: 2,
  interval: 1000, // 2 requests per second (conservative)
});

/**
 * SongBPM API Response Types
 */
interface SongBpmSearchResponse {
  html_content: string;
}

interface SongBpmTrackUrlResponse {
  track_url: string;
}

interface SongBpmTrackPageResponse {
  html_content: string;
}

interface SongBpmMetadataResponse {
  bpm: number;
  duration: string;
  musical_key: string;
  time_signature: string;
}

/**
 * Musical key to numeric key (0-11) and mode (0=minor, 1=major) mapping
 * Key values follow Spotify's pitch class notation:
 * C=0, C#/Db=1, D=2, D#/Eb=3, E=4, F=5, F#/Gb=6, G=7, G#/Ab=8, A=9, A#/Bb=10, B=11
 */
const KEY_NAME_TO_NUMBER: Record<string, number> = {
  c: 0,
  'c#': 1,
  db: 1,
  d: 2,
  'd#': 3,
  eb: 3,
  e: 4,
  f: 5,
  'f#': 6,
  gb: 6,
  g: 7,
  'g#': 8,
  ab: 8,
  a: 9,
  'a#': 10,
  bb: 10,
  b: 11,
};

/**
 * Parse a musical key string (e.g., "C Major", "F# Minor") into key and mode numbers
 */
export function parseMusicalKey(musicalKey: string): { key: number; mode: number } | null {
  if (!musicalKey || typeof musicalKey !== 'string') {
    return null;
  }

  const normalized = musicalKey.toLowerCase().trim();

  // Determine mode (major=1, minor=0)
  let mode: number;
  if (normalized.includes('major') || normalized.includes('maj')) {
    mode = 1;
  } else if (normalized.includes('minor') || normalized.includes('min')) {
    mode = 0;
  } else {
    // Default to major if not specified
    mode = 1;
  }

  // Extract the key name (everything before major/minor/maj/min)
  const keyMatch = normalized.match(/^([a-g][#b]?)/);
  if (!keyMatch) {
    return null;
  }

  const keyName = keyMatch[1];
  const keyNumber = KEY_NAME_TO_NUMBER[keyName];

  if (keyNumber === undefined) {
    return null;
  }

  return { key: keyNumber, mode };
}

/**
 * Parse a time signature string (e.g., "4/4", "3/4") into a number
 */
export function parseTimeSignature(timeSig: string): number {
  if (!timeSig || typeof timeSig !== 'string') {
    return 4; // Default to 4/4
  }

  const match = timeSig.match(/^(\d+)\/\d+$/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Try parsing as a plain number
  const num = parseInt(timeSig, 10);
  return isNaN(num) ? 4 : num;
}

/**
 * Custom API Audio Feature Provider - SongBPM Implementation
 *
 * Uses the SongBPM API via parse.bot to fetch audio features including
 * BPM, musical key, and time signature for tracks.
 */
export class CustomApiProvider implements AudioFeatureProvider {
  private readonly API_BASE_URL =
    process.env.CUSTOM_API_URL ||
    'https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588';
  private readonly API_KEY = process.env.CUSTOM_API_KEY || '';

  getName(): string {
    return 'SongBPM';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.API_KEY) {
      logger.error(`[${this.getName()}] API key not configured. Set CUSTOM_API_KEY in .env`);
      return false;
    }

    try {
      logger.info(`[${this.getName()}] API configured and ready`);
      return true;
    } catch (error) {
      logger.error(`[${this.getName()}] Availability check failed:`, { error });
      return false;
    }
  }

  /**
   * Make an API request to the SongBPM parse.bot endpoint
   */
  private async makeRequest<T>(endpoint: string, body: Record<string, string>): Promise<T> {
    // Check API usage before making request
    const tracker = ApiUsageTracker.getInstance();
    if (!tracker.canMakeRequest()) {
      const resetDate = tracker.getResetDate().toLocaleDateString();
      throw new Error(
        `SongBPM API limit reached (${tracker.getCount()}/${tracker.getLimit()}). Resets on ${resetDate}`
      );
    }

    await songBpmLimiter.waitForToken();
    const result = await songBpmBreaker.execute(async () => {
      const url = `${this.API_BASE_URL}/${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.API_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    });

    // Record successful request
    tracker.recordRequest();
    return result;
  }

  /**
   * Step 1: Fetch search results HTML from SongBPM
   */
  async fetchSearchResults(query: string): Promise<string> {
    logger.info(`[${this.getName()}] Searching for: ${query}`);
    const response = await this.makeRequest<SongBpmSearchResponse>('fetch_search_results', {
      query,
    });
    return response.html_content;
  }

  /**
   * Step 2: Extract the first track URL from search results
   */
  async extractTrackUrl(searchHtml: string): Promise<string> {
    const response = await this.makeRequest<SongBpmTrackUrlResponse>('extract_first_track_url', {
      search_html: searchHtml,
    });
    return response.track_url;
  }

  /**
   * Step 3: Fetch the track page HTML
   */
  async fetchTrackPage(trackUrl: string): Promise<string> {
    logger.info(`[${this.getName()}] Fetching track page: ${trackUrl}`);
    const response = await this.makeRequest<SongBpmTrackPageResponse>('fetch_track_page', {
      track_url: trackUrl,
    });
    return response.html_content;
  }

  /**
   * Step 4: Extract track metadata from the track page
   */
  async extractTrackMetadata(trackHtml: string): Promise<SongBpmMetadataResponse> {
    const response = await this.makeRequest<SongBpmMetadataResponse>('extract_track_metadata', {
      track_html: trackHtml,
    });
    return response;
  }

  /**
   * Get audio features for a track
   * @param trackId The track identifier (used for logging/caching, not API lookup)
   * @param trackName The track name for search
   * @param artist The artist name for search
   */
  async getAudioFeatures(
    trackId: TrackID,
    trackName?: string,
    artist?: string
  ): Promise<AudioFeatures | null> {
    try {
      // Build search query from track name and artist
      if (!trackName && !artist) {
        logger.error(
          `[${this.getName()}] Track name or artist required for SongBPM lookup (trackId: ${trackId})`
        );
        return null;
      }

      const query = [artist, trackName].filter(Boolean).join(' ');
      logger.info(`[${this.getName()}] Looking up features for: ${query}`);

      // Step 1: Search for the track
      const searchHtml = await this.fetchSearchResults(query);

      // Step 2: Get the first track URL
      const trackUrl = await this.extractTrackUrl(searchHtml);

      if (!trackUrl) {
        logger.error(`[${this.getName()}] No track found for query: ${query}`);
        return null;
      }

      // Step 3: Fetch the track page
      const trackPageHtml = await this.fetchTrackPage(trackUrl);

      // Step 4: Extract metadata
      const metadata = await this.extractTrackMetadata(trackPageHtml);

      // Parse musical key to key number and mode
      const keyInfo = parseMusicalKey(metadata.musical_key);
      if (!keyInfo) {
        logger.error(`[${this.getName()}] Failed to parse musical key: ${metadata.musical_key}`);
        return null;
      }

      // Parse time signature
      const timeSignature = parseTimeSignature(metadata.time_signature);

      const features: AudioFeatures = {
        tempo: metadata.bpm,
        key: keyInfo.key,
        mode: keyInfo.mode,
        time_signature: timeSignature,
      };

      logger.info(
        `[${this.getName()}] Fetched: BPM=${features.tempo}, Key=${features.key}, Mode=${features.mode}, TimeSig=${features.time_signature}`
      );

      return features;
    } catch (error: unknown) {
      logger.error(`[${this.getName()}] Failed to get audio features:`, { error });
      return null;
    }
  }
}
