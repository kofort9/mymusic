import { animateText } from '../src/animation';

describe('Animation', () => {
  test('animateText returns final text at last frame', () => {
    const finalText = 'Test Track';
    const result = animateText(finalText, 8);
    expect(result).toBe(finalText);
  });

  test('animateText preserves spaces and punctuation', () => {
    const finalText = 'Test - Track, Name';
    const result = animateText(finalText, 0);
    
    // Spaces, hyphens, and commas should be preserved
    expect(result).toContain(' ');
    expect(result).toContain('-');
    expect(result).toContain(',');
  });

  test('animateText progressively reveals text', () => {
    const finalText = 'ABCDEFGH';
    
    // At frame 0, nothing should be revealed (all random)
    const frame0 = animateText(finalText, 0);
    expect(frame0.length).toBe(finalText.length);
    
    // At halfway frame, roughly half should be revealed
    const frame4 = animateText(finalText, 4);
    expect(frame4.substring(0, 4)).toBe('ABCD');
    
    // At last frame, all should be revealed
    const frame8 = animateText(finalText, 8);
    expect(frame8).toBe(finalText);
  });

  test('animateText handles empty string', () => {
    const result = animateText('', 4);
    expect(result).toBe('');
  });
});

