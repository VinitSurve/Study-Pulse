'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDuration, getLocalDayStart, getLocalDayEnd, getWeekStart, getMonthStart } from '@/lib/utils';
import type { StudySessionWithSubject } from '@/types';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All Time' },
];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [sessions, setSessions] = useState<StudySessionWithSubject[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from('study_sessions')
        .select('*, subjects(name)')
        .eq('status', 'completed')
        .order('started_at', { ascending: false });

      const now = new Date();
      if (period === 'today') {
        query = query
          .gte('started_at', getLocalDayStart(now).toISOString())
          .lte('started_at', getLocalDayEnd(now).toISOString());
      } else if (period === 'week') {
        query = query.gte('started_at', getWeekStart(now).toISOString());
      } else if (period === 'month') {
        query = query.gte('started_at', getMonthStart(now).toISOString());
      }

      const { data } = await query;
      setSessions((data as StudySessionWithSubject[]) || []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Fetch weekly chart data
  const fetchWeeklyChart = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const weekStart = getWeekStart();

      const { data } = await supabase
        .from('study_sessions')
        .select('started_at, duration_seconds')
        .eq('status', 'completed')
        .gte('started_at', weekStart.toISOString());

      const daily = [0, 0, 0, 0, 0, 0, 0];
      (data || []).forEach((s: any) => {
        const d = new Date(s.started_at);
        const dayOfWeek = d.getDay();
        // Convert to Mon=0 ... Sun=6
        const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        daily[idx] += s.duration_seconds || 0;
      });
      setWeeklyData(daily);
    } catch (err) {
      console.error('Failed to fetch weekly chart:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchWeeklyChart();
  }, [fetchStats, fetchWeeklyChart]);

  // Calculate stats
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalSeconds = completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const sessionCount = completedSessions.length;
  const avgSeconds = sessionCount > 0 ? Math.floor(totalSeconds / sessionCount) : 0;
  const longestSeconds = completedSessions.reduce((max, s) => Math.max(max, s.duration_seconds || 0), 0);

  // Subject breakdown
  const subjectMap = new Map<string, number>();
  completedSessions.forEach(s => {
    const name = s.subjects?.name || 'Unknown';
    subjectMap.set(name, (subjectMap.get(name) || 0) + (s.duration_seconds || 0));
  });
  const subjectBreakdown = Array.from(subjectMap.entries())
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  // Most studied
  const mostStudied = subjectBreakdown.length > 0 ? subjectBreakdown[0].name : '—';

  // Weekly chart max for scaling
  const weeklyMax = Math.max(...weeklyData, 1);

  return (
    <div className="px-5 pt-14 pb-4">
      <h1 className="text-lg font-semibold mb-6">Statistics</h1>

      {/* Period tabs */}
      <div className="flex gap-1 bg-bg-surface rounded-xl p-1 mb-6">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              period === key
                ? 'bg-bg-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted text-sm">Loading…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-bg-surface rounded-xl p-4">
              <div className="text-2xl font-bold font-mono tabular-nums">{formatDuration(totalSeconds)}</div>
              <div className="text-xs text-text-muted mt-1">Total time</div>
            </div>
            <div className="bg-bg-surface rounded-xl p-4">
              <div className="text-2xl font-bold font-mono tabular-nums">{sessionCount}</div>
              <div className="text-xs text-text-muted mt-1">Sessions</div>
            </div>
            <div className="bg-bg-surface rounded-xl p-4">
              <div className="text-2xl font-bold font-mono tabular-nums">{formatDuration(avgSeconds)}</div>
              <div className="text-xs text-text-muted mt-1">Avg session</div>
            </div>
            <div className="bg-bg-surface rounded-xl p-4">
              <div className="text-2xl font-bold font-mono tabular-nums">{formatDuration(longestSeconds)}</div>
              <div className="text-xs text-text-muted mt-1">Longest</div>
            </div>
          </div>

          {/* Most studied */}
          <div className="bg-bg-surface rounded-xl p-4 mb-6">
            <div className="text-xs text-text-muted mb-1">Most studied</div>
            <div className="text-lg font-semibold text-accent">{mostStudied}</div>
          </div>

          {/* Weekly chart */}
          <section className="mb-6">
            <h2 className="text-sm font-medium text-text-secondary mb-3">This week</h2>
            <div className="bg-bg-surface rounded-xl p-4">
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((seconds, i) => {
                  const height = weeklyMax > 0 ? (seconds / weeklyMax) * 100 : 0;
                  const isToday = (() => {
                    const today = new Date().getDay();
                    const todayIdx = today === 0 ? 6 : today - 1;
                    return i === todayIdx;
                  })();
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                        <div
                          className={`w-full max-w-[28px] rounded-md transition-all ${
                            isToday ? 'bg-accent' : seconds > 0 ? 'bg-accent/40' : 'bg-border'
                          }`}
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${isToday ? 'text-accent font-semibold' : 'text-text-muted'}`}>
                        {WEEKDAY_LABELS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Subject breakdown */}
          {subjectBreakdown.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-text-secondary mb-3">Subjects</h2>
              <div className="space-y-2">
                {subjectBreakdown.map(({ name, seconds }) => (
                  <div key={name} className="bg-bg-surface rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary">{name}</span>
                      <span className="text-sm font-mono text-text-secondary tabular-nums">
                        {formatDuration(seconds)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full transition-all"
                        style={{ width: `${(seconds / totalSeconds) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {sessionCount === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              No study data for this period.
            </div>
          )}
        </>
      )}
    </div>
  );
}
