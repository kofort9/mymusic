export const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgBlack: '\x1b[40m',
    fgBlack: '\x1b[30m',
    spotifyGreen: '\x1b[38;2;29;185;84m',
    lightGreen: '\x1b[92m',
    zshGreen: '\x1b[32m',
    zshBlue: '\x1b[34m',
    zshYellow: '\x1b[33m',
};

export const FRAME_BASE_COLOR = `${colors.bright}${colors.cyan}`;
export const FRAME_RIPPLE_COLOR = `${colors.spotifyGreen}${colors.bright}`;
export const RIPPLE_GLYPH = '▒';
export const RIPPLE_BAND = 5;
export const RIPPLE_STEP_MS = 90;
export const BASE_BAR_BG = '\x1b[48;2;30;30;30m';
export const SCAN_GRADIENT = [0.3, 0.6, 1, 0.6, 0.3];

// Helper to convert Hex to ANSI 24-bit color
export function hexToAnsi(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}
