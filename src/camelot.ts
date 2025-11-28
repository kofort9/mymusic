export const CAMELOT_MAP: Record<string, string> = {
  // Mode 0 = Minor (A)
  '0,0': '5A', // C Minor
  '1,0': '12A', // Db Minor / C# Minor
  '2,0': '7A', // D Minor
  '3,0': '2A', // Eb Minor / D# Minor
  '4,0': '9A', // E Minor
  '5,0': '4A', // F Minor
  '6,0': '11A', // F# Minor / Gb Minor
  '7,0': '6A', // G Minor
  '8,0': '1A', // Ab Minor / G# Minor
  '9,0': '8A', // A Minor
  '10,0': '3A', // Bb Minor / A# Minor
  '11,0': '10A', // B Minor

  // Mode 1 = Major (B)
  '0,1': '8B', // C Major
  '1,1': '3B', // Db Major / C# Major
  '2,1': '10B', // D Major
  '3,1': '5B', // Eb Major / D# Major
  '4,1': '12B', // E Major
  '5,1': '7B', // F Major
  '6,1': '2B', // F# Major / Gb Major
  '7,1': '9B', // G Major
  '8,1': '4B', // Ab Major / G# Major
  '9,1': '11B', // A Major
  '10,1': '6B', // Bb Major / A# Major
  '11,1': '1B', // B Major
};

export function convertToCamelot(key: number, mode: number): string {
  if (key < 0 || key > 11 || (mode !== 0 && mode !== 1)) {
    throw new Error(`Invalid key/mode combination: key=${key}, mode=${mode}`);
  }
  const lookupKey = `${key},${mode}`;
  return CAMELOT_MAP[lookupKey];
}
