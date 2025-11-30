# 🎧 SpotifyDJ — Real-Time DJ Assistant (MVP)

[![Node version](https://img.shields.io/badge/node-%E2%89%A518-43853d?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-2f74c0?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-0b9e8f?style=for-the-badge)](LICENSE)
[![CLI Ready](https://img.shields.io/badge/TUI-ready-0f8b8d?style=for-the-badge&logo=gnometerminal&logoColor=white)](#run-the-tui)

> Version: v0.1.1 · Release date: 2025-11-28 · Built with Cursor, Codex, and Antigravity.

Terminal-based DJ co-pilot (`spotifydj`) that watches your current Spotify track and surfaces harmonic, BPM-safe transitions in a responsive “train board” UI.

## 📜 Table of Contents

- [Project Status](#-project-status)
- [Highlights](#-highlights)
- [Quick Start](#-quick-start)
- [First-Run Checks](#-first-run-checks)
- [Run the TUI](#-run-the-tui)
- [UI Preview](#-ui-preview)
- [Keyboard & Scripts](#-keyboard--scripts)
- [Architecture at a Glance](#-architecture-at-a-glance)
- [Data & Providers](#-data--providers)
- [Ops & Health](#-ops--health)
- [Troubleshooting](#-troubleshooting)
- [Privacy & Safety](#-privacy--safety)
- [Known Limitations](#-known-limitations)
- [Versioning & Releases](#-versioning--releases)

## 🧾 Project Status

- Current version: `v0.1.1` (package.json)
- Release date: 2025-11-28
- Branches: `main` (stable), `spotify-dj-cli` (development)
- Built with Cursor + Codex + Antigravity

## ✨ Highlights

- Smart Spotify polling with near-track-end detection (1s) and inline debug overlay (`--debug` flag).
- Harmonic engine (Camelot wheel) + BPM guard (±10% for filtered tabs) with shift categories: Smooth, Mood Switch, Energy Up/Down, Rhythmic Breaker.
- **🎮 Pokédex-style library building**: Auto-saves audio features to DB as you play songs - zero manual work required!
- Multi-source audio features: Spotify (deprecated API), SongBPM/parse.bot fallback (`custom` provider), and local Prisma/SQLite cache with provider chaining.
- Train-board TUI with flip-clock transitions, 40–60 char progress bar, 32-beat phrase meter (with non-4/4 guard), category tabs + scroll.
- Aggressive caching + fallback chain in `audioProcessor` to avoid repeat network calls, backed by circuit breakers and rate limiting for external APIs.
- Health/readiness server on `:3000` with structured logging to `combined.log`/`error.log` plus in-memory logs for the TUI overlay.

## 🚀 Quick Start

1) **Prerequisites**  
Node.js 18+, Spotify Premium + Developer App (redirect: `http://127.0.0.1:8888/callback`). Optional: parse.bot API key for SongBPM fallback.

2) **Install & configure**

```bash
git clone https://github.com/kofort9/mymusic.git
cd mymusic
npm install
cp .env.example .env
```

Fill `.env` with Spotify creds, choose providers (`AUDIO_FEATURE_PROVIDER=spotify` or `spotify,custom`), set `CUSTOM_API_KEY` if using SongBPM, and point `DATABASE_URL` to your SQLite file (example: `DATABASE_URL="file:./prisma/dev.db"`).

3) **Seed the library (Prisma/SQLite)**

```bash
npx prisma migrate deploy      # apply schema
npx prisma db seed             # import from Liked_Songs.csv
# shortcut: npm run db:setup   # migrate + seed
```

Keep `spotify:track:` prefixes in your CSV `Track URI` column (matches runtime lookups).

## 🧰 First-Run Checks

- `npm start` runs a preflight (`tools/preflight.js`) that blocks missing DB/schema or Spotify env vars before the TUI spins up.
- An interactive setup wizard helps drop `Liked_Songs.csv`, run the refresh, and optionally store `CUSTOM_API_KEY` for the SongBPM provider.

## 🖥️ Run the TUI

```bash
npm start                # main TUI
npm start -- --debug     # with inline log pane
```

Global CLI install:

```bash
npm run build            # produce dist/main.js
npm link                 # exposes global `spotifydj`
spotifydj --debug
```

If you install globally via `npm install -g .`, the `prepare` hook builds `dist/` so the binary works without `ts-node`.

## 👀 UI Preview

```
╔══════════════════════════════════════════════════════════════╗
║             ᯤ Spotify RT DJ Assistant (MVP)                  ║
╚══════════════════════════════════════════════════════════════╝
Version: v0.1.1

💿  Strings Attached — Keys N Krates ⏺
    BPM: 126.0  •  Camelot: 8A
  ▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱

⏱  Phrase Matching
████████████████████████░░░░░░░░
Beats Rem: 12.0 | Time: 5.7s

╔══════════════════════════════════════════════════════════════╗
║⚡ Recommendations (Current: 126.0 BPM)                       ║
║ ALL   Smooth   Mood Switch   Energy Up   Energy Down         ║
║──────────────────────────────────────────────────────────────║
║▼ Smooth                                                      ║
║  [8A] Losing It - Fisher (125.9 BPM)                         ║
║  [9A] Breathe - CamelPhat (126.5 BPM)                        ║
║                                                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
kofifort@kHQ | w/s: scroll | tab: category | r: refresh | h: help
```

### Keyboard & Scripts

**Controls inside the TUI**

| Key | Action |
| --- | --- |
| `tab` | Cycle recommendation categories |
| `w` / `s` | Scroll results |
| `r` | Refresh library from CSV |
| `h` | Toggle help overlay |
| `Ctrl+C` twice | Exit |

**Script cheatsheet**

| Command | What it does |
| --- | --- |
| `npm start -- --debug` | Run the TUI with inline logs |
| `npm run db:migrate` | Apply Prisma schema |
| `npm run db:seed` | Import `Liked_Songs.csv` into SQLite |
| `npm run db:setup` | Migrate + seed in one go |
| `npm run refresh:library` | Rerun the seed after swapping in a fresh Exportify CSV |
| `npm run enrich:library` | Manually batch-enrich tracks with missing audio features (Pokédex method runs automatically!) |
| `npm test` / `npm run test:coverage` | Jest unit tests + coverage |
| `npm run lint` / `npm run format` | Lint or format the TypeScript codebase |

## 📚 Documentation

- [**Test Coverage**](docs/TEST_COVERAGE.md): Current coverage report and testing strategy.
- [**Technical Debt**](docs/TECH_DEBT.md): Known issues, deprecation risks, and refactoring needs.
- [**Improvements & Roadmap**](docs/IMPROVEMENTS.md): Future plans, feature ideas, and recently completed items.

## 🧭 Architecture at a Glance

```
Spotify OAuth + polling ─┐
                         ├─▶ audioProcessor ▶ cache ▶ mixingEngine ▶ display/animation ▶ train-board TUI
SongBPM / parse.bot ─────┘
           Prisma SQLite ─────────────────────────────────────────────────────────────┘
```

- **Auth & Polling** (`auth.ts`, `spotifyClient.ts`): OAuth, token refresh, and polling cadence that accelerates near track end.
- **Feature Fetch** (`audioProcessor.ts`, providers): provider chain with caching; supports Spotify, SongBPM/parse.bot, and the local DB.
- **Mixing Engine** (`camelot.ts`, `mixingEngine.ts`): Camelot conversion + shift-specific compatible keys and BPM gating.
- **Rendering Loop** (`display.ts`, `animation.ts`): 60fps-ish UI loop, flip-clock transitions, responsive width guards, scrollable recommendations.

## 🎚️ Data & Providers

<<<<<<< HEAD
- **🎮 Pokédex Method (Automatic)**: Just play music! The app auto-saves audio features to DB as you listen.
- **Batch Enrichment (Optional)**: Run `npm run enrich:library` to batch-process tracks with missing features using the SongBPM API.
- **Manual Library Refresh**: Export from Exportify, replace `Liked_Songs.csv`, then run `npm run refresh:library`.
- **SongBPM Fallback**: Set `AUDIO_FEATURE_PROVIDER=spotify,custom` and add `CUSTOM_API_KEY` to `.env` for SongBPM integration (~100 calls/month on free tier).
- The Prisma DB lives at `prisma/dev.db` by default; keep it out of commits.
- Parse.bot SongBPM implementation details: see `PARSEBOT.md`.
=======
- The bundled seed uses an Exportify CSV. To refresh after adding songs, re-export from Exportify, replace `Liked_Songs.csv`, then run `npx prisma db seed` (or `npm run refresh:library`).
- For on-demand enrichment of new songs, enable the parse.bot SongBPM provider (`AUDIO_FEATURE_PROVIDER=spotify,custom`). The free tier allows ~100 calls/month, so keep the DB cache populated to avoid hitting the limit.
- Provider chain supports `database` as well; order is controlled by `AUDIO_FEATURE_PROVIDER` (e.g., `database,spotify,custom`).
- The Prisma DB lives at `prisma/dev.db` by default; keep it out of commits.
- Parse.bot SongBPM integration is implemented; `PARSEBOT.md` documents the scraper endpoints and expected responses.

## 🩺 Ops & Health

- `npm start` also boots a lightweight Express server on `PORT` (default `3000`) exposing `/health` and `/ready` for monitoring.
- Logs land in `combined.log` and `error.log`; the TUI debug pane shows the in-memory tail for quick inspection.
>>>>>>> origin/main

## 🧰 Tech Stack

TypeScript + Node.js, Spotify Web API, Prisma/SQLite, chalk/ANSI TUI.

## ⚠️ Spotify Audio Features Deprecation - MITIGATED ✅

Spotify's `/audio-features` endpoint is deprecated. **Solution**: The app uses "passive enrichment" - it automatically saves audio features to your local DB as you play music. Like a Pokédex!

Additional options:
- Set `AUDIO_FEATURE_PROVIDER=spotify,custom` to enable SongBPM fallback
- Run `npm run enrich:library` for batch processing
- Press `f` during playback to fetch features for current track

## 🧰 Troubleshooting

- **Beat counter drift after long pauses**: reload recommendations (`r`) or restart the app; timestamp-based phrases can drift after extended pauses.
- **Narrow terminals**: the UI needs ≥80 columns; below that, you’ll see a warning and a minimal view.
- **Fresh auth**: if you rotate Spotify client secrets, remove `tokens.json` to force a clean OAuth run.

## 🔐 Privacy & Safety

- Redirect URI: keep `http://127.0.0.1:8888/callback` for local auth; others can reuse it but cannot authorize without your app’s client ID/secret.
- Keep secrets private: never commit `.env`, `tokens.json`, or your database. `.env`, tokens, and `prisma/*.db` are ignored; store the DB locally or privately.
- If you switch secrets, update `.env` and delete old `tokens.json` so a new OAuth flow runs.

## Versioning & Releases

- Branches: `main` is stable; `spotify-dj-cli` is the development branch. Cut releases from `main`.
- Tag releases with SemVer (`v0.1.1`, `v0.2.0`, etc.) and push annotated tags that match `package.json` (e.g., `git tag -a v0.1.1 -m "v0.1.1" && git push origin v0.1.1`).
- Release flow (example):

```bash
git checkout main && git pull
npm version patch --no-git-tag-version   # or minor/major
git commit -am "chore: release v0.1.1"
git tag -a v0.1.1 -m "v0.1.1"
git push origin main --tags
```

- Track changes in `CHANGELOG.md` with dated entries, and keep the “Release date” field at the top in sync with the latest tagged release.

## Known Limitations

- Phrase counter was timestamp-based; paused playback now freezes the beat counter, but values may drift slightly on long pauses.
- Spotify audio-features endpoint is deprecated; if it fails, use the DB cache or SongBPM fallback.
- UI requires ≥80 columns; it shows a warning and minimal output if the terminal is too narrow.

---

**Made with ❤️ for DJs — built with Cursor, Codex, and Antigravity**
