'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTimerContext } from '@/components/providers/timer-provider';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';
import { formatTimerDisplay } from '@/lib/utils';
import { StartProblem } from '@/components/timer/start-problem';
import { CompleteProblem } from '@/components/timer/complete-problem';
import { AICoachPanel } from '@/components/timer/ai-coach-panel';

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
    if (!timerState && !problemTimerState) {
      router.replace('/dashboard');
    }
  }, [timerState, problemTimerState, router]);

  if (!timerState && !problemTimerState) {
    return null;
  }

  const handleStopStudy = async () => {
    if (problemTimerState) {
      alert("You have an active problem attempt. Finish or abandon it first.");
      return;
    }
    await stop();
    router.replace('/dashboard');
  };

  const handleCancelStudy = () => {
    cancel();
    if (!problemTimerState) {
      router.replace('/dashboard');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col pt-4 px-2 sm:px-6 pb-24">
      {/* Container for the Timers */}
      <div className="flex flex-row gap-2 sm:gap-6 justify-center w-full max-w-5xl mx-auto flex-1 items-center">
        
        {/* STUDY TIMER */}
        {timerState && (
          <div className="flex flex-col items-center flex-1 w-1/2">
            <div className="mb-2 text-center">
              <span className="text-xs sm:text-sm font-medium text-text-secondary uppercase tracking-wider line-clamp-1">
                {timerState.subjectName}
              </span>
              <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Study Timer</div>
            </div>

            <div className={`relative mb-6 ${isRunning ? 'timer-glow' : ''} rounded-full`}>
              <div className="w-40 h-40 sm:w-64 sm:h-64 rounded-full border-2 border-border flex items-center justify-center bg-bg-surface/50">
                <div className="text-center">
                  <div className="font-mono text-2xl sm:text-5xl font-bold tabular-nums text-text-primary tracking-wider">
                    {formatTimerDisplay(displaySeconds)}
                  </div>
                  {isPaused && (
                    <div className="text-accent text-[10px] sm:text-sm font-medium mt-1 animate-pulse">Paused</div>
                  )}
                  {isCompleted && (
                    <div className="text-success text-[10px] sm:text-sm font-medium mt-1">Complete</div>
                  )}
                </div>
              </div>
            </div>

            {!isCompleted && (
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={handleCancelStudy}
                  disabled={isSaving}
                  aria-label="Cancel session"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-error transition-colors active:scale-90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
                {isRunning ? (
                  <button onClick={pause} aria-label="Pause" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent flex items-center justify-center text-bg hover:bg-amber-400 transition-all active:scale-90 shadow-lg shadow-accent/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="sm:w-6 sm:h-6"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  </button>
                ) : isPaused ? (
                  <button onClick={resume} aria-label="Resume" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent flex items-center justify-center text-bg hover:bg-amber-400 transition-all active:scale-90 shadow-lg shadow-accent/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="sm:w-6 sm:h-6"><polygon points="6 3 20 12 6 21"/></svg>
                  </button>
                ) : null}
                <button
                  onClick={handleStopStudy}
                  disabled={isSaving}
                  aria-label="Stop and save session"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-success transition-colors active:scale-90 disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="sm:w-[18px] sm:h-[18px]"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </button>
              </div>
            )}
            
            {!problemTimerState && !isCompleted && (
              <button
                onClick={() => setShowStartProblem(true)}
                className="mt-6 py-2 px-3 sm:py-2.5 sm:px-5 bg-bg-surface border border-accent/30 text-accent font-medium text-xs sm:text-sm rounded-xl hover:bg-accent/10 active:scale-95 transition-all w-full max-w-[160px] sm:max-w-[200px]"
              >
                Start Problem
              </button>
            )}
          </div>
        )}

        {/* DSA TIMER */}
        {problemTimerState && (
          <div className="flex flex-col items-center flex-1 w-1/2 border-l border-border/50 pl-2 sm:pl-6">
             <div className="mb-2 text-center">
              <span className="text-[10px] sm:text-sm font-medium text-accent uppercase tracking-wider">
                {problemTimerState.platform}
              </span>
              <h2 className="text-sm sm:text-xl font-bold text-text-primary mt-0.5 sm:mt-1 line-clamp-1">{problemTimerState.problemTitle}</h2>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1">
                <span className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-md font-medium border ${
                  problemTimerState.difficulty === 'Easy' ? 'bg-success/10 text-success border-success/20' :
                  problemTimerState.difficulty === 'Medium' ? 'bg-accent/10 text-accent border-accent/20' :
                  'bg-error/10 text-error border-error/20'
                }`}>
                  {problemTimerState.difficulty}
                </span>
              </div>
            </div>

            <div className="relative mb-6 mt-1 sm:mt-2 rounded-full">
              <div className="w-32 h-32 sm:w-56 sm:h-56 rounded-full border-2 border-border/70 flex items-center justify-center bg-bg-surface/30 shadow-inner">
                <div className="text-center">
                  <div className="font-mono text-xl sm:text-4xl font-bold tabular-nums text-text-primary tracking-wider">
                    <ProblemTimerDisplay />
                  </div>
                </div>
              </div>
            </div>

            <ProblemTimerControls />
          </div>
        )}
      </div>

      <div className="w-full mt-auto pt-8">
        <AICoachPanel />
      </div>

      {showStartProblem && (
        <StartProblem onClose={() => setShowStartProblem(false)} />
      )}
    </div>
  );
}

// We need these local components to consume the problem timer context without breaking the study timer context hooks above.
function ProblemTimerDisplay() {
  const { displaySeconds, isPaused } = useProblemTimerContext();
  return (
    <>
      {formatTimerDisplay(displaySeconds)}
      {isPaused && (
        <div className="text-accent text-xs font-medium mt-2 animate-pulse">Paused</div>
      )}
    </>
  );
}

function ProblemTimerControls() {
  const { isRunning, isPaused, pause, resume, cancel, isSaving } = useProblemTimerContext();
  const [showComplete, setShowComplete] = useState(false);
  
  return (
    <>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={cancel}
          disabled={isSaving}
          aria-label="Cancel attempt"
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-error transition-colors active:scale-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
        </button>
        {isRunning ? (
          <button onClick={pause} aria-label="Pause" className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-bg hover:bg-amber-400 transition-all active:scale-90 shadow-lg shadow-accent/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="sm:w-5 sm:h-5"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          </button>
        ) : isPaused ? (
          <button onClick={resume} aria-label="Resume" className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center text-bg hover:bg-amber-400 transition-all active:scale-90 shadow-lg shadow-accent/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="sm:w-5 sm:h-5"><polygon points="6 3 20 12 6 21"/></svg>
          </button>
        ) : null}
        <button
          onClick={() => setShowComplete(true)}
          disabled={isSaving}
          aria-label="Complete attempt"
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted hover:text-success transition-colors active:scale-90 disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="sm:w-4 sm:h-4"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
        </button>
      </div>
      {showComplete && <CompleteProblem onClose={() => setShowComplete(false)} />}
    </>
  );
}
