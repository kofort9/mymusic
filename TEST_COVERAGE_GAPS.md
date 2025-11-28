# Test Coverage Gaps Analysis

## Summary
Current coverage: **76.36% statements, 61.41% branches** (below 70% threshold for branches)

Recently added tests:
- `tests/spotifyProvider.test.ts` (sanitization, availability, API error handling)
- `tests/factory.test.ts` (provider creation, caching, default selection, availability filtering)
- `tests/databaseProvider.test.ts` (availability, feature fetch, error/null handling)

## Remaining High Priority Targets

### 1. `tests/animation.test.ts` - Add `runFlipClockAnimation` coverage
**File:** `src/animation.ts`

Add cases for onFrame call count, timing with fake timers, final frame containing full text, empty/long strings.

---

### 2. `tests/display.test.ts` - Edge cases
**File:** `src/display.ts`

Cover non-4/4 warning path, scroll bounds, very narrow/wide terminal widths, category filtering, phraseInfo beatsRemaining=0, status bar warning, and paused phrase counter.

---

### 3. `tests/audioProcessor.test.ts` - Provider chain + cache
**File:** `src/audioProcessor.ts`

Cover fallback chain (primary fails, secondary succeeds), all providers fail, cache hits, and concurrent calls for same track.

---

## Medium Priority - Additional Tests for Existing Files

### 4. `tests/animation.test.ts` - Additional Tests (70.37% coverage)
**File:** `src/animation.ts`

**Missing Tests:**
- ✅ `runFlipClockAnimation()` - calls onFrame for each frame
- ✅ `runFlipClockAnimation()` - calls onFrame ANIMATION_FRAMES + 1 times
- ✅ `runFlipClockAnimation()` - waits FRAME_DURATION_MS between frames
- ✅ `runFlipClockAnimation()` - final frame has complete text
- ✅ `runFlipClockAnimation()` - handles empty strings
- ✅ `runFlipClockAnimation()` - handles very long strings

**Test Structure:**
```typescript
describe('runFlipClockAnimation', () => {
  jest.useFakeTimers();
  
  test('calls onFrame correct number of times', async () => {
    const onFrame = jest.fn();
    const promise = runFlipClockAnimation('Track', 'Artist', onFrame);
    // Fast-forward timers
    await promise;
    expect(onFrame).toHaveBeenCalledTimes(9); // 0-8 frames
  });
  
  test('waits correct duration between frames', async () => {
    // Test timing
  });
  
  test('final frame has complete text', async () => {
    // Verify last call has final text
  });
});
```

---

### 5. `tests/auth.test.ts` - Additional Tests (67.08% coverage)
**File:** `src/auth.ts`

**Missing Tests:**
- ✅ `saveTokens()` - writes tokens to file correctly
- ✅ `saveTokens()` - handles file write errors
- ✅ `performOAuthFlow()` - handles callback with code
- ✅ `performOAuthFlow()` - handles callback with error
- ✅ `performOAuthFlow()` - handles missing code/error
- ✅ `performOAuthFlow()` - server listens on correct port
- ✅ `performOAuthFlow()` - creates correct auth URL
- ✅ `authenticate()` - handles missing credentials in env
- ✅ `authenticate()` - handles token refresh failure scenarios

**Note:** Some OAuth flow tests may require mocking HTTP server behavior.

---

### 6. `tests/display.test.ts` - Additional Edge Cases (87.64% coverage)
**File:** `src/display.ts`

**Missing Tests:**
- ✅ `renderTrainBoard()` - handles non-4/4 time signature warning
- ✅ `renderTrainBoard()` - scrollOffset boundary conditions
- ✅ `renderTrainBoard()` - very narrow terminal (< 62 chars)
- ✅ `renderTrainBoard()` - very wide terminal (> 120 chars)
- ✅ `renderTrainBoard()` - selectedCategory filtering works correctly
- ✅ `renderTrainBoard()` - scrollOffset with many recommendations
- ✅ `renderTrainBoard()` - phraseInfo with beatsRemaining = 0 (non-4/4)
- ✅ `renderStatusBar()` - showExitWarning = true
- ✅ `renderStatusBar()` - showExitWarning = false
- ✅ `PhraseCounter.calculate()` - with timeSignature parameter (non-4/4)

**Lines to cover:** 59, 169-172, 200, 211, 235, 246-249, 270-271, 273, 296-297

---

### 7. `tests/audioProcessor.test.ts` - Additional Edge Cases (86.2% coverage)
**File:** `src/audioProcessor.ts`

**Missing Tests:**
- ✅ Provider chain fallback behavior (first fails, second succeeds)
- ✅ All providers fail scenario
- ✅ Cache key generation with different track IDs
- ✅ Cache invalidation scenarios
- ✅ Multiple concurrent requests for same track

**Lines to cover:** 28, 34-36, 83-86

---

## Low Priority - Integration & Edge Cases

### 8. Integration Tests
**Missing:**
- ✅ Full flow: `pollCurrentlyPlaying()` → `getAudioFeatures()` → `renderTrainBoard()`
- ✅ Provider chain: database → spotify → custom fallback
- ✅ Library loading with empty database
- ✅ Library loading with large dataset

### 9. Error Recovery Tests
**Missing:**
- ✅ Network failures during provider chain
- ✅ Database connection loss during operation
- ✅ Invalid data in database (null values, wrong types)
- ✅ Malformed Spotify API responses

### 10. Performance & Edge Cases
**Missing:**
- ✅ Very long track names (> 200 chars)
- ✅ Very long artist names
- ✅ Unicode/special characters in track/artist names
- ✅ Extreme BPM values (0, negative, very high > 200)
- ✅ Missing audio features in various combinations

---

## Test Implementation Priority

### Phase 1 (Critical - Get to 70% branch coverage)
1. `database.test.ts` - Complete coverage
2. `factory.test.ts` - Complete coverage  
3. `spotifyProvider.test.ts` - Complete coverage

### Phase 2 (Improve overall coverage)
4. `animation.test.ts` - Add `runFlipClockAnimation` tests
5. `display.test.ts` - Add edge case tests
6. `audioProcessor.test.ts` - Add provider chain tests

### Phase 3 (Polish & Integration)
7. `auth.test.ts` - Add missing OAuth flow tests
8. Integration tests
9. Error recovery tests

---

## Estimated Impact

**After Phase 1:**
- Branch coverage: ~70%+ (meets threshold)
- Statement coverage: ~85%+
- New tests: ~40-50 tests

**After Phase 2:**
- Branch coverage: ~75%+
- Statement coverage: ~90%+
- New tests: ~60-70 tests total

**After Phase 3:**
- Branch coverage: ~80%+
- Statement coverage: ~95%+
- New tests: ~80-100 tests total

---

## Notes

- Mock PrismaClient for database tests (use `@prisma/client` mocking)
- Mock `spotifyApi` from `auth.ts` for provider tests
- Use `jest.useFakeTimers()` for animation timing tests
- Consider using test databases for integration tests
- Some OAuth flow tests may require HTTP server mocking
