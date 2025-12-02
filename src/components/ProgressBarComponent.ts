import { TuiComponent, AppState } from './types';
import { colors, BASE_BAR_BG, SCAN_GRADIENT } from '../theme';

// --- Scanline Logic (Duplicated for now, should be shared) ---
type RgbColor = { r: number; g: number; b: number };
type ScanSettings = {
  speedMs: number;
  pulseWidth: number;
  baseColor: RgbColor;
  freeze: boolean;
  warningFg?: string;
};

function getScanSettings(beatsRemaining: number): ScanSettings {
  if (beatsRemaining <= 8) {
    return {
      speedMs: 0,
      pulseWidth: SCAN_GRADIENT.length,
      baseColor: { r: 210, g: 90, b: 50 },
      freeze: true,
      warningFg: colors.red,
    };
  }
  if (beatsRemaining <= 16) {
    return {
      speedMs: 50,
      pulseWidth: SCAN_GRADIENT.length,
      baseColor: { r: 210, g: 160, b: 60 },
      freeze: false,
    };
  }
  if (beatsRemaining <= 32) {
    return {
      speedMs: 100,
      pulseWidth: SCAN_GRADIENT.length,
      baseColor: { r: 70, g: 160, b: 180 },
      freeze: false,
    };
  }
  return {
    speedMs: 250,
    pulseWidth: SCAN_GRADIENT.length,
    baseColor: { r: 40, g: 110, b: 130 },
    freeze: false,
  };
}

function makeBg(color: RgbColor, factor: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(color.r * factor);
  const g = clamp(color.g * factor);
  const b = clamp(color.b * factor);
  return `\x1b[48;2;${r};${g};${b}m`;
}

function getPulseCenter(length: number, scan: ScanSettings): number {
  if (scan.freeze || scan.speedMs <= 0) return Math.floor(length / 2);
  return Math.floor(Date.now() / scan.speedMs) % length;
}

function wrapDistance(a: number, b: number, length: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, length - direct);
}

function buildScanlineBar(beatsRemaining: number): { bar: string; labelColor: string } {
  const barLength = 32;
  const filled = Math.max(0, Math.min(barLength, Math.floor(beatsRemaining)));
  const chars = Array.from({ length: barLength }, (_, i) => (i < filled ? '█' : '░'));

  const scan = getScanSettings(beatsRemaining);
  const center = getPulseCenter(barLength, scan);

  const colored = chars.map((ch, idx) => {
    const dist = wrapDistance(idx, center, barLength);
    if (dist > Math.floor(scan.pulseWidth / 2)) {
      return `${BASE_BAR_BG}${colors.dim}${ch}${colors.reset}`;
    }
    const gradientIdx = Math.min(dist + Math.floor(scan.pulseWidth / 2), SCAN_GRADIENT.length - 1);
    const factor = SCAN_GRADIENT[gradientIdx] ?? 0.3;
    const bg = makeBg(scan.baseColor, factor);
    const textColor = scan.freeze ? colors.bright : colors.reset;
    return `${bg}${textColor}${ch}${colors.reset}`;
  });

  const labelColor = scan.freeze ? colors.red : colors.white;
  return { bar: colored.join(''), labelColor };
}

export class ProgressBarComponent implements TuiComponent {
  render(width: number, state: AppState): string[] {
    const lines: string[] = [];
    const { currentTrack, phraseInfo } = state;
    const effectiveWidth = Math.max(62, width - 2);

    if (!currentTrack) return lines;

    const now = Date.now();
    const elapsed = now - currentTrack.timestamp;
    const baseProgressMs = currentTrack.progress_ms;
    const additionalProgressMs = currentTrack.isPlaying ? elapsed : 0;
    const currentMs = Math.min(baseProgressMs + additionalProgressMs, currentTrack.duration_ms);

    const barWidth = Math.max(40, Math.min(60, Math.floor(effectiveWidth * 0.5)));

    let percent = 0;
    if (currentTrack.duration_ms > 0) {
      percent = Math.min(1, Math.max(0, currentMs / currentTrack.duration_ms));
    }

    let filledLen = 0;
    if (percent >= 1) filledLen = barWidth;
    else if (percent > 0) filledLen = Math.min(Math.round(barWidth * percent), barWidth);

    const emptyLen = barWidth - filledLen;
    const bar = '▰'.repeat(filledLen) + '▱'.repeat(emptyLen);

    lines.push(`  ${bar}`, '');

    if (phraseInfo) {
      if (phraseInfo.beatsRemaining > 0) {
        lines.push(`${colors.bright}⏱  Phrase Matching${colors.reset}`);
        const { bar: scanBar, labelColor } = buildScanlineBar(phraseInfo.beatsRemaining);
        lines.push(
          scanBar,
          `${labelColor}Beats Rem: ${phraseInfo.beatsRemaining.toFixed(1)} | Time: ${phraseInfo.timeRemainingSeconds.toFixed(1)}s${colors.reset}`,
          ''
        );
      } else if (
        currentTrack.audio_features.time_signature &&
        currentTrack.audio_features.time_signature !== 4
      ) {
        lines.push(
          `${colors.yellow}⚠️  Non-4/4 time signature detected (${currentTrack.audio_features.time_signature}/4)${colors.reset}`,
          `${colors.dim}Phrase counter disabled for non-4/4 tracks${colors.reset}`,
          ''
        );
      }
    }

    return lines;
  }
}
