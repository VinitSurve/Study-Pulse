// Timer state types

export type TimerMode = 'timed' | 'until_stop';
export type TimerStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export interface PauseRecord {
  pausedAt: number;   // Unix ms
  resumedAt: number;  // Unix ms
}

export interface TimerState {
  id: string;                        // Pre-generated UUID for idempotent saves
  subjectId: string;
  subjectName: string;
  mode: TimerMode;
  plannedDurationSeconds?: number;   // Only for 'timed' mode
  status: TimerStatus;
  startedAt: number;                 // Unix ms
  pausedAt: number | null;           // Unix ms when current pause started
  totalPausedMs: number;             // Accumulated completed pause time
  pauseHistory: PauseRecord[];
}

// Pending session for offline sync
export interface PendingSession {
  id: string;
  user_id: string;
  subject_id: string;
  started_at: string;       // ISO timestamp
  ended_at: string;         // ISO timestamp
  duration_seconds: number;
  mode: TimerMode;
  planned_duration_seconds: number | null;
  status: 'completed' | 'cancelled';
}
