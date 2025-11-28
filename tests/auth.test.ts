// Set env vars FIRST - before any imports or mocks
process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:8888/callback';

import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies BEFORE importing auth
jest.mock('fs');
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock logger to avoid console noise
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock HTTP server to avoid port conflicts
let capturedHandler: ((req: any, res: any) => void) | null = null;

const mockServer: { listen: jest.Mock; close: jest.Mock } = {
  listen: jest.fn((port: number, callback: () => void) => {
    callback();
    return mockServer;
  }),
  close: jest.fn(),
};

jest.mock('http', () => ({
  createServer: jest.fn((handler: any) => {
    capturedHandler = handler;
    return mockServer;
  }),
  IncomingMessage: jest.fn(),
  ServerResponse: jest.fn(),
  __getHandler: () => capturedHandler,
}));

// Mock spotify-web-api-node
const mockSpotifyApi = {
  setAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
  getMe: jest.fn(),
  refreshAccessToken: jest.fn(),
  authorizationCodeGrant: jest.fn(),
  createAuthorizeURL: jest.fn(() => 'http://example.com/auth'),
  getRefreshToken: jest.fn(),
};

jest.mock('spotify-web-api-node', () => {
  return jest.fn().mockImplementation(() => mockSpotifyApi);
});

// Now import auth module after mocks are set up
import { authenticate, saveTokens, spotifyApi } from '../src/auth';
import { logger } from '../src/utils/logger';
import { createServer } from 'http';

const TOKEN_PATH = path.join(process.cwd(), 'tokens.json');

describe('Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
    (fs.writeFileSync as jest.Mock).mockImplementation();
  });

  describe('saveTokens', () => {
    test('writes tokens to file in JSON format', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
      };

      saveTokens(tokens);

      expect(fs.writeFileSync).toHaveBeenCalledWith(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    });

    test('throws when file write fails', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
      };

      const writeError = new Error('Failed to write file');
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw writeError;
      });

      expect(() => saveTokens(tokens)).toThrow('Failed to write file');
    });
  });

  test('proxy set forwards properties to the spotifyApi instance', () => {
    (spotifyApi as any).customField = 'hello';
    expect((mockSpotifyApi as any).customField).toBe('hello');
  });

  describe('authenticate', () => {
    test('loads saved tokens successfully when valid', async () => {
      const tokens = {
        access_token: 'valid_access_token',
        refresh_token: 'valid_refresh_token',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(tokens));
      mockSpotifyApi.getMe.mockResolvedValue({ body: { id: 'user123' } });

      await authenticate();

      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith('valid_access_token');
      expect(mockSpotifyApi.setRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockSpotifyApi.getMe).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Loaded saved tokens.');
    });

    test('throws when required env credentials are missing', async () => {
      const originalId = process.env.SPOTIFY_CLIENT_ID;
      const originalSecret = process.env.SPOTIFY_CLIENT_SECRET;
      const originalRedirect = process.env.SPOTIFY_REDIRECT_URI;

      jest.resetModules();
      process.env.SPOTIFY_CLIENT_ID = '';
      process.env.SPOTIFY_CLIENT_SECRET = '';
      process.env.SPOTIFY_REDIRECT_URI = '';

      const freshAuth = await import('../src/auth');
      await expect(freshAuth.authenticate()).rejects.toThrow('Missing Spotify credentials');

      process.env.SPOTIFY_CLIENT_ID = originalId;
      process.env.SPOTIFY_CLIENT_SECRET = originalSecret;
      process.env.SPOTIFY_REDIRECT_URI = originalRedirect;
    });

    test('handles OAuth callback error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const { __getHandler } = require('http');

      const authPromise = authenticate();
      const handler = __getHandler();

      const mockReq = { url: '/callback?error=access_denied' };
      const mockRes = { writeHead: jest.fn(), end: jest.fn() };

      await handler(mockReq, mockRes);

      await expect(authPromise).rejects.toThrow('Auth error: access_denied');
      expect(mockRes.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/html' });
      expect(mockServer.close).toHaveBeenCalled();
    });

    test('handles OAuth callback missing code', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const { __getHandler } = require('http');

      const authPromise = authenticate();
      const handler = __getHandler();

      const mockReq = { url: '/callback' };
      const mockRes = { writeHead: jest.fn(), end: jest.fn() };

      await handler(mockReq, mockRes);

      await expect(authPromise).rejects.toThrow('Missing authorization code');
      expect(mockRes.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/html' });
      expect(mockServer.close).toHaveBeenCalled();
    });

    test('handles OAuth callback success and saves tokens', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockSpotifyApi.authorizationCodeGrant.mockResolvedValue({
        body: { access_token: 'access', refresh_token: 'refresh' },
      });
      const { __getHandler } = require('http');

      const authPromise = authenticate();
      const handler = __getHandler();

      const mockReq = { url: '/callback?code=granted' };
      const mockRes = { writeHead: jest.fn(), end: jest.fn() };

      await handler(mockReq, mockRes);
      await authPromise;

      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith('access');
      expect(mockSpotifyApi.setRefreshToken).toHaveBeenCalledWith('refresh');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        TOKEN_PATH,
        JSON.stringify({ access_token: 'access', refresh_token: 'refresh' }, null, 2)
      );
      expect(logger.info).toHaveBeenCalledWith('Authentication successful! Tokens saved.');
    });

    test('handles authorization code grant failure in callback', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockSpotifyApi.authorizationCodeGrant.mockRejectedValue(new Error('grant failed'));
      const { __getHandler } = require('http');

      const authPromise = authenticate();
      const handler = __getHandler();

      const mockReq = { url: '/callback?code=bad' };
      const mockRes = { writeHead: jest.fn(), end: jest.fn() };

      await handler(mockReq, mockRes);
      await expect(authPromise).rejects.toThrow('grant failed');
    });

    test('refreshes token when expired', async () => {
      const oldTokens = {
        access_token: 'expired_token',
        refresh_token: 'refresh_token',
      };
      const newTokens = {
        access_token: 'new_access_token',
        refresh_token: 'refresh_token',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(oldTokens));
      mockSpotifyApi.getMe.mockRejectedValue(new Error('Token expired'));
      mockSpotifyApi.refreshAccessToken.mockResolvedValue({
        body: {
          access_token: 'new_access_token',
          refresh_token: 'refresh_token',
        },
      });

      await authenticate();

      expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(TOKEN_PATH, JSON.stringify(newTokens, null, 2));
      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith('new_access_token');
      expect(logger.info).toHaveBeenCalledWith('Token refreshed successfully.');
    });

    test('handles refresh token rotation', async () => {
      const oldTokens = {
        access_token: 'expired_token',
        refresh_token: 'old_refresh_token',
      };
      const newTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(oldTokens));
      mockSpotifyApi.getMe.mockRejectedValue(new Error('Token expired'));
      mockSpotifyApi.refreshAccessToken.mockResolvedValue({
        body: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
        },
      });

      await authenticate();

      expect(fs.writeFileSync).toHaveBeenCalledWith(TOKEN_PATH, JSON.stringify(newTokens, null, 2));
      expect(mockSpotifyApi.setRefreshToken).toHaveBeenCalledWith('new_refresh_token');
    });

    test('handles refresh failure and logs re-authentication message', async () => {
      const oldTokens = {
        access_token: 'expired_token',
        refresh_token: 'invalid_refresh_token',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(oldTokens));
      mockSpotifyApi.getMe.mockRejectedValue(new Error('Token expired'));
      mockSpotifyApi.refreshAccessToken.mockRejectedValue(new Error('Refresh failed'));

      // The function will try to start OAuth flow after refresh failure
      // We just verify the refresh was attempted and the log message was shown
      const authPromise = authenticate();

      // Give it time to process the refresh failure
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Could not refresh token, requiring re-authentication.'
      );
    });

    test('handles invalid token file gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      // The function will try to start OAuth flow after file read error
      const authPromise = authenticate();

      // Give it time to process the error
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalled();
      expect(createServer).toHaveBeenCalled();
    });

    test('starts OAuth flow when no tokens exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // The function will start OAuth flow
      const authPromise = authenticate();

      // Give it time to start the server
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalled();
      expect(mockSpotifyApi.createAuthorizeURL).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Please log in to Spotify by visiting this URL:');
    });
  });
});
