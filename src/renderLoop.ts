import { Orchestrator } from './orchestrator';
import { PhraseCounter, TerminalRenderer } from './display';
import { UI } from './constants';
import { logger, getLogs } from './utils/logger';
import { ApiUsageTracker } from './utils/apiUsageTracker';
import { isTerminalTooNarrow } from './utils/terminal';

export class RenderLoop {
    private orchestrator: Orchestrator;
    private phraseCounter: PhraseCounter;
    private renderer: TerminalRenderer;
    private uiInterval: NodeJS.Timeout | null = null;
    private isDebugMode: boolean;
    private lastRenderedTrackId: string | null = null;

    constructor(orchestrator: Orchestrator, isDebugMode: boolean = false) {
        this.orchestrator = orchestrator;
        this.isDebugMode = isDebugMode;
        this.phraseCounter = new PhraseCounter();
        this.renderer = new TerminalRenderer();
    }

    public start() {
        this.uiInterval = setInterval(() => {
            this.render();
        }, UI.REFRESH_RATE);

        // Initial clear
        process.stdout.write('\x1b[2J\x1b[0f');

        // Handle resize
        process.stdout.on('resize', () => {
            this.render();
        });
    }

    public stop() {
        if (this.uiInterval) {
            clearInterval(this.uiInterval);
            this.uiInterval = null;
        }
    }

    public render() {
        const state = this.orchestrator.getState();
        if (state.isShuttingDown) return;

        const logs = this.isDebugMode ? getLogs() : [];

        // Check minimum terminal width
        const terminalWidth = process.stdout.columns || UI.MIN_TERMINAL_WIDTH;
        if (terminalWidth < UI.MIN_TERMINAL_WIDTH) {
            this.renderer.renderNarrowWarning(terminalWidth);
            return;
        }

        let phraseInfo = null;
        if (state.currentTrack && state.currentTrack.audio_features.tempo > 0) {
            phraseInfo = this.phraseCounter.calculate(
                state.currentTrack.audio_features.tempo,
                state.currentTrack.progress_ms,
                state.currentTrack.timestamp,
                state.currentTrack.audio_features.time_signature,
                state.currentTrack.isPlaying ?? true
            );
        }

        const notices: string[] = [];
        const currentTrackId = state.currentTrack?.track_id;
        const libraryMatch = currentTrackId
            ? state.library.find(track => track.track_id === currentTrackId)
            : undefined;

        const hasTempo = Boolean(
            state.currentTrack?.audio_features?.tempo && state.currentTrack.audio_features.tempo > 0
        );
        const hasCamelot = Boolean(state.currentTrack?.camelot_key);
        const libHasTempo = Boolean(libraryMatch?.bpm && libraryMatch.bpm > 0);
        const libHasCamelot = Boolean(libraryMatch?.camelot_key);

        if (!state.currentTrack) {
            notices.push('No playback detected on Spotify. Start a track to see harmonic matches.');
        } else if (!hasTempo || !hasCamelot || !libHasTempo || !libHasCamelot) {
            if (state.hasMissingFeatures) {
                const tracker = ApiUsageTracker.getInstance();
                const remaining = tracker.getRemaining();
                notices.push(
                    `⚠️  Missing BPM/Key for current track. Press 'f' to fetch from SongBPM (${remaining}/100 API calls remaining)`
                );
            } else {
                notices.push(
                    'Missing BPM/Key for current track. Press r to refresh library or enable SongBPM fallback in .env.'
                );
            }
        }

        // Reset frame cache when track changes
        if (currentTrackId !== this.lastRenderedTrackId) {
            this.renderer.resetFrameCache();
            this.lastRenderedTrackId = currentTrackId || null;
        }

        const { clampedOffset } = this.renderer.renderTrainBoard(
            state.currentTrack,
            state.recommendations,
            phraseInfo,
            state.showExitWarning,
            state.debugMessage,
            logs,
            state.selectedCategory,
            state.scrollOffset,
            state.showHelp,
            notices,
            state.library.length
        );

        // Update scroll offset if clamped
        if (clampedOffset !== state.scrollOffset) {
            this.orchestrator.updateState({ scrollOffset: clampedOffset });
        }
    }

    public cleanup() {
        this.stop();
        // Show cursor and clear screen
        process.stdout.write('\x1b[?25h'); // Show cursor
        process.stdout.write('\x1b[2J\x1b[0f'); // Clear screen

        // Silence console transport
        const transports = (logger as any).transports as Array<any> | undefined;
        if (transports) {
            transports.forEach(t => {
                if ((t as any).name === 'console') {
                    (t as any).silent = true;
                }
            });
        }

        logger.info('Goodbye!');
        if (process.env.NODE_ENV !== 'test') {
            const farewell = [
                '',
                'SpotifyDJ · Session ended gracefully',
                '',
                'Thanks for grooving with us. See you next set! ✨',
                '',
            ].join('\n');
            // eslint-disable-next-line no-console
            console.log(farewell);
        }
    }
}
