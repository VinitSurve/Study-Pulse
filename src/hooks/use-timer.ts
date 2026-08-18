'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerState, TimerMode, PendingSession } from '@/types';
import {
  createTimerState,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getElapsedSeconds,
  getRemainingSeconds,
  isTimedSessionComplete,
  getFinalDurationSeconds,
  saveTimerState,
  loadTimerState,
  clearTimerState,
} from '@/lib/timer/engine';
import { addPendingSession } from '@/lib/timer/pending';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface UseTimerReturn {
  timerState: TimerState | null;
  displaySeconds: number;       // Elapsed or remaining depending on mode
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  start: (subjectId: string, subjectName: string, mode: TimerMode, duration?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  cancel: () => void;
  isSaving: boolean;
  saveError: string | null;
}

export function useTimer(): UseTimerReturn {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<TimerState | null>(null);

  // Keep ref in sync for interval callback (must be done in effect to avoid StrictMode violations)
  useEffect(() => {
    stateRef.current = timerState;
  }, [timerState]);

  // 1. Define saveSessionToSupabase first since others depend on it
  const saveSessionToSupabase = useCallback(async (state: TimerState) => {
    setIsSaving(true);
    setSaveError(null);

    const endedAt = new Date().toISOString();
    const durationSeconds = getFinalDurationSeconds(state);

    const sessionData: PendingSession = {
      id: state.id,
      user_id: '', // Will be set from auth
      subject_id: state.subjectId,
      started_at: new Date(state.startedAt).toISOString(),
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      mode: state.mode,
      planned_duration_seconds: state.plannedDurationSeconds ?? null,
      status: state.status === 'completed' ? 'completed' : 'cancelled',
    };

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      sessionData.user_id = user.id;

      const { error } = await supabase.from('study_sessions').upsert({
        id: sessionData.id,
        user_id: user.id,
        subject_id: sessionData.subject_id,
        started_at: sessionData.started_at,
        ended_at: sessionData.ended_at,
        duration_seconds: sessionData.duration_seconds,
        mode: sessionData.mode,
        planned_duration_seconds: sessionData.planned_duration_seconds,
        status: sessionData.status,
      }, { onConflict: 'id' });

      if (error) throw error;

      clearTimerState();
      setTimerState(null);
      setDisplaySeconds(0);
    } catch (err) {
      console.error('Failed to save session:', err);
      setSaveError('Failed to save session. It will sync when you reconnect.');
      // Store for offline sync
      addPendingSession(sessionData);
      clearTimerState();
      setTimerState(null);
      setDisplaySeconds(0);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // 2. Define updateDisplay which depends on saveSessionToSupabase
  const updateDisplay = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;

    if (state.mode === 'timed') {
      const remaining = getRemainingSeconds(state);
      setDisplaySeconds(remaining);
      // Auto-complete when countdown reaches zero
      if (remaining <= 0 && state.status === 'running') {
        const completed = stopTimer(state);
        setTimerState(completed);
        saveTimerState(completed);
        // Save to Supabase
        void saveSessionToSupabase(completed);
      }
    } else {
      setDisplaySeconds(getElapsedSeconds(state));
    }
  }, [saveSessionToSupabase]);

  // 3. Define interval controls
  const startDisplayInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(updateDisplay, 1000);
    updateDisplay(); // immediate first update
  }, [updateDisplay]);

  const stopDisplayInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 4. Load persisted timer state on mount safely
  useEffect(() => {
    let mounted = true;

    // Wrap in Promise.resolve().then() to avoid synchronous state updates
    // during the effect execution, which triggers react-hooks/set-state-in-effect
    Promise.resolve().then(() => {
      if (!mounted) return;

      const saved = loadTimerState();
      if (saved) {
        // Check if a timed session has expired while the app was closed
        if (saved.mode === 'timed' && saved.status === 'running' && isTimedSessionComplete(saved)) {
          const completed = stopTimer(saved);
          setTimerState(completed);
          saveTimerState(completed);
          void saveSessionToSupabase(completed);
        } else {
          setTimerState(saved);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [saveSessionToSupabase]);

  // 5. Manage the display interval based on timer status
  useEffect(() => {
    if (timerState && (timerState.status === 'running' || timerState.status === 'paused')) {
      startDisplayInterval();
    } else {
      stopDisplayInterval();
    }
    return stopDisplayInterval;
  }, [timerState, startDisplayInterval, stopDisplayInterval]);

  // 6. Define action methods
  const start = useCallback((
    subjectId: string,
    subjectName: string,
    mode: TimerMode,
    duration?: number
  ) => {
    const state = createTimerState(subjectId, subjectName, mode, duration);
    setTimerState(state);
    saveTimerState(state);
    setSaveError(null);
  }, []);

  const pause = useCallback(() => {
    if (!timerState) return;
    const state = pauseTimer(timerState);
    setTimerState(state);
    saveTimerState(state);
  }, [timerState]);

  const doResume = useCallback(() => {
    if (!timerState) return;
    const state = resumeTimer(timerState);
    setTimerState(state);
    saveTimerState(state);
  }, [timerState]);

  const doStop = useCallback(async () => {
    if (!timerState) return;
    const completed = stopTimer(timerState);
    setTimerState(completed);
    saveTimerState(completed);
    await saveSessionToSupabase(completed);
  }, [timerState, saveSessionToSupabase]);

  const doCancel = useCallback(() => {
    if (!timerState) return;
    clearTimerState();
    setTimerState(null);
    setDisplaySeconds(0);
  }, [timerState]);

  return {
    timerState,
    displaySeconds,
    isRunning: timerState?.status === 'running',
    isPaused: timerState?.status === 'paused',
    isCompleted: timerState?.status === 'completed',
    start,
    pause,
    resume: doResume,
    stop: doStop,
    cancel: doCancel,
    isSaving,
    saveError,
  };
}
