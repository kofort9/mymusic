import { CurrentTrack, MatchedTrack, PhraseInfo, ShiftType } from './types';
import { AppState } from './components/types';
import { HeaderComponent } from './components/HeaderComponent';
import { TrackInfoComponent } from './components/TrackInfoComponent';
import { ProgressBarComponent } from './components/ProgressBarComponent';
import { RecommendationsComponent } from './components/RecommendationsComponent';
import { StatusBarComponent } from './components/StatusBarComponent';
import { colors } from './theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');
const VERSION = packageJson.version;

export class PhraseCounter {
  calculate(
    bpm: number,
    progressMs: number,
    timestamp: number,
    timeSignature?: number,
    isPlaying = true
  ): PhraseInfo {
    if (bpm <= 0) {
      return { beatsRemaining: 32, timeRemainingSeconds: 0, phraseCount: 1 };
    }

    const now = Date.now();
    const safeTimestamp = timestamp > 0 ? timestamp : now;
    const elapsed = isPlaying ? now - safeTimestamp : 0;
    const currentProgressMs = progressMs + elapsed;
    const beatDurationMs = 60000 / bpm;
    const totalBeats = currentProgressMs / beatDurationMs;

    if (timeSignature && timeSignature !== 4) {
      return { beatsRemaining: 0, timeRemainingSeconds: 0, phraseCount: 0 };
    }

    const beatsInPhrase = 32;
    const positionInPhrase = totalBeats % beatsInPhrase;
    const beatsRemaining = beatsInPhrase - positionInPhrase;
    const timeRemainingSeconds = (beatsRemaining * beatDurationMs) / 1000;
    const phraseCount = Math.floor(positionInPhrase) + 1;

    return { beatsRemaining, timeRemainingSeconds, phraseCount };
  }
}

const CLEAR_TO_END = '\x1b[0K';

export class TerminalRenderer {
  private previousFrame: string[] = [];

  // Components
  private header = new HeaderComponent();
  private trackInfo = new TrackInfoComponent();
  private progressBar = new ProgressBarComponent();
  private recommendations = new RecommendationsComponent();
  private statusBar = new StatusBarComponent();

  resetFrameCache(): void {
    this.previousFrame = [];
  }

  writeFrame(lines: string[]): void {
    const terminalHeight = process.stdout.rows || 24;
    const clippedLines = lines.slice(0, terminalHeight);
    const maxRows = Math.max(clippedLines.length, this.previousFrame.length);
    const buffer: string[] = [];

    buffer.push('\x1b[H');

    for (let i = 0; i < maxRows; i++) {
      const next = clippedLines[i] ?? '';
      const prev = this.previousFrame[i] ?? '';
      if (next !== prev) {
        buffer.push(`\x1b[${i + 1};1H${next}${CLEAR_TO_END}`);
      }
    }

    if (buffer.length > 0) {
      process.stdout.write(buffer.join(''));
    }

    this.previousFrame = clippedLines.slice();
  }

  renderNarrowWarning(width: number): void {
    this.resetFrameCache();
    const terminalHeight = process.stdout.rows || 24;
    const lines: string[] = [];

    // Fill with blank lines to clear previous content
    const warningLines = [
      '',
      `${colors.yellow}⚠️  Terminal too narrow!${colors.reset}`,
      `Minimum width: 80 characters`,
      `Current width: ${width} characters`,
      '',
      'Please resize your terminal window.',
    ];

    // Add blank lines before warning to center it vertically
    const blankLinesBefore = Math.floor((terminalHeight - warningLines.length) / 2);
    for (let i = 0; i < blankLinesBefore; i++) {
      lines.push('');
    }

    // Add warning lines
    lines.push(...warningLines);

    // Fill remaining lines to ensure full screen is overwritten
    while (lines.length < terminalHeight) {
      lines.push('');
    }

    this.writeFrame(lines);
  }

  renderTrainBoard(
    currentTrack: CurrentTrack | null,
    recommendations: MatchedTrack[],
    phraseInfo: PhraseInfo | null,
    showExitWarning = false,
    debugMessage?: string,
    logs: string[] = [],
    selectedCategory: ShiftType | 'ALL' = 'ALL',
    scrollOffset = 0,
    showHelp = false,
    notices: string[] = [],
    totalTracksInLibrary = 0
  ): { clampedOffset: number; maxScroll: number } {
    const terminalWidth = process.stdout.columns || 80;
    const terminalHeight = process.stdout.rows || 24;
    const uiWidth = Math.min(terminalWidth, 120);

    const state: AppState = {
      currentTrack,
      recommendations,
      phraseInfo,
      showExitWarning,
      debugMessage,
      logs,
      selectedCategory,
      scrollOffset,
      showHelp,
      notices,
      totalTracksInLibrary,
      frameWidth: uiWidth,
      terminalHeight
    };

    const lines: string[] = [];

    // 1. Header
    lines.push(...this.header.render(uiWidth, state));
    lines.push(`${colors.dim}Version: ${VERSION}${colors.reset}`, '');

    // Notices
    if (notices.length > 0) {
      notices.forEach(note => lines.push(`${colors.yellow}⚠️  ${note}${colors.reset}`));
      lines.push('');
    }

    // 2. Track Info
    lines.push(...this.trackInfo.render(uiWidth, state));

    // 3. Progress Bar
    lines.push(...this.progressBar.render(uiWidth, state));

    // 4. Recommendations
    // The component returns ALL lines (headers + content + bottom border).
    // We need to separate them to keep headers fixed while scrolling content.
    const allRecLines = this.recommendations.render(uiWidth, state);

    // Extract fixed parts (Top Border, Title, Tabs, Separator = 4 lines)
    const headerLines = allRecLines.slice(0, 4);
    const bottomBorderLine = allRecLines[allRecLines.length - 1];
    const contentLines = allRecLines.slice(4, -1);

    // Calculate available space
    const usedLinesTop = lines.length;

    // Reserve space for footer/logs/help
    const statusLineCount = showExitWarning ? 2 : 3;
    let reservedLines = statusLineCount + 1; // +1 for blank line before status

    // Help
    let helpLines: string[] = [];
    if (showHelp) {
      const separator = '─'.repeat(Math.max(62, uiWidth - 2));
      helpLines = [
        `${colors.dim}${separator}${colors.reset}`,
        `${colors.bright}${colors.cyan}HELP${colors.reset}`,
        `${colors.dim}${separator}${colors.reset}`,
        `${colors.bright}h${colors.reset}: toggle help   ${colors.bright}tab${colors.reset}: categories   ${colors.bright}w/s${colors.reset}: scroll`,
        `${colors.bright}r${colors.reset}: refresh library   ${colors.bright}Ctrl+C${colors.reset}: exit`,
        `${colors.dim}Scanline glow speeds up near the mix window and locks red inside the final 8 beats.${colors.reset}`,
      ];
      reservedLines += helpLines.length + 1;
    }

    // Logs (only shown in debug mode)
    let logLines: string[] = [];
    if (logs.length > 0) {
      const separator = '─'.repeat(Math.max(62, uiWidth - 2));
      logLines = ['', `${colors.dim}${separator}${colors.reset}`, `${colors.bright}${colors.red}DEBUG LOGS:${colors.reset}`];
      logs.forEach(log => logLines.push(`${colors.dim}${log}${colors.reset}`));
      reservedLines += logLines.length;
    }

    // Calculate space for SCROLLABLE content
    // Total available - headers (4) - bottom border (1)
    const fixedRecLinesCount = 5;
    const availableTotal = Math.max(0, terminalHeight - 1 - usedLinesTop - reservedLines);
    const availableForContent = Math.max(0, availableTotal - fixedRecLinesCount);

    // Pagination for content only
    const totalContentLines = contentLines.length;
    if (scrollOffset < 0) scrollOffset = 0;
    const maxScroll = Math.max(0, totalContentLines - availableForContent);
    if (scrollOffset > maxScroll) scrollOffset = maxScroll;

    const visibleContentLines = contentLines.slice(scrollOffset, scrollOffset + availableForContent);

    // Render Recommendations
    if (availableTotal >= fixedRecLinesCount) {
      lines.push(...headerLines);
      lines.push(...visibleContentLines);

      // Fill empty space with side borders to connect to Status Bar
      // We fill ALL remaining lines up to the status bar to ensure a continuous box
      // and to overwrite any potential artifacts from previous frames.
      while (lines.length < terminalHeight - statusLineCount) {
        const effectiveWidth = Math.max(62, uiWidth - 2);
        lines.push(`║${' '.repeat(effectiveWidth)}║`);
      }
      // Bottom border removed - Status Bar will close the box
    } else {
      lines.push(`${colors.dim} (Terminal too small to show recommendations) ${colors.reset}`);
    }

    // Append reserved
    if (logLines.length > 0) lines.push(...logLines);
    if (showHelp) {
      lines.push('');
      lines.push(...helpLines);
    }

    // Fill blank lines
    while (lines.length < terminalHeight - statusLineCount) {
      lines.push('');
    }

    // 5. Status Bar
    lines.push(...this.statusBar.render(uiWidth, state));

    this.writeFrame(lines);

    return { clampedOffset: scrollOffset, maxScroll };
  }
}
