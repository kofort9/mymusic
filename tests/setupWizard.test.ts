import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { runFirstRunWizard } from '../src/setupWizard';

jest.mock('../src/refreshLibrary', () => ({
  refreshLibrary: jest.fn().mockResolvedValue({ success: true, output: '' }),
}));

jest.mock('readline');

const originalCwd = process.cwd();
const originalEnvKey = process.env.CUSTOM_API_KEY;
const originalSilent = process.env.WIZARD_SILENT;

describe('runFirstRunWizard', () => {
  let tempDir: string;
  const refreshLibrary = require('../src/refreshLibrary').refreshLibrary as jest.Mock;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-'));
    process.chdir(tempDir);
    jest.clearAllMocks();
    process.env.CUSTOM_API_KEY = '';
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.env.CUSTOM_API_KEY = originalEnvKey;
    process.env.WIZARD_SILENT = originalSilent;
  });

  test('no-ops when library and config are present', async () => {
    fs.writeFileSync(path.join(tempDir, 'Liked_Songs.csv'), 'test');
    fs.writeFileSync(path.join(tempDir, 'tokens.json'), '{}');
    process.env.CUSTOM_API_KEY = 'abc';

    await runFirstRunWizard(10);

    expect(readline.createInterface as jest.Mock).not.toHaveBeenCalled();
    expect(refreshLibrary).not.toHaveBeenCalled();
  });

  test('prompts, refreshes, and saves parse.bot key', async () => {
    fs.writeFileSync(path.join(tempDir, 'Liked_Songs.csv'), 'test');
    const answers = ['y', 'y', 'secret-key'];
    const question = jest.fn((_: string, cb: (answer: string) => void) =>
      cb(answers.shift() ?? '')
    );
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(0);

    expect(refreshLibrary).toHaveBeenCalledWith({ quiet: false });
    const envContents = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
    expect(envContents).toContain('CUSTOM_API_KEY=secret-key');
    expect(process.env.CUSTOM_API_KEY).toBe('secret-key');
    expect(close).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test('suppresses wizard logs when WIZARD_SILENT=1', async () => {
    fs.writeFileSync(path.join(tempDir, 'Liked_Songs.csv'), 'test');
    process.env.WIZARD_SILENT = '1';
    const question = jest.fn((_q: string, cb: (answer: string) => void) => cb('n'));
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(0);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test('skips storing parse.bot key when user declines', async () => {
    const answers = ['n'];
    const question = jest.fn((_: string, cb: (answer: string) => void) =>
      cb(answers.shift() ?? '')
    );
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });

    await runFirstRunWizard(0);

    expect(refreshLibrary).not.toHaveBeenCalled();
    expect(process.env.CUSTOM_API_KEY).toBe('');
  });

  test('handles missing CSV and tokens notice path', async () => {
    process.env.WIZARD_SILENT = '0';
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const question = jest.fn((_q: string, cb: (answer: string) => void) => cb('n'));
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(0);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('handles refresh library failure gracefully', async () => {
    fs.writeFileSync(path.join(tempDir, 'Liked_Songs.csv'), 'test');
    refreshLibrary.mockResolvedValueOnce({ success: false, error: 'DB connection failed' });
    const answers = ['y', 'n']; // yes to refresh, no to parse.bot
    const question = jest.fn((_: string, cb: (answer: string) => void) =>
      cb(answers.shift() ?? '')
    );
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    process.env.WIZARD_SILENT = '0';
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(0);

    expect(refreshLibrary).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    logSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('skips storing API key when user provides blank value', async () => {
    const answers = ['y', '']; // yes to store, but blank key
    const question = jest.fn((_: string, cb: (answer: string) => void) =>
      cb(answers.shift() ?? '')
    );
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(0);

    expect(refreshLibrary).not.toHaveBeenCalled();
    expect(process.env.CUSTOM_API_KEY).toBe('');
    logSpy.mockRestore();
  });

  test('updates existing API key in .env file', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'CUSTOM_API_KEY=old-key\n');
    fs.writeFileSync(path.join(tempDir, 'Liked_Songs.csv'), 'test');
    fs.writeFileSync(path.join(tempDir, 'tokens.json'), '{}');
    const answers = ['y', 'new-key']; // yes to store parse.bot, new key
    const question = jest.fn((_: string, cb: (answer: string) => void) =>
      cb(answers.shift() ?? '')
    );
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(1); // library exists

    const envContents = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
    expect(envContents).toContain('CUSTOM_API_KEY=new-key');
    expect(envContents).not.toContain('old-key');
    logSpy.mockRestore();
  });

  test('handles empty .env file when adding new key', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), '');
    fs.writeFileSync(path.join(tempDir, 'Liked_Songs.csv'), 'test');
    fs.writeFileSync(path.join(tempDir, 'tokens.json'), '{}');
    const answers = ['y', 'first-key']; // yes to store, first key
    const question = jest.fn((_: string, cb: (answer: string) => void) =>
      cb(answers.shift() ?? '')
    );
    const close = jest.fn();
    (readline.createInterface as jest.Mock).mockReturnValue({ question, close });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runFirstRunWizard(1); // library exists

    const envContents = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
    expect(envContents).toBe('CUSTOM_API_KEY=first-key\n');
    logSpy.mockRestore();
  });
});
