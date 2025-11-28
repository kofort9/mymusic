# 🎧 Real-Time DJ Assistant (MVP)

A terminal-based DJ assistant that analyzes your Spotify playback in real-time to recommend harmonious transitions using **Camelot Wheel** logic and **BPM matching**.

## ✨ Key Features

- **🎵 Live Analysis**: Monitors Spotify playback via smart polling.
- **🎹 Harmonic Mixing**: Suggests keys for Smooth, Mood Switch, and Energy shifts.
- **⚡ BPM Matching**: Filters library tracks within ±10% tempo range.
- **🖥️ Stable TUI**: Flicker-free, responsive terminal interface with "Train Board" aesthetic.
- **🎬 Flip-Clock Animation**: Split-flap style transition effects.
- **🔌 Extensible Architecture**: Ready for custom audio analysis providers (Plan B).

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+
- **Spotify Premium** (for playback state)
- **Spotify Developer App** ([Dashboard](https://developer.spotify.com/dashboard))

### 2. Installation
```bash
git clone https://github.com/kofifort/mymusic-dj-assistant.git
cd mymusic-dj-assistant
npm install
```

### 3. Configuration
1. Create a Spotify App with Redirect URI: `http://127.0.0.1:8888/callback`
2. Set up environment:
   ```bash
   cp .env.example .env
   ```
3. Add credentials to `.env`:
   ```env
   SPOTIFY_CLIENT_ID=your_id
   SPOTIFY_CLIENT_SECRET=your_secret
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
   ```
4. Add tracks to `library.json` (see `src/types.ts` for format).

### 4. Run
```bash
npm start
# Press Ctrl+C twice to exit
```

## 🏗️ Architecture

The application follows a modular, loop-driven architecture designed for stability and extensibility.

### High-Level Data Flow
1.  **Smart Polling Loop**: `main.ts` polls the Spotify API. It adapts polling frequency based on track status (slow when paused, fast when track is ending).
2.  **Metadata Processing**: When a new track is detected, `audioProcessor.ts` fetches BPM/Key data via the abstracted `MusicMetadataProvider`.
3.  **Mixing Engine**: `mixingEngine.ts` calculates harmonious keys (Camelot Wheel) and filters the local library for matches.
4.  **TUI Rendering Loop**: A separate high-frequency loop (~60fps) in `display.ts` handles animations (progress bars, flip-clock text) and renders the UI frame using atomic writes.

### File Structure

```
src/
├── main.ts              # Application entry point & polling loops
├── display.ts           # TUI Rendering Protocol (Atomic writes, Animations)
├── audioProcessor.ts    # Metadata fetching (implements Provider pattern)
├── mixingEngine.ts      # Harmonic mixing & BPM filtering logic
├── spotifyClient.ts     # Spotify playback polling
├── camelot.ts           # Key notation conversion utilities
├── camelotColors.ts     # UI color mapping for keys
├── library.ts           # Local JSON library management
├── auth.ts              # OAuth authentication flow
└── types.ts             # Shared interfaces & type definitions
```

## 🛠️ Tech Stack
- **TypeScript** & **Node.js**
- **Spotify Web API** (Auth & Polling)
- **TUI Rendering Protocol**: Atomic writes, Alternate Screen Buffer, Zero-Flicker.

## ⚠️ Note on Spotify API
The `/audio-features` endpoint is deprecated. This app uses an `AudioFeatureProvider` abstraction to allow easy switching to alternative APIs.

### Provider Architecture

The app supports multiple audio analysis providers:
- **Spotify** (deprecated but still works) - Default provider
- **Custom API** - Placeholder for your own audio analysis API

To implement your custom API:
1. Edit `src/providers/customApiProvider.ts`
2. Add your API endpoint and authentication
3. Map the response to the `AudioFeatures` format
4. Update `.env`: `AUDIO_FEATURE_PROVIDER=custom`

---
**Made with ❤️ for DJs**
