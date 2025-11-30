# Changelog

## v0.1.1 — 2025-11-28
- Bumped to `0.1.1` and refreshed README metadata (release banner, branch roles, tagging flow).
- Added this changelog to surface release history for newcomers.
- Kept release date aligned with the current tag; SemVer tagging guidance now lives in the README.

## v0.1.0-alpha — 2025-11-28
- Initial public MVP release.
- TUI “train board” for live Spotify polling with phrase counter and recommendation tabs.
- Provider chain with Spotify + SongBPM (parse.bot) fallback and local DB cache.
- Health/readiness server on :3000, structured logging, circuit breakers, and rate limiting.
- First-run preflight and setup wizard for DB seed, Exportify CSV, and optional parse.bot key.
