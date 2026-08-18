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

// Problem Timer specific state
export interface ProblemTimerState {
  id: string;             // attempt id
  problemTitle: string;   // Snapshot for UI/Sync
  platform: string;       // Snapshot for UI/Sync
  difficulty: string;     // Snapshot for UI/Sync
  topic?: string;
  studySessionId: string | null;
  status: TimerStatus;
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
  pauseHistory: PauseRecord[];
}

export interface PendingProblemAttempt {
  id: string; // attempt id
  user_id: string;
  // Problem snapshot for upsert
  problem_title: string;
  problem_platform: string;
  problem_difficulty: string;
  problem_topic?: string;
  // Attempt data
  study_session_id: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  result: 'solved' | 'failed' | 'abandoned';
  // Metrics
  attempt_number?: number;
  test_cases_passed?: number | null;
  test_cases_total?: number | null;
  language?: string | null;
  hint_used?: boolean;
  editorial_used?: boolean;
  time_complexity?: string | null;
  space_complexity?: string | null;
  notes?: string | null;
}
