import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface RefreshResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Run Prisma seed to refresh the library from Liked_Songs.csv.
 * @param quiet If true, suppresses stdout/stderr and returns buffered output.
 */
export function refreshLibrary(options: { quiet?: boolean } = {}): Promise<RefreshResult> {
  const { quiet = false } = options;

  const csvPath = path.join(process.cwd(), 'Liked_Songs.csv');
  if (!fs.existsSync(csvPath)) {
    return Promise.reject(new Error(`Liked_Songs.csv not found at ${csvPath}`));
  }

  return new Promise(resolve => {
    const child = spawn('npx', ['prisma', 'db', 'seed'], {
      env: process.env,
      shell: false,
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let output = '';
    let errorOutput = '';

    if (quiet) {
      child.stdout?.on('data', data => {
        output += data.toString();
      });
      child.stderr?.on('data', data => {
        errorOutput += data.toString();
      });
    }

    child.on('close', code => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({
          success: false,
          output,
          error: errorOutput || `Exited with code ${code}`,
        });
      }
    });

    child.on('error', err => {
      resolve({
        success: false,
        output,
        error: err?.message || 'Failed to spawn prisma seed process',
      });
    });
  });
}

// CLI usage: `npm run refresh:library`
if (require.main === module) {
  refreshLibrary()
    .then(result => {
      if (!result.success) {
        console.error(result.error || 'Refresh failed');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error(err?.message || err);
      process.exit(1);
    });
}
