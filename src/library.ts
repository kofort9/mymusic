import * as fs from 'fs';
import { z } from 'zod';
import { LibraryTrack } from './types';

// Zod schema for library track validation
const LibraryTrackSchema = z.object({
  track_id: z.string().min(1, "track_id is required"),
  track_name: z.string().min(1, "track_name is required"),
  artist: z.string().min(1, "artist is required"),
  camelot_key: z.string().regex(/^(1[0-2]|[1-9])[AB]$/, "Invalid Camelot key format (e.g., '8A', '12B')"),
  bpm: z.number().positive("BPM must be a positive number"),
  energy: z.number().min(0).max(1).optional(),
  genre: z.string().optional()
});

const LibrarySchema = z.array(LibraryTrackSchema);

export function loadLibrary(filepath: string = 'library.json'): LibraryTrack[] {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Library file not found at ${filepath}`);
  }

  try {
    const rawData = fs.readFileSync(filepath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    
    // Validate with Zod schema
    const library = LibrarySchema.parse(parsedData);

    return library;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Library validation failed: ${issues}`);
    }
    throw new Error(`Failed to load library: ${error}`);
  }
}

