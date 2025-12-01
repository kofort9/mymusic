import * as readline from 'readline';
import { Orchestrator } from './orchestrator';
import { ShiftType } from './types';
import { UI } from './constants';

export class InputHandler {
    private orchestrator: Orchestrator;
    private exitWarningTimeout: NodeJS.Timeout | null = null;
    private categories = ['ALL', ...Object.values(ShiftType)];
    private boundOnKeypress: (str: string, key: readline.Key) => void;
    private onShutdown: () => void;

    constructor(orchestrator: Orchestrator, onShutdown: () => void) {
        this.orchestrator = orchestrator;
        this.onShutdown = onShutdown;
        this.boundOnKeypress = this.onKeypress.bind(this);
    }

    public initialize() {
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
        }
        readline.emitKeypressEvents(process.stdin);
        process.stdin.on('keypress', this.boundOnKeypress);
    }

    public cleanup() {
        process.stdin.removeListener('keypress', this.boundOnKeypress);
        if (this.exitWarningTimeout) clearTimeout(this.exitWarningTimeout);
        if (process.stdin.pause) {
            process.stdin.pause();
        }
    }

    private onKeypress(str: string, key: readline.Key) {
        const state = this.orchestrator.getState();
        if (state.isShuttingDown) return;

        if (key.ctrl && key.name === 'c') {
            if (state.showExitWarning) {
                this.onShutdown();
            } else {
                this.orchestrator.updateState({ showExitWarning: true });
                if (this.exitWarningTimeout) clearTimeout(this.exitWarningTimeout);
                this.exitWarningTimeout = setTimeout(() => {
                    this.orchestrator.updateState({ showExitWarning: false });
                }, UI.EXIT_WARNING_TIMEOUT);
            }
        } else if (key.name === 'tab') {
            const currentIndex = this.categories.indexOf(state.selectedCategory);
            const nextIndex = (currentIndex + 1) % this.categories.length;
            const nextCategory = this.categories[nextIndex] as ShiftType | 'ALL';
            this.orchestrator.updateState({
                selectedCategory: nextCategory,
                scrollOffset: 0,
            });
        } else if (key.name === 'w') {
            const newOffset = Math.max(0, state.scrollOffset - 1);
            this.orchestrator.updateState({ scrollOffset: newOffset });
        } else if (key.name === 's') {
            this.orchestrator.updateState({ scrollOffset: state.scrollOffset + 1 });
        } else if (key.name === 'r') {
            void this.orchestrator.triggerLibraryRefresh();
        } else if (key.name === 'h') {
            this.orchestrator.updateState({ showHelp: !state.showHelp });
        } else if (key.name === 'f' && state.hasMissingFeatures && state.currentTrack) {
            void this.orchestrator.enrichCurrentTrack();
        }
    }
}
