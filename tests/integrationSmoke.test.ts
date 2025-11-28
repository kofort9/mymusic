import { getCompatibleKeys, filterMatches } from '../src/mixingEngine';
import { renderTrainBoard } from '../src/display';
import { CurrentTrack, LibraryTrack } from '../src/types';

// Mock camelotColors to avoid ANSI inconsistencies in assertions
jest.mock('../src/camelotColors', () => ({
  getCamelotColor: jest.fn(() => '#FFFFFF'),
}));

// Stub package version
jest.mock('../package.json', () => ({ version: '0.0.0-smoke' }), { virtual: true });

describe('Integration Smoke', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('mixing engine + display render end-to-end', () => {
    const currentTrack: CurrentTrack = {
      track_id: 'spotify:track:curr',
      track_name: 'Now Playing',
      artist: 'Artist',
      camelot_key: '8A',
      audio_features: { tempo: 128, key: 9, mode: 0, time_signature: 4 },
      progress_ms: 30000,
      duration_ms: 180000,
      timestamp: Date.now(),
      isPlaying: true,
    };

    const library: LibraryTrack[] = [
      {
        track_id: 'spotify:track:1',
        track_name: 'Smooth',
        artist: 'DJ',
        camelot_key: '8A',
        bpm: 128,
      },
      {
        track_id: 'spotify:track:2',
        track_name: 'Energy',
        artist: 'DJ',
        camelot_key: '10A',
        bpm: 130,
      },
      {
        track_id: 'spotify:track:3',
        track_name: 'Mood',
        artist: 'DJ',
        camelot_key: '8B',
        bpm: 126,
      },
    ];

    const compatible = getCompatibleKeys(currentTrack.camelot_key);
    const recs = filterMatches(currentTrack, library, compatible, false);

    renderTrainBoard(currentTrack, recs, null, false);

    const output = consoleLogSpy.mock.calls.map(call => call[0]?.toString() || '').join('\n');
    expect(output).toContain('Recommendations');
    expect(output).toContain('Smooth');
    expect(output).toContain('Energy');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });
});
