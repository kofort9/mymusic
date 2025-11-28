import {
  animateText,
  runFlipClockAnimation,
  FLIP_TOTAL_FRAMES,
  FLIP_FRAME_DURATION,
} from '../src/animation';

describe('Animation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('animateText returns final text at last frame', () => {
    const finalText = 'Test Track';
    const result = animateText(finalText, FLIP_TOTAL_FRAMES);
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
    const halfFrame = Math.floor(FLIP_TOTAL_FRAMES / 2);
    const frameMid = animateText(finalText, halfFrame);
    expect(frameMid.substring(0, 2)).toBe('AB'); // at least first few should settle

    // At last frame, all should be revealed
    const frameLast = animateText(finalText, FLIP_TOTAL_FRAMES);
    expect(frameLast).toBe(finalText);
  });

  test('animateText handles empty string', () => {
    const result = animateText('', 4);
    expect(result).toBe('');
  });

  describe('runFlipClockAnimation', () => {
    test('calls onFrame for each frame and completes with final text', async () => {
      const onFrame = jest.fn();
      const promise = runFlipClockAnimation('Track', 'Artist', onFrame);

      await jest.runAllTimersAsync();
      await promise;

      expect(onFrame).toHaveBeenCalledTimes(FLIP_TOTAL_FRAMES + 1); // frames 0..TOTAL
      const lastCall = onFrame.mock.calls[onFrame.mock.calls.length - 1];
      expect(lastCall[0]).toBe('Track');
      expect(lastCall[1]).toBe('Artist');
    });

    test('waits the correct duration between frames', async () => {
      const onFrame = jest.fn();
      const promise = runFlipClockAnimation('A', 'B', onFrame);

      // First frame executes immediately
      expect(onFrame).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(FLIP_FRAME_DURATION); // advance one frame delay
      expect(onFrame.mock.calls.length).toBeGreaterThan(1);

      await jest.runAllTimersAsync();
      await promise;
    });
  });
});
