import SpotifyWebApi from 'spotify-web-api-node';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { logger } from './utils/logger';

dotenv.config();

const TOKEN_PATH = path.join(process.cwd(), 'tokens.json');

// Lazy initialization - check credentials only when spotifyApi is first accessed
let spotifyApiInstance: SpotifyWebApi | null = null;

function getSpotifyApi(): SpotifyWebApi {
  if (!spotifyApiInstance) {
    // Read env vars lazily (at access time, not module load time)
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      throw new Error('Missing Spotify credentials in .env');
    }

    spotifyApiInstance = new SpotifyWebApi({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    });
  }

  return spotifyApiInstance;
}

// Export a Proxy that lazily initializes spotifyApi on first access
export const spotifyApi = new Proxy({} as SpotifyWebApi, {
  get(target, prop) {
    return getSpotifyApi()[prop as keyof SpotifyWebApi];
  },
  set(target, prop, value) {
    // Type-safe property assignment with explicit unknown intermediate
    const api = getSpotifyApi();
    (api as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
});

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-private',
  'user-read-email',
  'user-library-read', // For checking if tracks are liked (v0.1.2+)
];

export async function authenticate(): Promise<void> {
  // Try to load saved tokens
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      spotifyApi.setAccessToken(tokens.access_token);
      spotifyApi.setRefreshToken(tokens.refresh_token);

      // Test if token works, refresh if needed
      try {
        await spotifyApi.getMe();
        logger.info('Loaded saved tokens.');
        return;
      } catch (error: unknown) {
        logger.info('Saved token invalid or expired, refreshing...');
        try {
          const data = await spotifyApi.refreshAccessToken();
          const newRefreshToken = data.body['refresh_token'] || tokens.refresh_token;
          const newTokens = {
            access_token: data.body['access_token'],
            refresh_token: newRefreshToken,
          };
          // Save new access token
          saveTokens(newTokens);
          spotifyApi.setAccessToken(newTokens.access_token);
          if (data.body['refresh_token']) {
            spotifyApi.setRefreshToken(newRefreshToken);
          }
          logger.info('Token refreshed successfully.');
          return;
        } catch (refreshError) {
          logger.info('Could not refresh token, requiring re-authentication.');
        }
      }
    } catch (err) {
      logger.error('Error loading tokens file:', { error: err });
    }
  }

  // If no valid tokens, start OAuth flow
  await performOAuthFlow();
}

export function saveTokens(tokens: { access_token: string; refresh_token: string }) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

async function performOAuthFlow(): Promise<void> {
  return new Promise((resolve, reject) => {
    const port = 8888;
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const parsedUrl = parse(req.url || '', true);

      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code as string;
        const error = parsedUrl.query.error;

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authentication Error</h1><p>${error}</p>`);
          server.close();
          reject(new Error(`Auth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<h1>Authentication Successful</h1><p>You can close this window and return to the terminal.</p>'
          );
          server.close();

          try {
            const data = await spotifyApi.authorizationCodeGrant(code);
            const tokens = {
              access_token: data.body['access_token'],
              refresh_token: data.body['refresh_token'],
            };

            spotifyApi.setAccessToken(tokens.access_token);
            spotifyApi.setRefreshToken(tokens.refresh_token);
            saveTokens(tokens);

            logger.info('Authentication successful! Tokens saved.');
            resolve();
          } catch (err) {
            reject(err);
          }
          return;
        }

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication Error</h1><p>Missing authorization code.</p>');
        server.close();
        reject(new Error('Missing authorization code'));
      }
    });

    server.listen(port, () => {
      const authUrl = spotifyApi.createAuthorizeURL(SCOPES, 'state');
      logger.info('Please log in to Spotify by visiting this URL:');
      logger.info(authUrl);
    });
  });
}
