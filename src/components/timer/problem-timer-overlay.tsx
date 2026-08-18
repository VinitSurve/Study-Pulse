'use client';

import { useState, useEffect } from 'react';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';
import { formatTimerDisplay } from '@/lib/utils';
import { CompleteProblem } from './complete-problem';

export function ProblemTimerOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  
  const {
    timerState,
    displaySeconds,
    isRunning,
    isPaused,
    pause,
    resume,
    cancel,
    isSaving,
    saveError,
  } = useProblemTimerContext();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
      setIsOpen(false);
      setShowComplete(false);
    };

    window.addEventListener('open_problem_timer', handleOpen);
    window.addEventListener('close_problem_timer', handleClose);
    
    return () => {
      window.removeEventListener('open_problem_timer', handleOpen);
      window.removeEventListener('close_problem_timer', handleClose);
    };
  }, []);

  // Auto-close if timer is somehow cancelled from elsewhere
  useEffect(() => {
    if (!timerState && isOpen && !isSaving) {
      setIsOpen(false);
    }
  }, [timerState, isOpen, isSaving]);

  if (!isOpen || !timerState) return null;

  const handleCancel = () => {
    cancel();
    setIsOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-bg flex flex-col items-center justify-center px-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header / Close button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 sm:top-8 left-4 sm:left-8 p-3 text-text-muted hover:text-text-primary transition-colors rounded-full hover:bg-bg-surface"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Problem Title & Platform */}
        <div className="mb-2 text-center mt-[-40px]">
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            {timerState.platform}
          </span>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{timerState.problemTitle}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
              timerState.difficulty === 'Easy' ? 'bg-success/10 text-success border-success/20' :
              timerState.difficulty === 'Medium' ? 'bg-accent/10 text-accent border-accent/20' :
              'bg-error/10 text-error border-error/20'
            }`}>
              {timerState.difficulty}
            </span>
            {timerState.topic && (
              <span className="text-xs px-2 py-0.5 bg-bg-surface border border-border text-text-secondary rounded-md">
                {timerState.topic}
              </span>
            )}
          </div>
        </div>

        {/* Mode indicator */}
        <div className="mb-8 mt-4">
          <span className="text-xs text-text-muted">
            Problem Attempt
          </span>
        </div>

        {/* Timer display */}
        <div className={`relative mb-12 ${isRunning ? 'timer-glow-accent' : ''} rounded-full`}>
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
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {/* Cancel */}
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="w-14 h-14 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-error hover:border-error/30 transition-colors active:scale-90"
            aria-label="Cancel attempt"
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

          {/* Complete */}
          <button
            onClick={() => setShowComplete(true)}
            disabled={isSaving}
            className="w-14 h-14 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-success hover:border-success/30 transition-colors active:scale-90 disabled:opacity-50"
            aria-label="Complete attempt"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div className="mt-6 text-sm text-text-muted">Saving attempt…</div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="mt-6 text-sm text-accent text-center px-4">{saveError}</div>
        )}
      </div>

      {showComplete && <CompleteProblem onClose={() => setShowComplete(false)} />}
    </>
  );
}
