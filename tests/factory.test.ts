import { ProviderFactory } from '../src/providers/factory';

jest.mock('../src/logger', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

let spotifyAvailable = true;
let dbAvailable = true;
let customAvailable = true;

const spotifyInstances: any[] = [];
const dbInstances: any[] = [];
const customInstances: any[] = [];

jest.mock('../src/providers/spotifyProvider', () => {
  return {
    SpotifyProvider: jest.fn(() => {
      const inst = {
        getName: jest.fn(() => 'Spotify'),
        isAvailable: jest.fn(() => Promise.resolve(spotifyAvailable)),
      };
      spotifyInstances.push(inst);
      return inst;
    }),
  };
});

jest.mock('../src/providers/database', () => {
  return {
    DatabaseProvider: jest.fn(() => {
      const inst = {
        getName: jest.fn(() => 'database'),
        isAvailable: jest.fn(() => Promise.resolve(dbAvailable)),
      };
      dbInstances.push(inst);
      return inst;
    }),
  };
});

jest.mock('../src/providers/customApiProvider', () => {
  return {
    CustomApiProvider: jest.fn(() => {
      const inst = {
        getName: jest.fn(() => 'SongBPM'),
        isAvailable: jest.fn(() => Promise.resolve(customAvailable)),
      };
      customInstances.push(inst);
      return inst;
    }),
  };
});

describe('ProviderFactory', () => {
  beforeEach(() => {
    spotifyAvailable = true;
    dbAvailable = true;
    customAvailable = true;
    spotifyInstances.length = 0;
    dbInstances.length = 0;
    customInstances.length = 0;
    // Clear internal cache
    (ProviderFactory as any).providers?.clear?.();
    jest.clearAllMocks();
    delete process.env.AUDIO_FEATURE_PROVIDER;
  });

  describe('getProvider', () => {
    test('creates providers and caches them', () => {
      const p1 = ProviderFactory.getProvider('spotify');
      const p2 = ProviderFactory.getProvider('Spotify');
      expect(p1?.getName()).toBe('Spotify');
      expect(p1).toBe(p2); // cached
      expect(spotifyInstances.length).toBe(1);
    });

    test('supports database and custom aliases', () => {
      const db = ProviderFactory.getProvider('DATABASE');
      const custom = ProviderFactory.getProvider('customapi');
      expect(db?.getName()).toBe('database');
      expect(custom?.getName()).toBe('SongBPM');
    });

    test('returns null for unknown provider', () => {
      const unknown = ProviderFactory.getProvider('unknown');
      expect(unknown).toBeNull();
    });
  });

  describe('createProviderChain', () => {
    test('returns only available providers in order', async () => {
      customAvailable = false;
      const chain = await ProviderFactory.createProviderChain(['database', 'spotify', 'custom']);
      expect(chain.map(p => p.getName())).toEqual(['database', 'Spotify']);
    });

    test('handles empty input', async () => {
      const chain = await ProviderFactory.createProviderChain([]);
      expect(chain).toEqual([]);
    });
  });

  describe('getDefaultProvider', () => {
    test('uses AUDIO_FEATURE_PROVIDER env', () => {
      process.env.AUDIO_FEATURE_PROVIDER = 'custom';
      const provider = ProviderFactory.getDefaultProvider();
      expect(provider.getName()).toBe('SongBPM');
    });

    test('falls back to spotify on unknown env value', () => {
      process.env.AUDIO_FEATURE_PROVIDER = 'nope';
      const provider = ProviderFactory.getDefaultProvider();
      expect(provider.getName()).toBe('Spotify');
    });
  });
});
