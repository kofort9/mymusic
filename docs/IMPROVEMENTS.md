# Improvements & Roadmap

## 🚀 Future Roadmap

### Phase 1: Data Resilience (High Priority)
*Addressed in Tech Debt, but detailed here.*

1.  **Production-Ready Data Source (Plan B)**
    *   **Goal**: Replace deprecated Spotify `/audio-features` endpoint.
    *   **Solution**: Integrate a dedicated Music Analysis API (e.g., Audioscrobbler, Essentia, or specialized DSP service).
    *   **Status**: `customApiProvider` exists but relies on SongBPM (scraping/unofficial). Need a robust paid/official API.

2.  **Robust Local Database (Plan C)**
    *   **Goal**: Zero-dependency offline mode.
    *   **Solution**: Enhance Prisma/SQLite usage.
        *   Auto-cache every track played.
        *   Allow "offline mode" flag to skip API calls entirely if track is in DB.
        *   Implement fuzzy matching for library tracks.

### Phase 2: Enhanced UX
1.  **Smart Transitions**
    *   **Idea**: Visual cues for "Mix In" and "Mix Out" points based on phrase analysis.
    *   **Implementation**: Use `PhraseCounter` to show a countdown to the next 32-beat phrase boundary (already partially implemented). Add visual markers on the progress bar.

2.  **Dynamic Playlists**
    *   **Idea**: "Auto-Queue" feature.
    *   **Implementation**: Allow user to select a recommendation and press `Enter` to add it to Spotify Queue

3.  **Advanced Filtering**
    *   **Idea**: Filter by Energy Level (1-10) or Danceability.
    *   **Implementation**: Use more audio features from the API/DB. Add new tabs or a filter menu.

### Phase 3: Architecture
1.  **Plugin System**
    *   **Idea**: Allow community providers for audio features or recommendations.
    *   **Implementation**: Define a standard `Provider` interface (done) and dynamic loader.

## ✅ Recently Completed

### Phase 4: Library Enrichment (Nov 2024)
- **🎮 Passive Enrichment ("Pokédex Method")** - Auto-saves audio features to DB during playback
- **API Usage Tracking** - Monthly limits, warnings at 80%, persistent tracking
- **Manual Enrichment Tools** - `npm run enrich:library` for batch processing
- **Startup Validation** - Library status check on app start
- **Runtime Discovery** - Press `f` to fetch features for current track
- **Spotify Deprecation Mitigation** - Full fallback strategy implemented

### TUI Fixes (Nov 2024)
- Fixed display artifacts by dynamically calculating terminal height
- Improved graceful shutdown handling
- Enhanced error messaging and logging

## 🔮 Future Enhancements

### High Priority

**1. Main Loop Refactoring**
- **Current**: `main.ts` is >500 lines handling orchestration, polling, input, and rendering
- **Goal**: Extract to `src/orchestrator.ts`, `src/inputHandler.ts`, `src/renderLoop.ts`
- **Benefit**: Better testability and maintainability

**2. Enhanced Phrase Detection**
- **Current**: 32-beat meter works well for 4/4 time signatures
- **Goal**: Support more time signatures (3/4, 6/8, 5/4), dynamic phrase length detection
- **Benefit**: Better accuracy for non-standard tracks

## 💡 Ideas from Brainstorming (`NEWIDEAS.md`)

- **Responsiveness**: (Completed) UI now adapts to window size.
- **Time Signature**: (Completed) Logic handles non-4/4 tracks by disabling phrase counter.
- **Flip-Clock Animation**: (Completed) Visual polish for track transitions.
