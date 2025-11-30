import { app, startServer } from '../src/server';
import { prisma } from '../src/dbClient';
import { spotifyApi } from '../src/auth';
import { logger } from '../src/utils/logger';

// Mocks
jest.mock('../src/dbClient', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../src/auth', () => ({
  spotifyApi: {
    getAccessToken: jest.fn(),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

type JsonResponse = { statusCode?: number; body?: any };

function invokeRoute(path: string): Promise<JsonResponse> {
  return new Promise(resolve => {
    const layer = (app as any)._router.stack.find((l: any) => l.route?.path === path);
    const handler = layer?.route?.stack?.[0]?.handle;
    const res: any = {
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: this.body });
      },
    };
    handler?.({}, res);
  });
}

describe('Health Server', () => {
  afterAll(() => {
    // Ensure no server is listening
    // Since we're not actually starting the server in tests, this is just a safety measure
  });

  test('GET /health returns 200', async () => {
    const res = await invokeRoute('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
  });

  test('GET /ready returns 200 when healthy', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([1]);
    (spotifyApi.getAccessToken as jest.Mock).mockReturnValue('token');

    const res = await invokeRoute('/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ready');
  });

  test('GET /ready returns 503 when DB fails', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB Down'));

    const res = await invokeRoute('/ready');
    expect(res.statusCode).toBe(503);
    expect(res.body).toHaveProperty('status', 'not ready');
  });

  test('GET /ready returns 503 when Spotify auth is missing', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([1]); // DB is fine
    (spotifyApi.getAccessToken as jest.Mock).mockReturnValue(null); // No token

    const res = await invokeRoute('/ready');
    expect(res.statusCode).toBe(503);
    expect(res.body).toHaveProperty('status', 'not ready');
    expect(res.body.error).toContain('No Spotify access token');
  });

  test('GET /ready returns 503 when Spotify auth is undefined', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([1]); // DB is fine
    (spotifyApi.getAccessToken as jest.Mock).mockReturnValue(undefined); // Undefined token

    const res = await invokeRoute('/ready');
    expect(res.statusCode).toBe(503);
    expect(res.body).toHaveProperty('status', 'not ready');
  });

  test('startServer logs port without opening a real socket', () => {
    const close = jest.fn();
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port: any, cb?: () => void) => {
      cb?.();
      return { close } as any;
    });

    const server = startServer();

    expect(server).toEqual({ close });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Health check server running on port')
    );
    listenSpy.mockRestore();
  });
});
