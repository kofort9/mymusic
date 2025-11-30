import { TuiComponent, AppState } from './types';
import {
  colors,
  hexToAnsi,
  FRAME_BASE_COLOR,
  FRAME_RIPPLE_COLOR,
  RIPPLE_GLYPH,
  RIPPLE_BAND,
  RIPPLE_STEP_MS,
} from '../theme';
import { ShiftType, MatchedTrack } from '../types';
import { getCamelotColor } from '../camelotColors';
import { SplitFlapRow } from '../animation';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

type RippleState = {
  active: boolean;
  band: number;
  cycle: number;
  phase: number;
};

function buildRippleState(frameWidth: number, frameHeight: number, isActive: boolean): RippleState {
  const virtualHeight = Math.max(6, Math.min(frameHeight, 60));
  const cycle = frameWidth + virtualHeight;
  const phase = Math.floor(Date.now() / RIPPLE_STEP_MS) % cycle;
  return { active: isActive, band: RIPPLE_BAND, cycle, phase };
}

function isInRipple(row: number, col: number, ripple: RippleState): boolean {
  if (!ripple.active) return false;
  const position = (row + col) % ripple.cycle;
  const windowEnd = (ripple.phase + ripple.band) % ripple.cycle;
  if (ripple.phase <= windowEnd) {
    return position >= ripple.phase && position <= windowEnd;
  }
  return position >= ripple.phase || position <= windowEnd;
}

function colorizeFrameChar(
  ch: string,
  row: number,
  col: number,
  ripple: RippleState,
  useRippleGlyph = false
): string {
  const active = isInRipple(row, col, ripple);
  const glyph = active && useRippleGlyph ? RIPPLE_GLYPH : ch;
  const color = active ? FRAME_RIPPLE_COLOR : FRAME_BASE_COLOR;
  return `${color}${glyph}${colors.reset}`;
}

export class RecommendationsComponent implements TuiComponent {
  private rowCache: Map<string, SplitFlapRow> = new Map();
  private lastRecommendationIds: Set<string> = new Set();
  private lastCurrentTrackId: string | null = null;

  render(width: number, state: AppState): string[] {
    const lines: string[] = [];
    const effectiveWidth = Math.max(62, width - 2);
    const frameWidth = effectiveWidth + 2;
    const {
      recommendations,
      selectedCategory,
      currentTrack,
      totalTracksInLibrary,
      debugMessage,
      terminalHeight,
    } = state;

    // If track changed, reset flap animations
    if (currentTrack && currentTrack.track_id !== this.lastCurrentTrackId) {
      this.rowCache.clear();
      this.lastCurrentTrackId = currentTrack.track_id;
    }

    // Build ripple state
    const ripple = buildRippleState(frameWidth, terminalHeight, Boolean(currentTrack));

    // Helper to build border line with ripple
    const buildBorderLine = (rowIndex: number, isBottom = false): string => {
      const leftCorner = isBottom ? '╚' : '╔';
      const rightCorner = isBottom ? '╝' : '╗';
      const chars: string[] = [];
      for (let col = 0; col < frameWidth; col++) {
        if (col === 0) {
          chars.push(colorizeFrameChar(leftCorner, rowIndex, col, ripple));
        } else if (col === frameWidth - 1) {
          chars.push(colorizeFrameChar(rightCorner, rowIndex, col, ripple));
        } else {
          chars.push(colorizeFrameChar('═', rowIndex, col, ripple, true));
        }
      }
      return chars.join('');
    };

    // Helper to wrap content with ripple-enabled side borders
    const wrapInBorders = (content: string, rowIndex: number): string => {
      const visibleLen = stringWidth(stripAnsi(content));
      const padding = Math.max(0, effectiveWidth - visibleLen);
      const paddedContent = content + ' '.repeat(padding);
      const leftBorder = colorizeFrameChar('║', rowIndex, 0, ripple);
      const rightBorder = colorizeFrameChar('║', rowIndex, frameWidth - 1, ripple);
      return `${leftBorder}${FRAME_BASE_COLOR}${paddedContent}${colors.reset}${rightBorder}`;
    };

    // Tabs
    const categories = ['ALL', ...Object.values(ShiftType)];
    const tabs = categories
      .map(cat => {
        return cat === selectedCategory
          ? `${colors.bgBlue}${colors.white} ${cat} ${colors.reset}`
          : `${colors.dim} ${cat} ${colors.reset}`;
      })
      .join(' ');

    const currentBpm = currentTrack
      ? currentTrack.audio_features?.tempo?.toFixed(1) || '0.0'
      : '0.0';

    // HEADER (Included in output, will be sliced by display.ts if scrolled!)
    let rowIndex = 0;
    lines.push(buildBorderLine(rowIndex++));

    const titleLine = `${colors.bright}${colors.spotifyGreen}⚡ Recommendations${colors.reset} ${colors.dim}(Current: ${currentBpm} BPM)${colors.reset}`;
    lines.push(wrapInBorders(titleLine, rowIndex++));
    lines.push(wrapInBorders(tabs, rowIndex++));
    lines.push(wrapInBorders(colors.dim + '─'.repeat(effectiveWidth) + colors.reset, rowIndex++));

    // CONTENT
    if (recommendations.length === 0) {
      if (totalTracksInLibrary === 0) {
        lines.push(wrapInBorders(`${colors.dim}Library is empty.${colors.reset}`, rowIndex++));
        lines.push(
          wrapInBorders(
            `${colors.dim}Tip: export your liked songs as Liked_Songs.csv (Exportify), drop it in this project, and run \`npm run refresh:library\` or press r.${colors.reset}`,
            rowIndex++
          )
        );
      } else {
        lines.push(
          wrapInBorders(
            `${colors.dim}No harmonic matches found in library.${colors.reset}`,
            rowIndex++
          )
        );
      }
      if (debugMessage) {
        lines.push(wrapInBorders(`${colors.red}DEBUG: ${debugMessage}${colors.reset}`, rowIndex++));
      }
    } else {
      // Filter recommendations
      let filteredRecs = recommendations;
      if (selectedCategory !== 'ALL') {
        filteredRecs = recommendations.filter(r => r.shiftType === selectedCategory);
      }

      // Grouping
      const grouped: Record<string, MatchedTrack[]> = {};
      if (selectedCategory === 'ALL') {
        filteredRecs.forEach(track => {
          grouped[track.shiftType] = grouped[track.shiftType] || [];
          grouped[track.shiftType].push(track);
        });
      } else {
        grouped[selectedCategory] = filteredRecs;
      }

      const typeOrder = Object.values(ShiftType);
      const typesToRender =
        selectedCategory === 'ALL' ? typeOrder : [selectedCategory as ShiftType];

      const currentIds = new Set<string>();

      for (const type of typesToRender) {
        const tracks = grouped[type];
        if (tracks && tracks.length > 0) {
          let typeColor = colors.white;
          if (type === ShiftType.SMOOTH) typeColor = colors.spotifyGreen;
          if (type === ShiftType.ENERGY_UP) typeColor = colors.yellow;
          if (type === ShiftType.MOOD_SWITCH) typeColor = colors.magenta;
          if (type === ShiftType.RHYTHMIC_BREAKER) typeColor = colors.red;

          if (selectedCategory === 'ALL') {
            lines.push(wrapInBorders(`${typeColor}▼ ${type}${colors.reset}`, rowIndex++));
          } else {
            lines.push(
              wrapInBorders(`${colors.bright}${typeColor}${type}${colors.reset}`, rowIndex++)
            );
          }

          tracks.forEach(track => {
            const cacheKey = track.track_id;
            currentIds.add(cacheKey);

            // BPM Diff
            let bpmDiffStr = '';
            if (currentTrack && currentTrack.audio_features?.tempo) {
              const bpmDiff =
                ((track.bpm - currentTrack.audio_features.tempo) /
                  currentTrack.audio_features.tempo) *
                100;
              bpmDiffStr = bpmDiff >= 0 ? `+${bpmDiff.toFixed(1)}%` : `${bpmDiff.toFixed(1)}%`;
            }

            const fullLineText = `  [${track.camelot_key}] ${track.track_name} - ${track.artist} (${track.bpm.toFixed(1)} BPM) ${bpmDiffStr}`;
            const availableWidth = effectiveWidth;

            let row = this.rowCache.get(cacheKey);
            if (!row || row.width !== availableWidth) {
              row = new SplitFlapRow(availableWidth);
              this.rowCache.set(cacheKey, row);
            }

            const normalizedInput = fullLineText
              .toUpperCase()
              .padEnd(availableWidth, ' ')
              .slice(0, availableWidth);
            const currentTargetStr = row.target.join('');

            if (currentTargetStr !== normalizedInput) {
              row.setTarget(fullLineText);
            }

            row.step();
            const flappedLine = row.render();

            // Apply Camelot color
            const keyMatch = flappedLine.match(/\[([0-9]+[AB])\]/);
            if (keyMatch) {
              const keyStr = keyMatch[1];
              const hex = getCamelotColor(keyStr);
              const ansiColor = hexToAnsi(hex);
              const coloredLine = flappedLine.replace(
                /(\[[0-9]+[AB]\])/,
                `${ansiColor}${colors.bright}$1${colors.reset}`
              );
              lines.push(wrapInBorders(coloredLine, rowIndex++));
            } else {
              lines.push(wrapInBorders(flappedLine, rowIndex++));
            }
          });
        }
      }

      // Cleanup cache
      for (const cachedId of this.rowCache.keys()) {
        if (!currentIds.has(cachedId)) {
          this.rowCache.delete(cachedId);
        }
      }

      this.lastRecommendationIds = currentIds;
    }

    // Bottom border
    lines.push(buildBorderLine(rowIndex, true));

    return lines;
  }
}
