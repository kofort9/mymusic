/**
 * Maps the 12 Camelot Wheel numbers to a corresponding Hexadecimal color code.
 * This color mapping is crucial for the visual component of the DJ Assistant,
 * providing instant harmonic context based on the wheel's color-coded system.
 * * Keys that share similar colors are harmonically close (Smooth mixes),
 * while keys with contrasting colors (e.g., 5 to 11) are dissonant (Dead-End Breakers).
 */
export const CAMELOT_COLOR_MAP: { [key: number]: string } = {
  // Blues (Energy Down / Smooth)
  1: '#0056B3', // Deep Blue
  2: '#330088', // Dark Violet
  3: '#8D00CC', // Purple / Magenta

  // Reds/Pinks (Emotional / Active)
  4: '#CC0099', // Red-Violet / Deep Pink
  5: '#FF0055', // Red / Crimson
  6: '#FF4400', // Orange-Red

  // Yellows/Greens (Energy Up / Bright)
  7: '#FFAA00', // Deep Orange / Amber
  8: '#FFFF00', // Bright Yellow
  9: '#88FF00', // Lime Green

  // Cyans/Teals (Cool / Smooth)
  10: '#00CC66', // Green-Cyan / Teal
  11: '#0099CC', // Sky Blue
  12: '#0077AA', // Medium Blue
};

/**
 * Extracts the numeric part of a Camelot code (e.g., '3B' -> 3).
 * @param camelotCode The full Camelot code string (e.g., '1A', '12B').
 * @returns The numeric part of the code, or 0 if invalid.
 */
export function getCamelotNumber(camelotCode: string): number {
  // Use a regular expression to match the number at the start of the string
  const match = camelotCode.match(/^(\d+)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    // Validate range 1-12
    if (num >= 1 && num <= 12) {
      return num;
    }
  }
  // Return 0 for invalid or missing codes
  return 0;
}

/**
 * Gets the Hex color for a given Camelot code.
 * @param camelotCode The full Camelot code (e.g., '9B').
 * @returns A Hex color string (e.g., '#88FF00'), or '#FFFFFF' for invalid codes.
 */
export function getCamelotColor(camelotCode: string): string {
  const number = getCamelotNumber(camelotCode);
  if (number === 0) return '#FFFFFF'; // Invalid code -> White
  return CAMELOT_COLOR_MAP[number] || '#FFFFFF';
}
