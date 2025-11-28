import { convertToCamelot } from '../src/camelot';

describe('Camelot Conversion', () => {
  // Test cases for Minor keys (Mode 0)
  test('converts C Minor (0,0) to 5A', () => {
    expect(convertToCamelot(0, 0)).toBe('5A');
  });
  test('converts A Minor (9,0) to 8A', () => {
    expect(convertToCamelot(9, 0)).toBe('8A');
  });
  test('converts Ab Minor (8,0) to 1A', () => {
    expect(convertToCamelot(8, 0)).toBe('1A');
  });

  // Test cases for Major keys (Mode 1)
  test('converts C Major (0,1) to 8B', () => {
    expect(convertToCamelot(0, 1)).toBe('8B');
  });
  test('converts B Major (11,1) to 1B', () => {
    expect(convertToCamelot(11, 1)).toBe('1B');
  });
  test('converts F# Major (6,1) to 2B', () => {
    expect(convertToCamelot(6, 1)).toBe('2B');
  });

  // Edge cases
  test('throws error for invalid key', () => {
    expect(() => convertToCamelot(12, 0)).toThrow();
    expect(() => convertToCamelot(-1, 0)).toThrow();
  });
  test('throws error for invalid mode', () => {
    expect(() => convertToCamelot(0, 2)).toThrow();
    expect(() => convertToCamelot(0, -1)).toThrow();
  });
});

