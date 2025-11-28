import { ShiftType, CamelotCode, LibraryTrack, CurrentTrack, MatchedTrack } from './types';

// Camelot Wheel Logic for Compatibility
// Numbers 1-12
// Letters A (Minor), B (Major)

function parseCamelot(code: string): { num: number, letter: string } {
  const match = code.match(/^(\d+)([AB])$/);
  if (!match) throw new Error(`Invalid Camelot code: ${code}`);
  const num = parseInt(match[1], 10);
  // Camelot wheel only has numbers 1-12
  if (num < 1 || num > 12) throw new Error(`Invalid Camelot code: ${code}`);
  return { num, letter: match[2] };
}

function formatCamelot(num: number, letter: string): string {
  // Wrap around 12
  let n = num;
  if (n > 12) n -= 12;
  if (n < 1) n += 12;
  return `${n}${letter}`;
}

export function getCompatibleKeys(camelotCode: string): Record<ShiftType, string[]> {
  const { num, letter } = parseCamelot(camelotCode);
  const matches: Record<ShiftType, string[]> = {
    [ShiftType.SMOOTH]: [],
    [ShiftType.MOOD_SWITCH]: [],
    [ShiftType.ENERGY_UP]: [],
    [ShiftType.ENERGY_DOWN]: [],
    [ShiftType.RHYTHMIC_BREAKER]: []
  };

  // Smooth: ±1 same letter, same key same letter
  matches[ShiftType.SMOOTH].push(formatCamelot(num, letter)); // Same key
  matches[ShiftType.SMOOTH].push(formatCamelot(num - 1, letter));
  matches[ShiftType.SMOOTH].push(formatCamelot(num + 1, letter));

  // Mood Switch: Same number, opposite letter
  const oppositeLetter = letter === 'A' ? 'B' : 'A';
  matches[ShiftType.MOOD_SWITCH].push(formatCamelot(num, oppositeLetter));

  // Energy Up: +2 same letter (Some theories say +1 is energy boost, +2 is bigger. Plan says +2)
  // Plan says: Energy Up (+2 same letter)
  matches[ShiftType.ENERGY_UP].push(formatCamelot(num + 2, letter));

  // Energy Down: -2 same letter
  matches[ShiftType.ENERGY_DOWN].push(formatCamelot(num - 2, letter));

  // Rhythmic/Dead-End Breaker: ±7 same letter (This is often used for major shifts)
  matches[ShiftType.RHYTHMIC_BREAKER].push(formatCamelot(num + 7, letter)); // Halfway across the wheel

  return matches;
}

export function filterMatches(
  currentTrack: CurrentTrack, 
  library: LibraryTrack[], 
  compatibleKeys: Record<ShiftType, string[]>
): MatchedTrack[] {
  const matchedTracks: MatchedTrack[] = [];
  const currentBpm = currentTrack.audio_features.tempo;

  // BPM Range: ±10%
  const minBpm = currentBpm * 0.9;
  const maxBpm = currentBpm * 1.1;

  for (const track of library) {
    // Skip same track
    if (track.track_id === currentTrack.track_id) continue;

    // Check BPM (Only filter if current BPM is valid > 0)
    if (currentBpm > 0) {
        if (track.bpm < minBpm || track.bpm > maxBpm) continue;
    }

    // Check Key
    let shiftType: ShiftType | null = null;
    
    for (const [type, keys] of Object.entries(compatibleKeys)) {
      if (keys.includes(track.camelot_key)) {
        shiftType = type as ShiftType;
        break; // Prioritize based on iteration order or logic? 
               // Here it takes the first match found in the compatibleKeys object entries order.
               // Ideally we might want to handle multiple types, but for MVP one is fine.
      }
    }

    if (shiftType) {
      matchedTracks.push({
        ...track,
        shiftType
      });
    }
  }

  return matchedTracks;
}

