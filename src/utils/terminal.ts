import { UI } from '../constants';

export function isTerminalTooNarrow(width?: number): boolean {
    const terminalWidth = width ?? process.stdout.columns ?? UI.MIN_TERMINAL_WIDTH;
    return terminalWidth < UI.MIN_TERMINAL_WIDTH;
}
