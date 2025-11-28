import { PhraseCounter } from '../src/display';

// Logic to test:
// bar length = 10 blocks
// fill count = round(progress_percent * bar_length)
// bar = "▰" * fill + "▱" * (bar_length - fill)

function generateProgressBar(progressMs: number, durationMs: number): string {
  if (durationMs <= 0) return "▱".repeat(10);
  
  const percent = Math.min(1, Math.max(0, progressMs / durationMs));
  const barLength = 10;
  const fillCount = Math.round(percent * barLength);
  const emptyCount = barLength - fillCount;
  
  return "▰".repeat(fillCount) + "▱".repeat(emptyCount);
}

describe('Progress Bar Logic', () => {
  test('0% progress should be empty', () => {
    expect(generateProgressBar(0, 1000)).toBe("▱▱▱▱▱▱▱▱▱▱");
  });

  test('100% progress should be full', () => {
    expect(generateProgressBar(1000, 1000)).toBe("▰▰▰▰▰▰▰▰▰▰");
  });

  test('50% progress should be half full', () => {
    expect(generateProgressBar(500, 1000)).toBe("▰▰▰▰▰▱▱▱▱▱");
  });

  test('Rounding logic (e.g., 14% -> 1 block)', () => {
    // 140/1000 = 0.14 -> 1.4 -> round to 1
    expect(generateProgressBar(140, 1000)).toBe("▰▱▱▱▱▱▱▱▱▱");
  });

  test('Rounding logic (e.g., 16% -> 2 blocks)', () => {
    // 160/1000 = 0.16 -> 1.6 -> round to 2? No, round(1.6) is 2.
    expect(generateProgressBar(160, 1000)).toBe("▰▰▱▱▱▱▱▱▱▱");
  });
});

