# Improvement Notes

## Recently Addressed

- Added start-time preflight + `db:migrate`/`db:seed`/`db:setup` scripts to block missing schema/seed before `npm start`.
- Added TUI help overlay (`h`) documenting controls and scanline behavior.
- Centralized Prisma client with shared disconnect + process exit hook to avoid multiple long-lived instances.
- Normalized track IDs in tests to use `spotify:track:` URIs to mirror runtime contracts.
- Legacy scripts updated to reuse shared Prisma client to prevent handle leaks.

## Bugs

- (none currently open)

## UX / Interaction Gaps

- (none flagged)

## Technical Debt

- Library refresh automation is partial: there is now a `refresh:library` script and `r` hotkey to reseed from `Liked_Songs.csv`, but Exportify pull and SongBPM backfill remain manual.
- Coverage debt: `audioProcessor.ts`, `spotifyProvider.ts`, `main.ts`, and `refreshLibrary.ts` remain low on branch coverage; add tests for provider chain edge cases, Spotify error paths, main-loop error handling, and refresh CLI failures.
- Add a first-run setup wizard: detect empty/no-library state, prompt to export liked songs via Exportify, drop `Liked_Songs.csv`, and optionally collect parse.bot API key to enable SongBPM fallback.
