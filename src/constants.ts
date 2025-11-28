// Application Constants
export const POLLING = {
    DEFAULT_INTERVAL: 5000, // 5 seconds default poll interval
    MAX_INTERVAL: 10000, // Cap at 10 seconds to detect skips
    FAST_INTERVAL: 1000, // 1 second during transition window
    TRANSITION_THRESHOLD: 5000, // 5 seconds remaining = start fast polling
} as const;

export const UI = {
    REFRESH_RATE: 100, // UI refresh rate in milliseconds
    MIN_TERMINAL_WIDTH: 80, // Minimum terminal width for proper display
    EXIT_WARNING_TIMEOUT: 1000, // Exit warning display duration in milliseconds
} as const;

export const RATE_LIMITS = {
    SPOTIFY: {
        TOKENS_PER_INTERVAL: 10,
        INTERVAL: 1000, // 10 requests per second
    },
    SONG_BPM: {
        TOKENS_PER_INTERVAL: 2,
        INTERVAL: 1000, // 2 requests per second (conservative)
    },
} as const;

export const CIRCUIT_BREAKER = {
    SPOTIFY: {
        FAILURE_THRESHOLD: 3,
        RESET_TIMEOUT: 30000, // 30 seconds
    },
    SONG_BPM: {
        FAILURE_THRESHOLD: 5,
        RESET_TIMEOUT: 60000, // 60 seconds
    },
} as const;
