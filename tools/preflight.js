#!/usr/bin/env node
/* Simple preflight to catch missing schema/seed before start */
const fs = require('fs');
const path = require('path');

try {
  // Load env so DATABASE_URL is available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // dotenv is optional; ignore if missing
}

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const isFileDb = dbUrl.startsWith('file:');

if (isFileDb) {
  const dbPath = path.resolve(process.cwd(), dbUrl.replace('file:', ''));
  if (!fs.existsSync(dbPath)) {
    console.error(`\nDatabase not found at ${dbPath}`);
    console.error('Run `npm run db:setup` to apply migrations and seed before starting the TUI.\n');
    process.exit(1);
  }
}

const requiredEnv = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REDIRECT_URI'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('\nMissing Spotify credentials in .env: ' + missingEnv.join(', '));
  console.error('Fill .env from your Spotify Developer app, then rerun `npm start`.\n');
  process.exit(1);
}

const csvPath = path.resolve(process.cwd(), 'Liked_Songs.csv');
if (!fs.existsSync(csvPath)) {
  console.warn('\nWarning: Liked_Songs.csv not found; seeding may be skipped or incomplete.');
  console.warn('Place your Exportify CSV at Liked_Songs.csv and run `npm run db:seed`.\n');
}
