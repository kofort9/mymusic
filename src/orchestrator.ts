import { AppState } from './types/appState';
import { LibraryTrack, CurrentTrack, ShiftType } from './types';
import { pollCurrentlyPlaying } from './spotifyClient';
import { getAudioFeatures } from './audioProcessor';
import { convertToCamelot } from './camelot';
import { loadLibrary } from './library';
import { getCompatibleKeys, filterMatches } from './mixingEngine';
import { refreshLibrary } from './refreshLibrary';
import { enrichLibrary } from './scripts/enrichLibrary';
import { POLLING } from './constants';
import { logger } from './utils/logger';
import { disconnectPrisma } from './dbClient';

export class Orchestrator {
    private state: AppState;
    private pollTimeout: NodeJS.Timeout | null = null;

    constructor(initialLibrary: LibraryTrack[]) {
        this.state = {
            currentTrack: null,
            recommendations: [],
            library: initialLibrary,
            lastTrackId: null,
            selectedCategory: 'ALL',
            scrollOffset: 0,
            showHelp: false,
            showExitWarning: false,
            debugMessage: undefined,
            isRefreshingLibrary: false,
            isShuttingDown: false,
            hasMissingFeatures: false,
        };
    }

    public getState(): AppState {
        return this.state;
    }

    public updateState(updates: Partial<AppState>) {
        this.state = { ...this.state, ...updates };
    }

    public async startPolling() {
        await this.pollLoop();
    }

    public stopPolling() {
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
    }

    private async pollLoop() {
        if (this.state.isShuttingDown) return;
        let nextPollDelay: number = POLLING.DEFAULT_INTERVAL;

        try {
            const trackData = await pollCurrentlyPlaying();

            if (trackData) {
                if (trackData.track_id !== this.state.lastTrackId) {
                    this.updateState({ lastTrackId: trackData.track_id });

                    const features = await getAudioFeatures(
                        trackData.track_id,
                        trackData.track_name,
                        trackData.artist
                    );

                    if (features) {
                        const camelotKey = convertToCamelot(features.key, features.mode);
                        const newTrack: CurrentTrack = {
                            ...trackData,
                            audio_features: features,
                            camelot_key: camelotKey,
                            duration_ms: trackData.duration_ms,
                            isPlaying: trackData.isPlaying,
                            timestamp: Date.now(),
                        };

                        const compatibleKeys = getCompatibleKeys(camelotKey);
                        const useRelaxedFilter = this.state.selectedCategory === 'ALL';
                        const recommendations = filterMatches(
                            newTrack,
                            this.state.library,
                            compatibleKeys,
                            useRelaxedFilter
                        );

                        this.updateState({
                            currentTrack: newTrack,
                            recommendations,
                            hasMissingFeatures: false,
                            debugMessage: undefined,
                        });
                    } else {
                        this.updateState({
                            currentTrack: trackData,
                            recommendations: [],
                            hasMissingFeatures: true,
                            debugMessage: `Audio Features missing for ID: ${trackData.track_id}. Check logs.`,
                        });
                    }
                } else if (this.state.currentTrack) {
                    // Update existing track state
                    const updatedTrack = {
                        ...this.state.currentTrack,
                        progress_ms: trackData.progress_ms,
                        timestamp: Date.now(),
                        isPlaying: trackData.isPlaying,
                    };
                    this.updateState({ currentTrack: updatedTrack });
                }

                // Smart Poll Logic
                if (this.state.currentTrack && this.state.currentTrack.isPlaying) {
                    const remainingMs = this.state.currentTrack.duration_ms - this.state.currentTrack.progress_ms;
                    if (remainingMs <= POLLING.TRANSITION_THRESHOLD) {
                        nextPollDelay = POLLING.FAST_INTERVAL;
                    } else if (remainingMs > 20000) {
                        nextPollDelay = POLLING.MAX_INTERVAL;
                    } else {
                        nextPollDelay = POLLING.DEFAULT_INTERVAL;
                    }
                }
            } else {
                this.updateState({
                    currentTrack: null,
                    recommendations: [],
                    lastTrackId: null,
                    debugMessage: undefined,
                });
                nextPollDelay = POLLING.DEFAULT_INTERVAL;
            }
        } catch (error) {
            const err = error as Error;
            this.updateState({ debugMessage: `Poll Error: ${err.message || 'Unknown error'}` });
            nextPollDelay = POLLING.DEFAULT_INTERVAL;
        }

        if (!this.state.isShuttingDown) {
            this.pollTimeout = setTimeout(() => this.pollLoop(), nextPollDelay);
        }
    }

    public async triggerLibraryRefresh() {
        if (this.state.isRefreshingLibrary) {
            this.updateState({ debugMessage: 'Library refresh already running...' });
            return;
        }

        this.updateState({
            isRefreshingLibrary: true,
            debugMessage: 'Refreshing library from CSV...',
        });

        try {
            const result = await refreshLibrary({ quiet: true });
            if (result.success) {
                const library = await loadLibrary();
                this.updateState({
                    library,
                    debugMessage: 'Library refreshed.',
                });

                // Re-run matching if we have a current track
                if (this.state.currentTrack) {
                    // Simplified logic: just re-poll or let next poll handle it? 
                    // Better to update immediately if possible.
                    // For now, let's just update library and let next poll or user interaction fix it, 
                    // OR replicate the logic from main.ts which was complex.
                    // Replicating logic for immediate update:
                    const libraryMatch = library.find(t => t.track_id === this.state.currentTrack?.track_id);
                    const effectiveCamelot = (
                        this.state.currentTrack.camelot_key ||
                        libraryMatch?.camelot_key ||
                        ''
                    ).trim();
                    const effectiveBpm = this.state.currentTrack.audio_features?.tempo || libraryMatch?.bpm || 0;

                    if (effectiveCamelot && effectiveBpm > 0) {
                        const compatibleKeys = getCompatibleKeys(effectiveCamelot);
                        const useRelaxedFilter = this.state.selectedCategory === 'ALL';
                        const updatedTrack: CurrentTrack = {
                            ...this.state.currentTrack,
                            camelot_key: effectiveCamelot,
                            audio_features: {
                                ...this.state.currentTrack.audio_features,
                                tempo: effectiveBpm,
                            },
                        };
                        const recommendations = filterMatches(
                            updatedTrack,
                            library,
                            compatibleKeys,
                            useRelaxedFilter
                        );
                        this.updateState({
                            currentTrack: updatedTrack,
                            recommendations,
                        });
                    }
                }
            } else {
                this.updateState({ debugMessage: `Refresh failed: ${result.error || 'Unknown error'}` });
            }
        } catch (err) {
            const e = err as Error;
            this.updateState({ debugMessage: `Refresh error: ${e.message || err}` });
        } finally {
            this.updateState({ isRefreshingLibrary: false });
        }
    }

    public async enrichCurrentTrack() {
        if (!this.state.currentTrack || !this.state.hasMissingFeatures) return;

        this.updateState({ debugMessage: 'Fetching audio features from SongBPM...' });

        try {
            await enrichLibrary({ limit: 1, interactive: false });
            const library = await loadLibrary();
            this.updateState({ library });

            const features = await getAudioFeatures(
                this.state.currentTrack.track_id,
                this.state.currentTrack.track_name,
                this.state.currentTrack.artist
            );

            if (features) {
                const camelotKey = convertToCamelot(features.key, features.mode);
                const updatedTrack = {
                    ...this.state.currentTrack,
                    camelot_key: camelotKey,
                    audio_features: features,
                };

                const compatibleKeys = getCompatibleKeys(camelotKey);
                const useRelaxedFilter = this.state.selectedCategory === 'ALL';
                const recommendations = filterMatches(updatedTrack, library, compatibleKeys, useRelaxedFilter);

                this.updateState({
                    currentTrack: updatedTrack,
                    recommendations,
                    hasMissingFeatures: false,
                    debugMessage: `Features enriched! BPM: ${features.tempo}, Key: ${camelotKey}`,
                });
            } else {
                this.updateState({ debugMessage: 'Enrichment failed. Check API limit or try again.' });
            }
        } catch (error) {
            const e = error as Error;
            this.updateState({ debugMessage: `Enrichment error: ${e.message || 'Unknown'}` });
        }
    }

    public async shutdown() {
        if (this.state.isShuttingDown) return;
        this.updateState({ isShuttingDown: true });
        this.stopPolling();
        await disconnectPrisma();
    }
}
