'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTimerContext } from '@/components/providers/timer-provider';
import { useSessions, getTotalStudySeconds, getSubjectBreakdown } from '@/hooks/use-sessions';
import { StartSession } from '@/components/timer/start-session';
import { formatDuration, formatTimerDisplay, formatTime, getGreeting, getLocalDayStart, getLocalDayEnd } from '@/lib/utils';

import { StartProblem } from '@/components/timer/start-problem';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';

export default function DashboardPage() {
  const [showStartSession, setShowStartSession] = useState(false);
  const [showStartProblem, setShowStartProblem] = useState(false);
  const { timerState, displaySeconds, isRunning, isPaused } = useTimerContext();
  const { timerState: problemTimerState } = useProblemTimerContext();
  const { sessions, fetchSessions } = useSessions();
  const router = useRouter();
  const hasActiveTimer = timerState && (isRunning || isPaused);
  const hasActiveProblem = problemTimerState !== null;

  // Fetch today's sessions
  useEffect(() => {
    fetchSessions({
      from: getLocalDayStart(),
      to: getLocalDayEnd(),
    });
  }, [fetchSessions]);

  // Refetch when returning from timer (session may have been saved)
  useEffect(() => {
    if (!hasActiveTimer) {
      fetchSessions({
        from: getLocalDayStart(),
        to: getLocalDayEnd(),
      });
    }
  }, [hasActiveTimer, fetchSessions]);

  const todaySeconds = getTotalStudySeconds(sessions);
  const subjectBreakdown = getSubjectBreakdown(sessions);
  const recentCompleted = sessions.filter(s => s.status === 'completed').slice(0, 5);

  return (
    <div className="px-5 pt-14 pb-4">
      {/* Greeting */}
      <p className="text-text-secondary text-sm font-medium">{getGreeting()}</p>

      {/* Today's total */}
      <div className="mt-6 mb-8">
        <div className="text-4xl font-bold tracking-tight font-mono tabular-nums">
          {todaySeconds > 0 ? formatDuration(todaySeconds) : '0m'}
        </div>
        <p className="text-text-secondary text-sm mt-1">studied today</p>
      </div>

      {/* Active timer banner */}
      {hasActiveTimer && (
        <button
          onClick={() => router.push('/timer')}
          className="w-full mb-6 p-4 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
            <div className="text-left">
              <div className="text-sm font-medium text-text-primary">{timerState.subjectName}</div>
              <div className="text-xs text-text-secondary">{isPaused ? 'Paused' : 'Studying'}</div>
            </div>
          </div>
          <span className="font-mono text-xl font-bold text-accent tabular-nums">
            {formatTimerDisplay(displaySeconds)}
          </span>
        </button>
      )}

      {/* Start Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {!hasActiveTimer && (
          <button
            onClick={() => setShowStartSession(true)}
            className="w-full py-3.5 bg-accent text-bg font-semibold text-[15px] rounded-2xl hover:bg-amber-400 active:scale-[0.97] transition-all shadow-lg shadow-accent/10"
            id="start-study-btn"
          >
            Start Study
          </button>
        )}
        
        {/* We can span the Problem button full width if there's an active timer, otherwise half width */}
        {!hasActiveProblem && (
          <button
            onClick={() => setShowStartProblem(true)}
            className={`py-3.5 bg-bg-elevated border border-accent/40 text-accent font-semibold text-[15px] rounded-2xl hover:bg-accent/10 active:scale-[0.97] transition-all shadow-sm ${hasActiveTimer ? 'col-span-2 w-full' : 'w-full'}`}
          >
            Start Problem
          </button>
        )}
      </div>

      {/* Today's subject breakdown */}
      {subjectBreakdown.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-text-secondary mb-3">Today</h2>
          <div className="space-y-2">
            {subjectBreakdown.map(({ name, seconds }) => (
              <div key={name} className="flex items-center justify-between py-2.5 px-4 bg-bg-surface rounded-xl">
                <span className="text-sm font-medium text-text-primary">{name}</span>
                <span className="text-sm font-mono text-text-secondary tabular-nums">{formatDuration(seconds)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      {recentCompleted.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Recent sessions</h2>
          <div className="space-y-2">
            {recentCompleted.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-2.5 px-4 bg-bg-surface rounded-xl">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {session.subjects?.name || 'Unknown'}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {formatTime(new Date(session.started_at))}
                    {session.ended_at && ` – ${formatTime(new Date(session.ended_at))}`}
                  </div>
                </div>
                <span className="text-sm font-mono text-text-secondary tabular-nums">
                  {session.duration_seconds ? formatDuration(session.duration_seconds) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasActiveTimer && recentCompleted.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">No sessions yet today.</p>
          <p className="text-text-muted text-sm mt-1">Tap Start Study to begin.</p>
        </div>
      )}

      {/* Start Session Modal */}
      {showStartSession && (
        <StartSession onClose={() => setShowStartSession(false)} />
      )}

      {/* Start Problem Modal */}
      {showStartProblem && (
        <StartProblem onClose={() => setShowStartProblem(false)} />
      )}
    </div>
  );
}
