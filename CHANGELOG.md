# Changelog

## v0.1.3 — 2025-11-30

### Added
- **Test Coverage**: 25 new tests for liked songs filtering functionality
  - 12 unit tests for `checkIfTrackIsLiked()` function
  - 13 integration tests for passive enrichment filtering
- Total test count increased from 287 to 312 tests (29 test suites)

### Fixed
- **Bug Fix**: `checkIfTrackIsLiked()` now includes type guard for API responses
  - Prevents malformed responses from returning unexpected values
  - Logs warning when Spotify API returns non-array response

### Changed
- Improved error handling and edge case coverage in passive enrichment

### Technical Details
- New test files:
  - `tests/spotifyClient.likedCheck.test.ts` - Unit tests for liked songs check
  - `tests/passiveEnrichment.test.ts` - Integration tests for passive enrichment
- Added `Array.isArray()` type guard in `checkIfTrackIsLiked()`

## v0.1.2 — 2025-11-30

### Fixed
- **Passive Enrichment**: Now only saves liked songs to database (prevents DB bloat from random tracks)
- **README**: Resolved merge conflict in "Data & Providers" section

### Changed
- Added `user-library-read` OAuth scope for liked songs verification
- Users will need to re-authenticate on first run after upgrade (OAuth scope change)

### Technical Details
- New `checkIfTrackIsLiked()` function in `spotifyClient.ts`
- Updated `passivelyEnrichDB()` to filter non-liked tracks before database writes
- Error handling defaults to "not liked" for safety (prevents unnecessary enrichment)

### Migration Notes
- Previously saved non-liked songs will remain in DB but won't receive new passive enrichments
- After update, delete `tokens.json` if re-authentication doesn't auto-trigger

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
