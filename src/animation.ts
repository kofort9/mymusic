export const CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;\'"!@#$%^&*()_+-=[]{}|<>?/';

/**
 * Seeds the flap counts for the animation.
 * Calculates how many steps each character needs to take to reach the target.
 */
function seedFlapCounts(current: string[], target: string[]): number[] {
  return current.map((char, i) => {
    const targetChar = target[i];
    if (char === targetChar) return 0;

    const currentIdx = CHARSET.indexOf(char);
    const targetIdx = CHARSET.indexOf(targetChar);

    // If characters are not in charset, snap immediately (count 0) or handle gracefully
    if (currentIdx === -1 || targetIdx === -1) return 1; // 1 tick to snap

    // Calculate distance wrapping around the charset
    let distance = targetIdx - currentIdx;
    if (distance < 0) distance += CHARSET.length;

    // Add some randomness or fixed offset if desired, but deterministic is cleaner
    // We can add a minimum spin to make it look "active" even for close chars
    return Math.max(1, distance);
  });
}

export class SplitFlapRow {
  width: number;
  current: string[];
  target: string[];
  counters: number[];

  constructor(width: number) {
    this.width = width;
    this.current = Array(width).fill(' ');
    this.target = Array(width).fill(' ');
    this.counters = Array(width).fill(0);
  }

  setTarget(text: string): void {
    // Normalize text: uppercase and pad/truncate to width
    const normalized = text.toUpperCase().padEnd(this.width, ' ').slice(0, this.width);
    this.target = normalized.split('');
    this.counters = seedFlapCounts(this.current, this.target);
  }

  step(): boolean {
    let active = false;
    for (let i = 0; i < this.width; i++) {
      if (this.counters[i] > 0) {
        // Spin forward
        const currentIdx = CHARSET.indexOf(this.current[i]);
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % CHARSET.length;
        this.current[i] = CHARSET[nextIdx];
        this.counters[i]--;
        active = true;
      } else {
        // Ensure we lock to target exactly when count hits 0
        if (this.current[i] !== this.target[i]) {
          this.current[i] = this.target[i];
        }
      }
    }
    return active;
  }

  render(): string {
    return this.current.join('');
  }
}
