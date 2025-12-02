import { TuiComponent, AppState } from './types';
import { colors, hexToAnsi } from '../theme';
import { SplitFlapRow } from '../animation';
import { getCamelotColor } from '../camelotColors';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

export class TrackInfoComponent implements TuiComponent {
  private mainInfoRow: SplitFlapRow | null = null;
  private bpmRow: SplitFlapRow | null = null;
  private camelotRow: SplitFlapRow | null = null;
  private lastTrackId: string | null = null;

  render(width: number, state: AppState): string[] {
    const lines: string[] = [];
    const effectiveWidth = Math.max(62, width - 2);
    const { currentTrack } = state;

    if (!currentTrack) {
      lines.push(`${colors.yellow}Waiting for playback...${colors.reset}`);
      return lines;
    }

    const now = Date.now();
    const isFlashOn = currentTrack.isPlaying && Math.floor(now / 500) % 2 === 0;
    const recordIndicator = isFlashOn
      ? `${colors.spotifyGreen}⏺${colors.reset}`
      : `${colors.dim}⏺${colors.reset}`;

    // --- Split-Flap Animation Logic ---
    // Calculate reasonable width for track/artist (not full width, to keep indicator close)
    const prefix = '💿  ';
    const prefixWidth = stringWidth(prefix);

    // Use a reasonable max width (60-70 chars) instead of filling entire effective width
    // This keeps the record indicator close to the text
    const maxInfoWidth = Math.min(70, effectiveWidth - prefixWidth - 5);

    // Initialize rows if needed or if width changed significantly
    if (!this.mainInfoRow || this.mainInfoRow.width !== maxInfoWidth) {
      this.mainInfoRow = new SplitFlapRow(maxInfoWidth);
      // BPM and Camelot are shorter
      this.bpmRow = new SplitFlapRow(6); // "128.0"
      this.camelotRow = new SplitFlapRow(4); // "8A"
    }

    // Update targets if track changed
    const trackChanged = currentTrack.track_id !== this.lastTrackId;

    if (trackChanged) {
      // Reset flap rows for clean transition on song change
      if (this.mainInfoRow) this.mainInfoRow = new SplitFlapRow(maxInfoWidth);
      if (this.bpmRow) this.bpmRow = new SplitFlapRow(6);
      if (this.camelotRow) this.camelotRow = new SplitFlapRow(4);

      const combinedInfo = `${currentTrack.track_name} — ${currentTrack.artist}`;
      if (this.mainInfoRow) this.mainInfoRow.setTarget(combinedInfo);

      const bpmVal = currentTrack.audio_features?.tempo?.toFixed(1) || '0.0';
      if (this.bpmRow) this.bpmRow.setTarget(bpmVal);

      const camelVal = currentTrack.camelot_key || '-';
      if (this.camelotRow) this.camelotRow.setTarget(camelVal);

      this.lastTrackId = currentTrack.track_id;
    }

    // Advance animation
    if (this.mainInfoRow) this.mainInfoRow.step();
    if (this.bpmRow) this.bpmRow.step();
    if (this.camelotRow) this.camelotRow.step();

    // Render the rows
    const mainDisplay = this.mainInfoRow ? this.mainInfoRow.render() : '';
    const bpmDisplay = this.bpmRow ? this.bpmRow.render() : '';
    const camelotDisplay = this.camelotRow ? this.camelotRow.render() : '';

    // Line 1: Track - Artist (trim trailing spaces and add indicator close to text)
    const trimmedMain = mainDisplay.trimEnd();
    lines.push(`${prefix}${colors.bright}${trimmedMain}${colors.reset} ${recordIndicator}`);

    // Line 2: BPM and Camelot
    // User requested: BPM: [Flap: 113.0]  •  Camelot: [Flap: 9A]
    let coloredCamel = camelotDisplay;
    if (currentTrack.camelot_key) {
      const hex = getCamelotColor(currentTrack.camelot_key);
      const ansiColor = hexToAnsi(hex);
      coloredCamel = `${ansiColor}${colors.bright}${camelotDisplay}${colors.reset}`;
    }

    const detailsStr = `${colors.bright}BPM:${colors.reset} ${bpmDisplay}  ${colors.dim}•${colors.reset}  ${colors.bright}Camelot:${colors.reset} ${coloredCamel}`;
    lines.push(`    ${detailsStr}`, '');

    return lines;
  }
}
