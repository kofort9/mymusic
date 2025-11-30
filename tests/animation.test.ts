import { SplitFlapRow } from '../src/animation';

describe('SplitFlapRow', () => {
  test('initializes with blank spaces', () => {
    const row = new SplitFlapRow(10);
    expect(row.current.join('')).toBe('          ');
    expect(row.target.join('')).toBe('          ');
  });

  test('sets target text correctly', () => {
    const row = new SplitFlapRow(10);
    row.setTarget('HELLO');
    expect(row.target.join('')).toBe('HELLO     ');
  });

  test('truncates text that is too long', () => {
    const row = new SplitFlapRow(5);
    row.setTarget('LONGER TEXT');
    expect(row.target.join('')).toBe('LONGE');
  });

  test('updates current text towards target on step', () => {
    const row = new SplitFlapRow(5);
    row.setTarget('A');

    // Initial state
    expect(row.current[0]).toBe(' ');

    // Step until completion
    let steps = 0;
    while (row.step() && steps < 100) {
      steps++;
    }

    expect(row.current[0]).toBe('A');
    expect(steps).toBeGreaterThan(0);
  });

  test('returns false when animation is complete', () => {
    const row = new SplitFlapRow(5);
    row.setTarget('TEST');

    // Run until done
    while (row.step());

    // Next step should return false
    expect(row.step()).toBe(false);
  });

  test('handles changing targets mid-animation', () => {
    const row = new SplitFlapRow(10);
    row.setTarget('FIRST');
    row.step();

    row.setTarget('SECOND');
    expect(row.target.join('')).toBe('SECOND    ');

    // Should eventually reach new target
    while (row.step());
    expect(row.current.join('')).toBe('SECOND    ');
  });
});
