# Test Coverage

**Last Updated**: November 29, 2024  
**Test Suite**: 27 suites, 287 tests (2 failing in customApiProvider due to passive enrichment mocking)

## Summary

| Metric | Coverage |
|--------|----------|
| **Overall Statements** | 82.72% |
| **Branches** | 69.86% |
| **Functions** | 84.42% |
| **Lines** | 82.98% |

## Detailed Coverage

### Core Application (`src/`)

| File | Stmts | Branch | Funcs | Lines | Notes |
|------|-------|--------|-------|-------|-------|
| `audioProcessor.ts` | 89.61% | 32.75% | 88.88% | 88.88% | ⭐ **New**: Passive enrichment (lines 154-205 not covered - background DB ops) |
| `main.ts` | 61.48% | 37.83% | 47.61% | 63.09% | Integration code, tested via E2E |
| `display.ts` | 78.99% | 75.6% | 62.5% | 80.35% | TUI rendering logic |
| `spotifyClient.ts` | 100% | 100% | 100% | 100% | ✅ Full coverage |
| `auth.ts` | 100% | 85.71% | 100% | 100% | ✅ OAuth flow |
| `camelot.ts` | 100% | 100% | 100% | 100% | ✅ Theory logic |
| `mixingEngine.ts` | 100% | 100% | 100% | 100% | ✅ Harmonic matching |
| `setupWizard.ts` | 98.55% | 90.32% | 100% | 98.5% | ✅ First-run wizard |

### Components (`src/components/`)

| File | Coverage | Notes |
|------|----------|-------|
| All components | 96.36% statements | ✅ High coverage across all UI components |

### Providers (`src/providers/`)

| File | Stmts | Notes |
|------|-------|-------|
| `spotifyProvider.ts` | 100% | ✅ Full coverage |
| `database.ts` | 100% | ✅ Full coverage |
| `factory.ts` | 100% | ✅ Provider chain |
| `customApiProvider.ts` | 66.66% | ⚠️ Lower due to parse.bot integration complexity |

### Phase 4 - Library Enrichment (`src/scripts/`, `src/startup/`, `src/utils/`)

| File | Stmts | Priority | Notes |
|------|-------|----------|-------|
| `apiUsageTracker.ts` | 100% | ✅ HIGH | Comprehensive test suite (19 tests) |
| `enrichLibrary.ts` | 11.62% | ⚠️ LOW | Manual tool, lower priority (passive enrichment is primary) |
| `validateLibrary.ts` | 66.66% | ⚠️ LOW | Startup check, lower priority (passive enrichment is primary) |

## Testing Strategy

### High-Priority (>80% coverage)
- ✅ Core audio processing (`audioProcessor.ts`)
- ✅ Harmonic mixing logic (`camelot.ts`, `mixingEngine.ts`)
- ✅ API providers (`spotifyProvider.ts`, `database.ts`)
- ✅ UI components (all >93%)
- ✅ **API usage tracking** (`apiUsageTracker.ts`)

### Medium-Priority (>60% coverage)
- Main orchestration (`main.ts`) - integration tested
- TUI rendering (`display.ts`) - visual validation
- Custom provider (`customApiProvider.ts`) - complex mocking

### Low-Priority (<20% coverage)
- Manual enrichment tools (`enrichLibrary.ts`, `validateLibrary.ts`)
  - **Rationale**: Passive enrichment is primary strategy; manual tools are fallback

## Phase 4 Notes

**Passive Enrichment**: The app now automatically saves audio features to the DB when songs are played (`audioProcessor.ts`). This "Pokédex method" is the primary library-building strategy, making manual enrichment tools secondary. loop has complex error handling and signal trapping that is hard to unit test. Strategy: Rely on `tests/mainIntegration.test.ts` for smoke testing.
2.  **`display.ts`**: Some layout edge cases (e.g., specific terminal sizes) are tricky to mock perfectly. Strategy: `__tests__/display.test.ts` covers the critical logic (padding, continuous box).
3.  **`refreshLibrary.ts`**: CLI script. Strategy: Low priority, but could add more integration tests.
