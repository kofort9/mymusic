import { TuiComponent, AppState } from './types';
import { colors, FRAME_BASE_COLOR, FRAME_RIPPLE_COLOR, RIPPLE_GLYPH, RIPPLE_BAND, RIPPLE_STEP_MS } from '../theme';
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

    return {
        active: isActive,
        band: RIPPLE_BAND,
        cycle,
        phase,
    };
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

function colorizeFrameChar(ch: string, row: number, col: number, ripple: RippleState, useRippleGlyph = false): string {
    const active = isInRipple(row, col, ripple);
    const glyph = active && useRippleGlyph ? RIPPLE_GLYPH : ch;
    const color = active ? FRAME_RIPPLE_COLOR : FRAME_BASE_COLOR;
    return `${color}${glyph}${colors.reset}`;
}

function buildRippleBorderLine(width: number, rowIndex: number, ripple: RippleState, isBottom = false): string {
    const leftCorner = isBottom ? '╚' : '╔';
    const rightCorner = isBottom ? '╝' : '╗';
    const chars: string[] = [];

    for (let col = 0; col < width + 2; col++) {
        if (col === 0) {
            chars.push(colorizeFrameChar(leftCorner, rowIndex, col, ripple));
        } else if (col === width + 1) {
            chars.push(colorizeFrameChar(rightCorner, rowIndex, col, ripple));
        } else {
            chars.push(colorizeFrameChar('═', rowIndex, col, ripple, true));
        }
    }
    return chars.join('');
}

function center(text: string, width: number): string {
    const visibleWidth = stringWidth(stripAnsi(text));
    if (visibleWidth >= width) return text;
    const padLeft = Math.floor((width - visibleWidth) / 2);
    return ' '.repeat(padLeft) + text + ' '.repeat(width - visibleWidth - padLeft);
}

function buildRippleTitleLine(title: string, width: number, rowIndex: number, ripple: RippleState): string {
    const centeredTitle = center(title, width);
    const leftBorder = colorizeFrameChar('║', rowIndex, 0, ripple);
    const rightBorder = colorizeFrameChar('║', rowIndex, width + 1, ripple);
    return `${leftBorder}${FRAME_BASE_COLOR}${centeredTitle}${colors.reset}${rightBorder}${colors.reset}`;
}

export class HeaderComponent implements TuiComponent {
    render(width: number, state: AppState): string[] {
        const lines: string[] = [];
        const effectiveWidth = Math.max(62, width - 2);
        const frameWidth = effectiveWidth + 2;

        const ripple = buildRippleState(frameWidth, state.terminalHeight, Boolean(state.currentTrack));
        const title = `${colors.spotifyGreen}ᯤ SpotifyDJ${colors.reset} — Real-Time DJ Assistant`;

        // Top Border
        lines.push(buildRippleBorderLine(effectiveWidth, 0, ripple));

        // Title Line
        lines.push(buildRippleTitleLine(title, effectiveWidth, 1, ripple));

        // Bottom Border (Header separator)
        lines.push(buildRippleBorderLine(effectiveWidth, 2, ripple, true));

        return lines;
    }
}
