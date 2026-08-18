'use client';

import { useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { StudySessionWithSubject } from '@/types';

interface UseSessionsOptions {
  from?: Date;
  to?: Date;
  limit?: number;
}

export function useSessions() {
  const [sessions, setSessions] = useState<StudySessionWithSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const fetchSessions = useCallback(async (options: UseSessionsOptions = {}) => {
    try {
      setLoading(true);
      let query = supabase
        .from('study_sessions')
        .select('*, subjects(name)')
        .in('status', ['completed', 'cancelled'])
        .order('started_at', { ascending: false });

      if (options.from) {
        query = query.gte('started_at', options.from.toISOString());
      }
      if (options.to) {
        query = query.lte('started_at', options.to.toISOString());
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setSessions((data as StudySessionWithSubject[]) || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { sessions, loading, error, fetchSessions };
}

/**
 * Calculate total study seconds from a list of sessions.
 */
export function getTotalStudySeconds(sessions: StudySessionWithSubject[]): number {
  return sessions
    .filter(s => s.status === 'completed')
    .reduce((total, s) => total + (s.duration_seconds || 0), 0);
}

/**
 * Get subject breakdown: { subjectName: totalSeconds }
 */
export function getSubjectBreakdown(
  sessions: StudySessionWithSubject[]
): Array<{ name: string; seconds: number }> {
  const map = new Map<string, number>();

  sessions
    .filter(s => s.status === 'completed')
    .forEach(s => {
      const name = s.subjects?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + (s.duration_seconds || 0));
    });

  return Array.from(map.entries())
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}
