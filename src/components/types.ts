import { CurrentTrack, MatchedTrack, PhraseInfo, ShiftType } from '../types';

export interface AppState {
  currentTrack: CurrentTrack | null;
  recommendations: MatchedTrack[];
  phraseInfo: PhraseInfo | null;
  showExitWarning: boolean;
  debugMessage?: string;
  logs: string[];
  selectedCategory: ShiftType | 'ALL';
  scrollOffset: number;
  showHelp: boolean;
  notices: string[];
  totalTracksInLibrary: number;
  frameWidth: number;
  terminalHeight: number;
}

export interface TuiComponent {
  render(width: number, state: AppState): string[];
}
