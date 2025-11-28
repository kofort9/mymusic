# 🎧 Real-Time DJ Assistant (MVP)

Terminal-based DJ co-pilot that watches your current Spotify track and surfaces harmonic, BPM-safe transitions in a responsive “train board” UI.

## ✨ Current Features

- Smart Spotify polling with fast transition detection (1s near track end) and debug overlay (`--debug` flag).
- Harmonic engine (Camelot wheel) + BPM filter (±10% for filtered tabs) with Shift categories: Smooth, Mood Switch, Energy Up/Down, Rhythmic Breaker.
- Multi-provider audio features: Spotify (deprecated API), SongBPM/parse.bot fallback (`custom` provider), and local Prisma/SQLite cache.
- Train-board TUI: flip-clock track changes, 40–60 char progress bar, 32-beat phrase meter (guards for non-4/4), category tabs + scroll.
- Caching + fallback chain in `audioProcessor` to avoid repeat network calls.

## 🚀 Quick Start

### 1) Prerequisites

- Node.js 18+
- Spotify Premium + Developer App (redirect: `http://127.0.0.1:8888/callback`)
- Optional: parse.bot API key for SongBPM fallback

### 2) Install & Configure

```bash
git clone https://github.com/kofifort/mymusic-dj-assistant.git
cd mymusic-dj-assistant
npm install
cp .env.example .env
```

Fill `.env` with Spotify creds, choose providers (`AUDIO_FEATURE_PROVIDER=spotify` or `spotify,custom`), set `CUSTOM_API_KEY` if using SongBPM, and set your database URL (ex: `DATABASE_URL="file:./prisma/dev.db"`).

### 3) Seed the library (Prisma/SQLite)

Tracks are stored in SQLite via Prisma (see `prisma/dev.db`):

```bash
npx prisma migrate deploy      # apply schema
npx prisma db seed             # imports from Liked_Songs.csv
# shortcut: npm run db:setup   # migrate + seed
```

Ensure your CSV `Track URI` values keep the `spotify:track:` prefix (matches runtime lookups).

### 4) Run the TUI

```bash
npm start          # main TUI
npm start -- --debug   # with inline log pane
```

Controls: `tab` cycle categories, `w/s` scroll recommendations, `r` refresh library from CSV, `h` help overlay, double `Ctrl+C` to exit.

### Global CLI usage

```bash
npm install       # install deps
npm run build     # produce dist/main.js
npm link          # exposes global `spotifydj`
spotifydj --debug
```

If you install globally via `npm install -g .`, the `prepare` hook builds `dist/` so the binary works without `ts-node`.

### Library data (Exportify) and refresh

- The bundled seed uses a CSV exported via Exportify. To refresh after adding songs, re-export from Exportify, replace `Liked_Songs.csv`, then run `npx prisma db seed` again.
- If you prefer on-demand enrichment for new songs, enable the parse.bot SongBPM provider (`AUDIO_FEATURE_PROVIDER=spotify,custom`). The free tier allows ~100 calls/month, so keep the DB cache populated to avoid hitting the limit.
- Shortcut: `npm run refresh:library` (or press `r` inside the TUI) to rerun the seed after dropping in a new Exportify CSV.

## 👀 UI Preview (sample data)

```
╔══════════════════════════════════════════════════════════════╗
║             ᯤ Spotify RT DJ Assistant (MVP)                  ║
╚══════════════════════════════════════════════════════════════╝
Version: v0.1.0-alpha

💿  Strings Attached — Keys N Krates ⏺
    BPM: 126.0  •  Camelot: 8A
  ▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱

⏱  Phrase Matching
████████████████████████░░░░░░░░
Beats Rem: 12.0 | Time: 5.7s

⚡ Recommendations (Current: 126.0 BPM)
 [ALL]  Smooth  Mood Switch  Energy Up  Energy Down  Rhythmic/Dead-End Breaker
  ▼ Smooth
    [8A] Losing It - Fisher (125.9 BPM)  -0.1%
    [9A] Breathe - CamelPhat (126.5 BPM) +0.4%
  ▼ Mood Switch
    [8B] Cola - CamelPhat (124.0 BPM)   -1.6%
  ▼ Energy Up
    [10A] Rave - Duke Dumont (127.9 BPM) +1.5%
```

## 🏗️ How It Works

1. **Auth & Polling** (`auth.ts`, `spotifyClient.ts`): OAuth, token refresh, smart polling cadence based on remaining track time.
2. **Feature Fetch** (`audioProcessor.ts`, providers): provider chain with caching; supports Spotify, SongBPM/parse.bot, and local DB.
3. **Mixing Engine** (`camelot.ts`, `mixingEngine.ts`): Camelot conversion + shift-specific compatible keys and BPM gating.
4. **Rendering Loop** (`display.ts`, `animation.ts`): 60fps-ish UI loop, flip-clock transitions, responsive width guards, scrollable recommendations.

## 🛠️ Tech Stack

TypeScript + Node.js, Spotify Web API, Prisma/SQLite, chalk/ANSI TUI.

## ⚠️ Spotify Audio Features Deprecation

Spotify’s `/audio-features` endpoint is deprecated. Set `AUDIO_FEATURE_PROVIDER=spotify,custom` to fall back to SongBPM (parse.bot) or extend `src/providers/customApiProvider.ts` for your own source.

## Accounts, Redirect URI, and Privacy

- Redirect URI: keep it at `http://127.0.0.1:8888/callback` for local auth; others can reuse that URI but cannot authorize without your app’s client ID/secret.
- Keep secrets private: never commit `.env`, `tokens.json`, or your database. The repo ignores `.env`, tokens, and `prisma/*.db`; store the DB locally or in a private location.
- If you rotate client secrets, update `.env` and remove old `tokens.json` so a fresh OAuth run occurs.

## Known Limitations

- Phrase counter was timestamp-based; paused playback now freezes the beat counter, but values may drift slightly on long pauses.
- Spotify audio-features endpoint is deprecated; if it fails, use the DB cache or SongBPM fallback.
- UI requires ≥80 columns; it shows a warning and minimal output if the terminal is too narrow.

---

**Made with ❤️ for DJs**
