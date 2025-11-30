import express from 'express';
import { logger } from './utils/logger';
import { prisma } from './dbClient';
import { spotifyApi } from './auth';

export const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/ready', async (req, res) => {
  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;

    // Check Spotify Auth (basic check if token exists)
    if (!spotifyApi.getAccessToken()) {
      throw new Error('No Spotify access token');
    }

    res.status(200).json({ status: 'ready' });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({ status: 'not ready', error: String(error) });
  }
});

export function startServer() {
  return app.listen(PORT, () => {
    logger.info(`Health check server running on port ${PORT}`);
  });
}
