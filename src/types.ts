export type TrackID = string;
export type CamelotCode = string; // e.g., "1A", "12B"

export enum ShiftType {
  SMOOTH = 'Smooth',
  MOOD_SWITCH = 'Mood Switch',
  ENERGY_UP = 'Energy Up',
  ENERGY_DOWN = 'Energy Down',
  RHYTHMIC_BREAKER = 'Rhythmic/Dead-End Breaker',
}

export interface AudioFeatures {
  tempo: number; // BPM
  key: number; // 0-11
  mode: number; // 0 = Minor, 1 = Major
  energy?: number;
  valence?: number;
  danceability?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  speechiness?: number;
  time_signature?: number; // Usually 4 for 4/4 time
}

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
