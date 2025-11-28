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

  test('animateText uses dissolve pattern randomness', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const result = animateText('XYZ', 0, 'dissolve');
    expect(result.length).toBe(3);
    randomSpy.mockRestore();
  });

  test('animateText uses waterfall drift before settling', () => {
    // For single character, threshold is 0 so progress >= threshold but still within drift window
    const driftFrame = 1; // early frame to stay below threshold + 0.12
    const result = animateText('A', driftFrame, 'waterfall', [0]);
    expect(result).toBe('B'); // ANIMATION_CHARS[1] since frame=1, index=0
  });

  test('waterfall pattern order groups by column modulo', () => {
    // Using length 6 ensures waterfall branch runs and sorts by modulo 4
    const text = 'ABCDEF';
    const result = animateText(text, 0, 'waterfall');
    expect(result.length).toBe(text.length);
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
