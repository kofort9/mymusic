import { LibraryTrack } from './types';
import { prisma, disconnectPrisma } from './dbClient';

export async function loadLibrary(): Promise<LibraryTrack[]> {
  try {
    const tracks = await prisma.track.findMany();

    return tracks.map(t => ({
      track_id: t.spotifyId,
      track_name: t.title,
      artist: t.artist,
      camelot_key: t.camelotKey,
      bpm: t.bpm,
      energy: t.energy,
      // genre: t.genre // Genre is in CSV but not in LibraryTrack interface yet, optional
    }));
  } catch (error) {
    throw new Error(`Failed to load library from DB: ${error}`);
  }
}

export async function disconnectLibrary(): Promise<void> {
  await disconnectPrisma();
}
