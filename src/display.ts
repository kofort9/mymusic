import { CurrentTrack, MatchedTrack, PhraseInfo, ShiftType } from './types';
import { getCamelotColor } from './camelotColors';
import * as os from 'os';
import * as path from 'path';

// Simple ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgBlack: "\x1b[40m",
  fgBlack: "\x1b[30m",
  spotifyGreen: "\x1b[38;2;29;185;84m",
  lightGreen: "\x1b[92m", 
  zshGreen: "\x1b[32m", 
  zshBlue: "\x1b[34m",  
  zshYellow: "\x1b[33m" 
};

// Helper to convert Hex to ANSI 24-bit color
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const packageJson = require('../package.json');
const VERSION = `v${packageJson.version}`;

export class PhraseCounter {
  calculate(bpm: number, progressMs: number, timestamp: number, timeSignature?: number): PhraseInfo {
    // Handle zero or negative BPM gracefully
    if (bpm <= 0) {
      return { beatsRemaining: 32, timeRemainingSeconds: 0, phraseCount: 1 };
    }

    const now = Date.now();
    const safeTimestamp = timestamp > 0 ? timestamp : now;
    
    const elapsed = now - safeTimestamp;
    const currentProgressMs = progressMs + elapsed;

    const beatDurationMs = 60000 / bpm;

    const totalBeats = currentProgressMs / beatDurationMs;
    
    // Phrase counter only valid for 4/4 time
    // For other time signatures, return a default or skip
    if (timeSignature && timeSignature !== 4) {
      return { beatsRemaining: 0, timeRemainingSeconds: 0, phraseCount: 0 };
    }
    
    const beatsInPhrase = 32; // 32 beats = 8 bars of 4/4
    const positionInPhrase = totalBeats % beatsInPhrase;
    const beatsRemaining = beatsInPhrase - positionInPhrase;
    const timeRemainingSeconds = (beatsRemaining * beatDurationMs) / 1000;
    const phraseCount = Math.floor(positionInPhrase) + 1;

    return {
      beatsRemaining,
      timeRemainingSeconds,
      phraseCount
    };
  }
}

// Helper to center text in a given width
function center(text: string, width: number): string {
  const len = text.replace(/\x1b\[[0-9;]*m/g, '').length; 
  if (len >= width) return text;
  const padLeft = Math.floor((width - len) / 2);
  return " ".repeat(padLeft) + text + " ".repeat(width - len - padLeft);
}

export function renderTrainBoard(
  currentTrack: CurrentTrack | null, 
  recommendations: MatchedTrack[], 
  phraseInfo: PhraseInfo | null,
  showExitWarning: boolean = false,
  debugMessage?: string,
  logs: string[] = []
): void {
  process.stdout.write('\x1b[2J\x1b[0f'); 

  const terminalWidth = process.stdout.columns || 80;
  const terminalHeight = process.stdout.rows || 24;
  
  // Allow UI to grow wider than 80 chars for better use of space
  const uiWidth = Math.min(terminalWidth, 120); 
  const effectiveWidth = Math.max(62, uiWidth - 2);

  const title = "ᯤ Spotify RT DJ Assistant (MVP)";
  const horizontalLine = "═".repeat(effectiveWidth);

  console.log(`${colors.bright}${colors.cyan}╔${horizontalLine}╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${center(title, effectiveWidth)}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚${horizontalLine}╝${colors.reset}`);
  console.log(`${colors.dim}Version: ${VERSION}${colors.reset}`);
  console.log('');

  if (!currentTrack) {
    console.log(`${colors.yellow}Waiting for playback...${colors.reset}`);
  } else {
    const now = Date.now();
    const isFlashOn = currentTrack.isPlaying && Math.floor(now / 500) % 2 === 0;
    const recordIndicator = isFlashOn ? `${colors.spotifyGreen}⏺${colors.reset}` : `${colors.dim}⏺${colors.reset}`;
    
    const trackName = `${colors.bright}${currentTrack.track_name}${colors.reset}`;
    const artistName = `${colors.bright}${currentTrack.artist}${colors.reset}`;
    const rawInfo = `${currentTrack.track_name} — ${currentTrack.artist}`;
    const maxInfoWidth = effectiveWidth - 10; 
    
    let displayInfo = `${trackName} — ${artistName}`;
    if (rawInfo.length > maxInfoWidth) {
        const truncatedRaw = rawInfo.substring(0, maxInfoWidth - 1) + "…";
        displayInfo = `${colors.bright}${truncatedRaw}${colors.reset}`; 
    }
    
    console.log(`💿  ${displayInfo} ${recordIndicator}`);
    console.log('');

    const elapsed = now - currentTrack.timestamp;
    const currentMs = Math.min(currentTrack.progress_ms + (currentTrack.isPlaying ? elapsed : 0), currentTrack.duration_ms);
    // Dynamic progress bar width: 40% of terminal width, minimum 40 (per NEWIDEAS.md), maximum 60
    const barWidth = Math.max(40, Math.min(60, Math.floor(effectiveWidth * 0.5))); 
    const percent = Math.min(1, Math.max(0, currentMs / currentTrack.duration_ms));
    const filledLen = Math.round(barWidth * percent);
    const emptyLen = barWidth - filledLen;
    const bar = "▰".repeat(filledLen) + "▱".repeat(emptyLen);
    
    console.log(`  ${bar}`); 
    console.log('');

    const separator = "─".repeat(effectiveWidth);
    console.log(`${colors.dim}${separator}${colors.reset}`);
    console.log('');

    const bpmVal = currentTrack.audio_features.tempo.toFixed(1);
    const camelVal = currentTrack.camelot_key || "-";
    
    let coloredCamel = camelVal;
    if (currentTrack.camelot_key) {
        const hex = getCamelotColor(currentTrack.camelot_key);
        const ansiColor = hexToAnsi(hex);
        coloredCamel = `${ansiColor}${camelVal}${colors.reset}`;
    }
    
    const detailsStr = `BPM: ${bpmVal}          •          Camel Code: ${coloredCamel}`;
    console.log(detailsStr);
    console.log('');

    if (phraseInfo) {
      // Skip phrase display if not 4/4 time (beatsRemaining = 0 indicates this)
      if (phraseInfo.beatsRemaining > 0) {
        console.log(`${colors.bright}⏱  Phrase Matching${colors.reset}`);
        const bars = '█'.repeat(Math.floor(phraseInfo.beatsRemaining));
        const empty = '░'.repeat(32 - Math.floor(phraseInfo.beatsRemaining));
        const color = phraseInfo.beatsRemaining < 8 ? colors.red : colors.green;
        console.log(`${color}${bars}${colors.dim}${empty}${colors.reset}`);
        console.log(`${colors.white}Beats Rem: ${phraseInfo.beatsRemaining.toFixed(1)} | Time: ${phraseInfo.timeRemainingSeconds.toFixed(1)}s${colors.reset}`);
        console.log('');
      } else if (currentTrack && currentTrack.audio_features.time_signature && currentTrack.audio_features.time_signature !== 4) {
        console.log(`${colors.yellow}⚠️  Non-4/4 time signature detected (${currentTrack.audio_features.time_signature}/4)${colors.reset}`);
        console.log(`${colors.dim}Phrase counter disabled for non-4/4 tracks${colors.reset}`);
        console.log('');
      }
    }
  }

  console.log(`${colors.bright}${colors.spotifyGreen}⚡ Recommendations${colors.reset}`);
  
  if (recommendations.length === 0) {
    console.log(`${colors.dim}No harmonic matches found in library.${colors.reset}`);
    if (debugMessage) {
        console.log(`${colors.red}DEBUG: ${debugMessage}${colors.reset}`);
    }
  } else {
    const grouped = recommendations.reduce((acc, track) => {
      acc[track.shiftType] = acc[track.shiftType] || [];
      acc[track.shiftType].push(track);
      return acc;
    }, {} as Record<ShiftType, MatchedTrack[]>);

    for (const type of Object.values(ShiftType)) {
      const tracks = grouped[type];
      if (tracks && tracks.length > 0) {
        let typeColor = colors.white;
        if (type === ShiftType.SMOOTH) typeColor = colors.spotifyGreen;
        if (type === ShiftType.ENERGY_UP) typeColor = colors.yellow;
        if (type === ShiftType.MOOD_SWITCH) typeColor = colors.magenta;
        if (type === ShiftType.RHYTHMIC_BREAKER) typeColor = colors.red;

        console.log(`${typeColor}• ${type}${colors.reset}`);
        tracks.forEach(track => {
          const hex = getCamelotColor(track.camelot_key);
          const ansiColor = hexToAnsi(hex);
          const coloredKey = `${ansiColor}[${track.camelot_key}]${colors.reset}`;
          console.log(`  ${coloredKey} ${track.track_name} - ${track.artist} (${track.bpm} BPM)`);
        });
      }
    }
  }

  if (logs.length > 0) {
    console.log('');
    const separator = "─".repeat(effectiveWidth);
    console.log(`${colors.dim}${separator}${colors.reset}`);
    console.log(`${colors.bright}${colors.red}DEBUG LOGS:${colors.reset}`);
    logs.forEach(log => console.log(`${colors.dim}${log}${colors.reset}`));
  }

  renderStatusBar(terminalWidth, terminalHeight, showExitWarning);
}

function renderStatusBar(width: number, height: number, showWarning: boolean) {
  const startRow = height - 2; 
  process.stdout.write(`\x1b[${startRow};0f`);
  
  const separator = "───────────────────────────────────────────────────────────────────────";
  console.log(`${colors.dim}${separator}${colors.reset}`);
  
  if (showWarning) {
      const warningMsg = "Press Ctrl-C again to exit";
      console.log(` ${warningMsg} `); 
  } else {
      const username = process.env.USER || os.userInfo().username;
      const hostname = os.hostname().split('.')[0];
      const userHost = `${username}@${hostname}`;
      const cwd = process.cwd().replace(os.homedir(), '~');
      const branch = "<main>"; // Could be read from git if needed
      
      console.log(`${colors.zshGreen}${userHost}${colors.reset}`);
      process.stdout.write(`${colors.zshBlue}${cwd}  ${colors.zshYellow}${branch}${colors.reset}`);
  }
}
