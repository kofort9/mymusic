import { loadLibrary } from '../src/library';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('Library Loader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('loads valid library successfully', () => {
    const mockData = JSON.stringify([
      {
        track_id: 'test1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        bpm: 128.0
      }
    ]);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockData);

    const library = loadLibrary('test.json');

    expect(library).toHaveLength(1);
    expect(library[0].track_name).toBe('Test Track');
    expect(library[0].camelot_key).toBe('8A');
  });

  test('throws error if file not found', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(() => loadLibrary('missing.json')).toThrow('Library file not found');
  });

  test('throws error for invalid Camelot key format', () => {
    const mockData = JSON.stringify([
      {
        track_id: 'test1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: 'INVALID',
        bpm: 128.0
      }
    ]);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockData);

    expect(() => loadLibrary('test.json')).toThrow('Library validation failed');
  });

  test('throws error for negative BPM', () => {
    const mockData = JSON.stringify([
      {
        track_id: 'test1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        bpm: -10
      }
    ]);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockData);

    expect(() => loadLibrary('test.json')).toThrow('Library validation failed');
  });

  test('accepts optional energy field', () => {
    const mockData = JSON.stringify([
      {
        track_id: 'test1',
        track_name: 'Test Track',
        artist: 'Test Artist',
        camelot_key: '8A',
        bpm: 128.0,
        energy: 0.8
      }
    ]);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockData);

    const library = loadLibrary('test.json');

    expect(library[0].energy).toBe(0.8);
  });
});

