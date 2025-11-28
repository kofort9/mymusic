import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const csv = require('csv-parser');
import path from 'path';
import { convertToCamelot } from '../src/camelot';

const prisma = new PrismaClient();
const csvFilePath = path.join(__dirname, '../Liked_Songs.csv');

async function main() {
  console.log('Start seeding...');
  const results: any[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data: any) => results.push(data))
    .on('end', async () => {
      console.log(`Parsed ${results.length} records from CSV.`);
      if (results.length > 0) {
        console.log('First row keys:', Object.keys(results[0]));
        console.log('First row:', results[0]);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of results) {
        try {
          // Map CSV fields to Prisma model
          // CSV Headers: Track URI, Track Name, Album Name, Artist Name(s), Release Date, Duration (ms), Popularity, Explicit, Added By, Added At, Genres, Record Label, Danceability, Energy, Key, Loudness, Mode, Speechiness, Acousticness, Instrumentalness, Liveness, Valence, Tempo, Time Signature

          // Handle potential BOM in the first key
          const trackUriKey = Object.keys(row).find(k => k.includes('Track URI')) || 'Track URI';
          const spotifyId = row[trackUriKey] || '';

          if (!spotifyId) {
            // Only log the first few failures to avoid spam
            if (errorCount < 5) console.log('Missing Spotify ID for row:', row);
            errorCount++; // Increment error count for skipped rows
            continue;
          }

          const title = row['Track Name'] || 'Unknown Title';
          const artist = row['Artist Name(s)'] || 'Unknown Artist';
          const album = row['Album Name'] || 'Unknown Album';

          const key = parseInt(row['Key']);
          const mode = parseInt(row['Mode']);
          const bpm = parseFloat(row['Tempo']);

          // Validate critical fields
          if (isNaN(key) || isNaN(mode) || isNaN(bpm)) {
            console.warn(`Skipping track ${spotifyId}: Invalid Key/Mode/BPM`);
            errorCount++;
            continue;
          }

          const camelotKey = convertToCamelot(key, mode);

          await prisma.track.upsert({
            where: { spotifyId },
            update: {
              title,
              artist,
              album,
              camelotKey,
              key,
              mode,
              bpm,
              energy: parseFloat(row['Energy']) || 0,
              valence: parseFloat(row['Valence']) || 0,
              danceability: parseFloat(row['Danceability']) || 0,
              acousticness: parseFloat(row['Acousticness']) || 0,
              instrumentalness: parseFloat(row['Instrumentalness']) || 0,
              liveness: parseFloat(row['Liveness']) || 0,
              speechiness: parseFloat(row['Speechiness']) || 0,
              durationMs: parseInt(row['Duration (ms)']) || 0,
              timeSignature: parseInt(row['Time Signature']) || 4,
            },
            create: {
              spotifyId,
              title,
              artist,
              album,
              camelotKey,
              key,
              mode,
              bpm,
              energy: parseFloat(row['Energy']) || 0,
              valence: parseFloat(row['Valence']) || 0,
              danceability: parseFloat(row['Danceability']) || 0,
              acousticness: parseFloat(row['Acousticness']) || 0,
              instrumentalness: parseFloat(row['Instrumentalness']) || 0,
              liveness: parseFloat(row['Liveness']) || 0,
              speechiness: parseFloat(row['Speechiness']) || 0,
              durationMs: parseInt(row['Duration (ms)']) || 0,
              timeSignature: parseInt(row['Time Signature']) || 4,
            },
          });
          successCount++;
        } catch (e) {
          console.error(`Error processing track ${row['Track Name']}:`, e);
          errorCount++;
        }
      }

      console.log(`Seeding finished.`);
      console.log(`Successfully imported: ${successCount}`);
      console.log(`Errors/Skipped: ${errorCount}`);
      await prisma.$disconnect();
    });
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
