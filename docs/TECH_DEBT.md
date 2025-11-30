# Technical Debt & Known Issues

## Critical

### 1. **Spotify Audio Features API Deprecation** ✅ MITIGATED

**Status**: Resolved via passive enrichment ("Pokédex method")

**Background**: Spotify has deprecated the `/audio-features` endpoint, which provides BPM, key, mode, and other track analysis data crucial for harmonic mixing.

**Current Solution**:
- **Passive Enrichment (Primary)**: App automatically saves audio features to DB whenever a song is played - zero manual work!
- **SongBPM Fallback**: Integration via parse.bot API (`CustomApiProvider`) for tracks without cached features
- **Batch Tools**: `npm run enrich:library` for manual batch processing if needed
- **Runtime Discovery**: Press `f` during playback to fetch features for current track
- **API Usage Tracking**: Monitors SongBPM free tier limits (100 calls/month)

**Implementation**:
- `src/audioProcessor.ts`: `passivelyEnrichDB()` auto-saves features in background
- `src/providers/customApiProvider.ts`: SongBPM integration with rate limiting
- `src/utils/apiUsageTracker.ts`: Monthly usage tracking with 80% warnings
- `src/scripts/enrichLibrary.ts`: Manual batch enrichment tool
- `src/startup/validateLibrary.ts`: Library status check on app start

**Recommendation**: Just play music! 🎮

### 2. Main Loop Complexity
- **Issue**: `src/main.ts` is a large file (400+ lines) that handles orchestration, polling, input handling, and signal trapping.
- **Risk**: Hard to test and maintain. Low unit test coverage (41% branches).
- **Action Item**: Refactor into a `AppController` or `SessionManager` class. Extract polling logic to a dedicated service.

## Moderate

### 3. Display Logic Coupling
- **Issue**: `src/display.ts` handles both rendering orchestration and some layout logic.
- **Status**: Improved with `RecommendationsComponent` refactor, but still mixes concerns (e.g., slicing logic).
- **Action Item**: Move all layout calculations into components. Make `TerminalRenderer` purely a composition layer.

### 4. Library Management
- **Issue**: Library refresh is manual (`npm run refresh:library` or `r` key). Requires exporting CSV from Exportify.
- **Action Item**: Automate the fetch from Spotify "Liked Songs" directly (requires pagination handling).

### 5. Integration Test Flakiness
- **Issue**: `tests/mainIntegration.test.ts` and `tests/display.test.ts` rely on `jest.useFakeTimers` and complex mocks, leading to flakiness when logic changes.
- **Action Item**: Simplify integration tests or move to a more robust E2E testing framework for TUI (if available), or rely more on unit tests (as done with `__tests__/display.test.ts`).

## Minor

- **Logging**: We disabled console transport in development to prevent TUI corruption. We should implement a "debug pane" or separate log file viewer more robustly.
- **Type Safety**: Some `any` casts in tests and legacy code.
- **Magic Numbers**: Layout constants (e.g., border widths, padding) are scattered. Should be centralized in `theme.ts` or a layout config.
