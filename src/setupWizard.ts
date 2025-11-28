import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { refreshLibrary } from './refreshLibrary';
import { logger } from './utils/logger';

function getPaths() {
  const cwd = process.cwd();
  return {
    csvPath: path.join(cwd, 'Liked_Songs.csv'),
    tokensPath: path.join(cwd, 'tokens.json'),
    envPath: path.join(cwd, '.env'),
    cwd,
  };
}

function promptYesNo(rl: readline.Interface, question: string): Promise<boolean> {
  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

function promptText(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(`${question}: `, answer => resolve(answer.trim())));
}

const shouldLogOutput = (): boolean =>
  process.env.WIZARD_SILENT !== '1' && process.env.NODE_ENV !== 'test';

const logInfo = (...args: unknown[]): void => {
  if (shouldLogOutput()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

const logError = (...args: unknown[]): void => {
  if (shouldLogOutput()) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};

function upsertEnvValue(key: string, value: string): void {
  const { envPath } = getPaths();
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const line = `${key}=${value}`;
  if (content.match(new RegExp(`^${key}=.*`, 'm'))) {
    content = content.replace(new RegExp(`^${key}=.*`, 'm'), line);
  } else {
    content = content.trim().length > 0 ? `${content}\n${line}\n` : `${line}\n`;
  }

  fs.writeFileSync(envPath, content);
}

/**
 * First-run setup wizard:
 * - Guides users to export liked songs with Exportify and place Liked_Songs.csv
 * - Offers to run the refresh script
 * - Offers to store parse.bot (CUSTOM_API_KEY) for SongBPM fallback
 * - Reminds about Spotify OAuth tokens if missing
 */
export async function runFirstRunWizard(libraryCount: number): Promise<void> {
  const { csvPath, tokensPath, cwd } = getPaths();
  const missingLibrary = libraryCount === 0;
  const missingCsv = !fs.existsSync(csvPath);
  const missingParseBotKey = !process.env.CUSTOM_API_KEY;
  const missingTokens = !fs.existsSync(tokensPath);

  if (!missingLibrary && !missingCsv && !missingParseBotKey && !missingTokens) {
    return;
  }

  // Use a normal readline loop (before raw-mode)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logInfo('\n🚀 First-run setup wizard');
  logInfo('This will help you seed the library and optionally enable SongBPM fallback.\n');

  if (missingLibrary || missingCsv) {
    logInfo('📂 Your library looks empty.');
    logInfo(
      '1) Visit https://exportify.net and sign in with Spotify.\n' +
        '2) Export your Liked Songs as CSV.\n' +
        `3) Save the file as Liked_Songs.csv in ${cwd}`
    );

    if (fs.existsSync(csvPath)) {
      const runRefresh = await promptYesNo(rl, 'Liked_Songs.csv found. Run library refresh now');
      if (runRefresh) {
        logInfo('Seeding library from CSV...');
        const result = await refreshLibrary({ quiet: false });
        if (!result.success) {
          logError(`Refresh failed: ${result.error || 'Unknown error'}`);
        }
      }
    } else {
      const alreadyExported = await promptYesNo(rl, 'Do you already have Liked_Songs.csv ready to drop here');
      if (alreadyExported) {
        logInfo(`Place Liked_Songs.csv in ${cwd} and re-run npm start to refresh the library.`);
      }
    }
  }

  if (missingParseBotKey) {
    logInfo('\n🎛  Optional: SongBPM fallback via parse.bot');
    logInfo(
      'Sign up at https://parse.bot, create the SongBPM scraper, and grab your API key.\n' +
        'This enables CUSTOM_API_KEY for the CustomApiProvider (SongBPM).'
    );
    const shouldStoreKey = await promptYesNo(rl, 'Store your parse.bot CUSTOM_API_KEY in .env now');
    if (shouldStoreKey) {
      const key = await promptText(rl, 'Paste CUSTOM_API_KEY (leave blank to skip)');
      if (key) {
        upsertEnvValue('CUSTOM_API_KEY', key);
        process.env.CUSTOM_API_KEY = key;
        logInfo('Saved CUSTOM_API_KEY to .env');
      } else {
        logInfo('Skipped storing CUSTOM_API_KEY.');
      }
    }
  }

  if (missingTokens) {
    logInfo(
      '\n🔑 Spotify authentication needed. Run `npm start` and complete the browser login so tokens.json can be saved.'
    );
  }

  logInfo('\nSetup wizard complete. Continuing startup...\n');
  rl.close();
}
