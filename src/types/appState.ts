import { CurrentTrack, MatchedTrack, LibraryTrack, ShiftType } from './index';
import { PhraseCounter, TerminalRenderer } from '../display';

export interface AppState {
    // Data
    currentTrack: CurrentTrack | null;
    recommendations: MatchedTrack[];
    library: LibraryTrack[];
    lastTrackId: string | null;

    // UI State
    selectedCategory: ShiftType | 'ALL';
    scrollOffset: number;
    showHelp: boolean;
    showExitWarning: boolean;
    debugMessage: string | undefined;

    // System State
    isRefreshingLibrary: boolean;
    isShuttingDown: boolean;
    hasMissingFeatures: boolean;
}

export interface AppComponents {
    phraseCounter: PhraseCounter;
    renderer: TerminalRenderer;
}
