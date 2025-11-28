# Improvement Notes

## Recently Addressed

- Added start-time preflight + `db:migrate`/`db:seed`/`db:setup` scripts to block missing schema/seed before `npm start`.
- Added TUI help overlay (`h`) documenting controls and scanline behavior.
- Centralized Prisma client with shared disconnect + process exit hook to avoid multiple long-lived instances.
- Normalized track IDs in tests to use `spotify:track:` URIs to mirror runtime contracts.
- Legacy scripts updated to reuse shared Prisma client to prevent handle leaks.
- **Productionization**: Implemented structured logging (Winston), global error handling, and health check endpoints.
- **Resilience**: Added Circuit Breakers for Spotify and SongBPM APIs.
- **Stability**: Implemented Rate Limiting (Token Bucket) for API providers.
- **Data Quality**: Added Zod schema validation for audio features.
- **CI/CD**: Added GitHub Actions workflow for automated build and linting.

## Bugs

- (none currently open)

## UX / Interaction Gaps

- (none flagged)

## Technical Debt

- Library refresh automation is partial: there is now a `refresh:library` script and `r` hotkey to reseed from `Liked_Songs.csv`, but Exportify pull and SongBPM backfill remain manual.
- Coverage debt: `audioProcessor.ts`, `spotifyProvider.ts`, `main.ts`, and `refreshLibrary.ts` remain low on branch coverage; add tests for provider chain edge cases, Spotify error paths, main-loop error handling, and refresh CLI failures.

## Code Quality & Best Practices

### Low Priority

- **Code organization**: Consider extracting large functions (>50 lines) into smaller, testable units:
  - `main.ts:triggerLibraryRefresh` (60+ lines)
  - `main.ts:pollLoop` (could benefit from extraction of recommendation logic)
- **Documentation**: Add JSDoc comments to public API functions in core modules
- **Type safety improvements**: Future consideration
  - Review all casts to `as Error` for potential type guards
  - Add stricter type definitions for API responses
