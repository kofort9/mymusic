import { z } from 'zod';

export type TrackID = string;
export type CamelotCode = string; // e.g., "1A", "12B"

export enum ShiftType {
  SMOOTH = 'Smooth',
  MOOD_SWITCH = 'Mood Switch',
  ENERGY_UP = 'Energy Up',
  ENERGY_DOWN = 'Energy Down',
  RHYTHMIC_BREAKER = 'Rhythmic/Dead-End Breaker',
}

export const AudioFeaturesSchema = z.object({
  tempo: z.number().min(0).max(300), // BPM range check
  key: z.number().min(0).max(11), // 0-11
  mode: z.number().min(0).max(1), // 0 or 1
  energy: z.number().min(0).max(1).optional(),
  valence: z.number().min(0).max(1).optional(),
  danceability: z.number().min(0).max(1).optional(),
  acousticness: z.number().min(0).max(1).optional(),
  instrumentalness: z.number().min(0).max(1).optional(),
  liveness: z.number().min(0).max(1).optional(),
  speechiness: z.number().min(0).max(1).optional(),
  time_signature: z.number().min(1).max(12).optional(),
});

export type AudioFeatures = z.infer<typeof AudioFeaturesSchema>;

export interface LibraryTrack {
  track_id: TrackID;
  track_name: string;
  artist: string;
  camelot_key: CamelotCode;
  bpm: number;
  energy?: number;
  genre?: string;
}

export interface MatchedTrack extends LibraryTrack {
  shiftType: ShiftType;
}

export interface CurrentTrack {
  track_id: TrackID;
  track_name: string;
  artist: string;
  audio_features: AudioFeatures;
  camelot_key: CamelotCode;
  progress_ms: number; // Playback progress
  duration_ms: number; // Total duration
  timestamp: number; // Timestamp of the poll
  isPlaying?: boolean; // Playing state for indicator
}

export interface PhraseInfo {
  beatsRemaining: number;
  timeRemainingSeconds: number;
  phraseCount: number; // e.g., 1-8
}
