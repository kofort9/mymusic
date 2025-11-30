import { TuiComponent, AppState } from './types';
import { colors, FRAME_BASE_COLOR, FRAME_RIPPLE_COLOR, RIPPLE_GLYPH, RIPPLE_BAND, RIPPLE_STEP_MS } from '../theme';
import * as os from 'os';

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

export class StatusBarComponent implements TuiComponent {
    render(width: number, state: AppState): string[] {
        const lines: string[] = [];
        const effectiveWidth = Math.max(62, width - 2);
        const frameWidth = effectiveWidth + 2;
        const { showExitWarning, terminalHeight, currentTrack } = state;

        const statusLineCount = showExitWarning ? 2 : 3;
        const statusStartRow = terminalHeight - statusLineCount;

        const ripple = buildRippleState(frameWidth, terminalHeight, Boolean(currentTrack));
        const separator = buildRippleBorderLine(effectiveWidth, statusStartRow, ripple, true);

        if (showExitWarning) {
            lines.push(separator);
            lines.push(' Press Ctrl-C again to exit ');
            return lines;
        }

        const username = process.env.USER || os.userInfo().username;
        const hostname = os.hostname().split('.')[0];
        const userHost = `${username}@${hostname}`;
        const cwd = process.cwd().replace(os.homedir(), '~');
        const branch = '<main>';
        const controls = 'w/s: scroll | tab: category | r: refresh | h: help';

        lines.push(separator);
        lines.push(`${colors.zshGreen}${userHost}${colors.reset} | ${colors.white}${controls}${colors.reset}`);
        lines.push(`${colors.zshBlue}${cwd}  ${colors.zshYellow}${branch}${colors.reset}`);

        return lines;
    }
}
