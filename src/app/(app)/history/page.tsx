'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDuration, formatTime, formatDate, groupBy } from '@/lib/utils';
import type { StudySessionWithSubject } from '@/types';

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [sessions, setSessions] = useState<StudySessionWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchSessions = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('study_sessions')
        .select('*, subjects(name)')
        .in('status', ['completed', 'cancelled'])
        .order('started_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      const fetched = (data as StudySessionWithSubject[]) || [];
      if (fetched.length < PAGE_SIZE) setHasMore(false);

      setSessions(prev => append ? [...prev, ...fetched] : fetched);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(0);
  }, [fetchSessions]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSessions(nextPage, true);
  };

  // Group sessions by date (local timezone)
  const grouped = groupBy(sessions, (s) => {
    const date = new Date(s.started_at);
    return formatDate(date);
  });

  return (
    <div className="px-5 pt-14 pb-4">
      <h1 className="text-lg font-semibold mb-6">History</h1>

      {Object.keys(grouped).length === 0 && !loading ? (
        <div className="text-center py-16 text-text-muted text-sm">
          No sessions yet. Start studying to see your history here.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateSessions]) => (
            <section key={dateLabel}>
              <h2 className="text-sm font-medium text-text-secondary mb-2">{dateLabel}</h2>
              <div className="space-y-2">
                {dateSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-bg-surface rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {session.subjects?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          {formatTime(new Date(session.started_at))}
                          {session.ended_at && (
                            <> – {formatTime(new Date(session.ended_at))}</>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-text-secondary tabular-nums">
                          {session.duration_seconds ? formatDuration(session.duration_seconds) : '—'}
                        </div>
                        {session.status === 'cancelled' && (
                          <div className="text-[10px] text-error mt-0.5">Cancelled</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && sessions.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-text-secondary bg-bg-surface rounded-xl hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {loading && sessions.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm">Loading…</div>
      )}
    </div>
  );
}
