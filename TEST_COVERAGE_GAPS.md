# Test Coverage Gaps Analysis

## Summary

**Current coverage: 84.7% statements, 74.87% branches, 83.78% functions, 84.79% lines**

**Test Status:** 213 passing, 17 test suites passing

✅ **Branch coverage at 74.87% (above 70% threshold!)** - significant improvement!

### Coverage by Module

- **src/**: 82.47% statements, 71.47% branches, 79.77% functions, 82.5% lines
- **src/providers/**: 95.4% statements, 90.27% branches, 100% functions, 95.32% lines

### Individual File Coverage

- `camelot.ts`: 100% statements, 100% branches ✅
- `spotifyClient.ts`: 100% statements, 100% branches ✅
- `database.ts`: 100% statements, 100% branches ✅ (improved from 52.94%!)
- `factory.ts`: 100% statements, 92.85% branches ✅
- `camelotColors.ts`: 100% statements, 88.88% branches
- `mixingEngine.ts`: 97.91% statements, 86.95% branches
- `display.ts`: 93.77% statements, 87.5% branches (improved from 85.71%!)
- `customApiProvider.ts`: 96.1% statements, 93.33% branches
- `logger.ts`: 95.45% statements, 87.5% branches
- `animation.ts`: 91.22% statements, 87.5% branches (improved from 70.83%!)
- `library.ts`: 88.88% statements, 100% branches ✅
- `auth.ts`: 82.14% statements, 78.57% branches
- `audioProcessor.ts`: 86.2% statements, 58.82% branches ⚠️
- `spotifyProvider.ts`: 87.5% statements, 63.63% branches
- `main.ts`: 63.07% statements, 36.92% branches ⚠️
- `refreshLibrary.ts`: 16.66% statements, 0% branches ⚠️ (very low coverage)

### Recently Completed Tests

- ✅ `tests/spotifyProvider.test.ts` (sanitization, availability, API error handling)
- ✅ `tests/factory.test.ts` (provider creation, caching, default selection, availability filtering)
- ✅ `tests/databaseProvider.test.ts` (availability, feature fetch, error/null handling, connection failures, error scenarios) - **100% coverage!**
- ✅ `tests/animation.test.ts` (runFlipClockAnimation timing/call counts) - **97.95% coverage**
- ✅ `tests/display.test.ts` (paused phrase counter, exit warning, filtering/scroll, non-4/4 warning, wide terminals, progress timing, scroll boundaries, phrase scanline animation/freeze) - **93.77% coverage**
- ✅ `tests/audioProcessor.test.ts` (provider fallback, all-fail path, per-track cache)
- ✅ `tests/auth.test.ts` (missing env creds, OAuth callback error/missing code, saveTokens write-failure) - **82.14% coverage**
- ✅ `tests/mainIntegration.test.ts` (main loop smoke with mocked auth/polling, terminal width guard)
- ✅ `tests/integrationSmoke.test.ts` (mixing engine + display render)

## Remaining Targets (to improve branch coverage further)

### High Priority (to improve overall branch coverage)

1. **`audioProcessor.ts`** (58.82% branches) - Add tests for uncovered lines: 28, 34-36, 83-86
   - Cache invalidation scenarios
   - Concurrent request handling
   - Edge cases in provider chain

2. ~~**`database.ts`** (52.94% branches)~~ ✅ **COMPLETED** - Now at 100% branch coverage!

3. **`spotifyProvider.ts`** (63.63% branches) - Add tests for uncovered lines: 51-52, 76-79
   - Additional error scenarios
   - Edge cases in API responses

### Medium Priority (nice-to-have)

4. **`main.ts`** (28.57% branches) - Very low coverage, but integration tests cover main paths
   - Optional: deeper scenarios with track changes and animations
   - Error handling paths

5. **`auth.ts`** (78.57% branches) - Good coverage, minor gaps: lines 43-44, 121-143
   - OAuth flow edge cases
   - Additional error scenarios

6. **`refreshLibrary.ts`** (0% branches, 16.66% statements) - Very low coverage
   - This is a utility script, lower priority

---

## Coverage Gaps by File

### Files Needing Branch Coverage Improvement

- **`audioProcessor.ts`** (58.82% branches): Lines 28, 34-36, 83-86
- ~~**`database.ts`** (52.94% branches)~~ ✅ **100% coverage achieved!**
- **`spotifyProvider.ts`** (63.63% branches): Lines 51-52, 76-79
- **`main.ts`** (28.57% branches): Many uncovered lines (integration tests cover main paths)
- **`refreshLibrary.ts`** (0% branches): Lines 16-55, 66-75 (utility script, lower priority)

### Files with Minor Gaps

- **`auth.ts`** (78.57% branches): Lines 43-44, 121-143
- **`display.ts`** (85.71% branches): Lines 65, 167, 176, 326
- **`animation.ts`** (94.44% branches): Line 72
- **`camelotColors.ts`** (88.88% branches): Line 57
- **`mixingEngine.ts`** (86.95% branches): Line 93

## Notes

- Use `jest.useFakeTimers()` for animation timing and UI loop tests.
- Mock `spotifyApi` from `auth.ts` and Prisma from `@prisma/client` when isolating providers.
- Run `npm test -- --coverage` to update coverage stats when needed.

## Recent Improvements

✅ **Branch coverage significantly improved!** (74.87% > 70%)

- Improved from 70.19% to 74.87% branch coverage (+4.68%)
- Improved from 84.61% to 84.7% statement coverage
- Added 12 new tests (213 total, up from 201)
- `database.ts`: **100% branch coverage** (improved from 52.94%!) 🎉
- `display.ts`: 87.5% branch coverage (improved from 85.71%)
- `animation.ts`: 87.5% branch coverage (improved from 70.83%)
- Added comprehensive database error handling tests (connection failures, timeouts, locked DB, etc.)
- Added phrase scanline animation/freeze tests

## Next Steps to Improve Branch Coverage Further

1. Focus on `audioProcessor.ts` (58.82% branches) - add tests for cache edge cases and concurrent requests
2. ~~Improve `database.ts`~~ ✅ **COMPLETED** - Now at 100% branch coverage!
3. Enhance `spotifyProvider.ts` (63.63% branches) - add tests for additional error scenarios
4. Continue improving `main.ts` (36.92% branches) - deeper integration test scenarios
