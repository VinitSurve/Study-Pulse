'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTimerContext } from '@/components/providers/timer-provider';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';
import { formatTimerDisplay } from '@/lib/utils';
import { StartProblem } from '@/components/timer/start-problem';

export default function TimerPage() {
  const [showStartProblem, setShowStartProblem] = useState(false);
  const router = useRouter();
  const { timerState: problemTimerState } = useProblemTimerContext();
  const {
    timerState,
    displaySeconds,
    isRunning,
    isPaused,
    isCompleted,
    pause,
    resume,
    stop,
    cancel,
    isSaving,
    saveError,
  } = useTimerContext();

  // No active timer — redirect to dashboard
  useEffect(() => {
    if (!timerState) {
      router.replace('/dashboard');
    }
  }, [timerState, router]);

  if (!timerState) {
    return null;
  }

  const handleStop = async () => {
    await stop();
    router.replace('/dashboard');
  };

  const handleCancel = () => {
    cancel();
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 -mt-[68px]">
      {/* Subject */}
      <div className="mb-2">
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          {timerState.subjectName}
        </span>
      </div>

      {/* Mode indicator */}
      <div className="mb-8">
        <span className="text-xs text-text-muted">
          {timerState.mode === 'timed' ? 'Countdown' : 'Stopwatch'}
        </span>
      </div>

      {/* Timer display */}
      <div className={`relative mb-12 ${isRunning ? 'timer-glow' : ''} rounded-full`}>
        <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-border flex items-center justify-center bg-bg-surface/50">
          <div className="text-center">
            <div className="font-mono text-5xl sm:text-6xl font-bold tabular-nums text-text-primary tracking-wider">
              {formatTimerDisplay(displaySeconds)}
            </div>
            {isPaused && (
              <div className="text-accent text-sm font-medium mt-2 animate-pulse">
                Paused
              </div>
            )}
            {isCompleted && (
              <div className="text-success text-sm font-medium mt-2">
                Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {!isCompleted && (
        <div className="flex items-center gap-6">
          {/* Cancel */}
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="w-14 h-14 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-error hover:border-error/30 transition-colors active:scale-90"
            aria-label="Cancel session"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>

          {/* Pause / Resume */}
          {isRunning ? (
            <button
              onClick={pause}
              className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-bg hover:bg-amber-400 transition-all active:scale-90 shadow-lg shadow-accent/20"
              aria-label="Pause"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          ) : isPaused ? (
            <button
              onClick={resume}
              className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-bg hover:bg-amber-400 transition-all active:scale-90 shadow-lg shadow-accent/20"
              aria-label="Resume"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21" />
              </svg>
            </button>
          ) : null}

          {/* Stop */}
          <button
            onClick={handleStop}
            disabled={isSaving}
            className="w-14 h-14 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-success hover:border-success/30 transition-colors active:scale-90 disabled:opacity-50"
            aria-label="Stop and save session"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        </div>
      )}

      {/* Start Problem Button (only if no active problem) */}
      {!problemTimerState && (
        <button
          onClick={() => setShowStartProblem(true)}
          className="mt-12 py-3 px-6 bg-bg-surface border border-accent/30 text-accent font-medium text-sm rounded-xl hover:bg-accent/10 active:scale-95 transition-all"
        >
          Start Problem
        </button>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div className="mt-6 text-sm text-text-muted">Saving session…</div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="mt-6 text-sm text-accent text-center px-4">{saveError}</div>
      )}

      {/* Start Problem Modal */}
      {showStartProblem && (
        <StartProblem onClose={() => setShowStartProblem(false)} />
      )}
    </div>
  );
}
