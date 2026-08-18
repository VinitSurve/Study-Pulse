/**
 * Timestamp-based timer engine.
 *
 * The timer NEVER uses setInterval/setTimeout as a source of truth.
 * All elapsed time is calculated from actual timestamps.
 * The UI may poll every second for display, but the truth is always:
 *
 *   elapsed = now - startedAt - totalPausedMs - (isPaused ? now - pausedAt : 0)
 */

import type { TimerState, TimerMode } from '@/types';
import { generateId } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';

// ─── Elapsed Time Calculation ───────────────────────────────────────

/**
 * Calculate total elapsed study time in milliseconds.
 * This is the single source of truth.
 */
export function getElapsedMs(state: TimerState): number {
  const now = Date.now();
  let elapsed = now - state.startedAt - state.totalPausedMs;

  // If currently paused, subtract the ongoing pause duration
  if (state.status === 'paused' && state.pausedAt !== null) {
    elapsed -= (now - state.pausedAt);
  }

  return Math.max(0, elapsed);
}

/**
 * Get elapsed time in seconds (floored).
 */
export function getElapsedSeconds(state: TimerState): number {
  return Math.floor(getElapsedMs(state) / 1000);
}

/**
 * For timed mode: get remaining seconds.
 * Returns 0 if time is up.
 */
export function getRemainingSeconds(state: TimerState): number {
  if (state.mode !== 'timed' || !state.plannedDurationSeconds) return 0;
  const remaining = state.plannedDurationSeconds - getElapsedSeconds(state);
  return Math.max(0, remaining);
}

/**
 * Check if a timed session has completed (countdown reached zero).
 */
export function isTimedSessionComplete(state: TimerState): boolean {
  if (state.mode !== 'timed' || !state.plannedDurationSeconds) return false;
  return getElapsedSeconds(state) >= state.plannedDurationSeconds;
}

// ─── State Transitions ─────────────────────────────────────────────

/**
 * Create a new timer state (start a session).
 */
export function createTimerState(
  subjectId: string,
  subjectName: string,
  mode: TimerMode,
  plannedDurationSeconds?: number
): TimerState {
  return {
    id: generateId(),
    subjectId,
    subjectName,
    mode,
    plannedDurationSeconds: mode === 'timed' ? plannedDurationSeconds : undefined,
    status: 'running',
    startedAt: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    pauseHistory: [],
  };
}

/**
 * Pause the timer. Returns a new state with pause recorded.
 */
export function pauseTimer(state: TimerState): TimerState {
  if (state.status !== 'running') return state;
  return {
    ...state,
    status: 'paused',
    pausedAt: Date.now(),
  };
}

/**
 * Resume the timer. Accumulates the pause duration.
 */
export function resumeTimer(state: TimerState): TimerState {
  if (state.status !== 'paused' || state.pausedAt === null) return state;
  const now = Date.now();
  const pauseDuration = now - state.pausedAt;
  return {
    ...state,
    status: 'running',
    pausedAt: null,
    totalPausedMs: state.totalPausedMs + pauseDuration,
    pauseHistory: [
      ...state.pauseHistory,
      { pausedAt: state.pausedAt, resumedAt: now },
    ],
  };
}

/**
 * Stop the timer (complete the session). Returns final state with calculated duration.
 */
export function stopTimer(state: TimerState): TimerState {
  // If paused, first account for the final pause duration
  let finalState = state;
  if (state.status === 'paused' && state.pausedAt !== null) {
    finalState = resumeTimer(state);
  }

  return {
    ...finalState,
    status: 'completed',
  };
}

/**
 * Cancel the timer (discard the session).
 */
export function cancelTimer(state: TimerState): TimerState {
  return {
    ...state,
    status: 'cancelled',
  };
}

/**
 * Get the final duration in seconds for a completed/cancelled session.
 * Calculated from timestamps, not from a running counter.
 */
export function getFinalDurationSeconds(state: TimerState): number {
  if (state.mode === 'timed' && state.plannedDurationSeconds) {
    // For timed sessions that completed naturally, use the planned duration
    const elapsed = getElapsedSeconds(state);
    return Math.min(elapsed, state.plannedDurationSeconds);
  }
  return getElapsedSeconds(state);
}

// ─── Local Storage Persistence ──────────────────────────────────────

/**
 * Save timer state to localStorage.
 * Called only on meaningful state changes (start, pause, resume, stop, cancel).
 */
export function saveTimerState(state: TimerState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
  } catch {
    // localStorage might be full or unavailable — fail silently
  }
}

/**
 * Load timer state from localStorage.
 * Returns null if no active session exists.
 */
export function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (!raw) return null;
    const state = JSON.parse(raw) as TimerState;
    // Only return if the session is still active (running or paused)
    if (state.status === 'running' || state.status === 'paused') {
      return state;
    }
    // Clean up completed/cancelled states
    clearTimerState();
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear timer state from localStorage.
 */
export function clearTimerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
  } catch {
    // fail silently
  }
}
