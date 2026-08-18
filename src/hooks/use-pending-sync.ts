'use client';

import { useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getPendingSessions, removePendingSession } from '@/lib/timer/pending';

/**
 * Hook that syncs pending offline sessions to Supabase.
 * Runs on mount and when the app regains connectivity.
 * Uses the session UUID as an idempotency key (upsert on conflict).
 */
export function usePendingSync() {
  const syncPending = useCallback(async () => {
    const pending = getPendingSessions();
    if (pending.length === 0) return;

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const session of pending) {
      try {
        const { error } = await supabase.from('study_sessions').upsert({
          id: session.id,
          user_id: user.id,
          subject_id: session.subject_id,
          started_at: session.started_at,
          ended_at: session.ended_at,
          duration_seconds: session.duration_seconds,
          mode: session.mode,
          planned_duration_seconds: session.planned_duration_seconds,
          status: session.status,
        }, { onConflict: 'id' });

        if (!error) {
          removePendingSession(session.id);
        }
      } catch {
        // Will retry next time
      }
    }
  }, []);

  useEffect(() => {
    // Sync on mount
    syncPending();

    // Sync when coming back online
    window.addEventListener('online', syncPending);
    return () => window.removeEventListener('online', syncPending);
  }, [syncPending]);
}
