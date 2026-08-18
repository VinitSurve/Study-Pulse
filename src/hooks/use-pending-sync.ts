'use client';

import { useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getPendingSessions, removePendingSession, getPendingAttempts, removePendingAttempt } from '@/lib/timer/pending';

/**
 * Hook that syncs pending offline sessions and attempts to Supabase.
 * Runs on mount and when the app regains connectivity.
 * Uses the session/attempt UUID as an idempotency key (upsert on conflict).
 */
export function usePendingSync() {
  const syncPending = useCallback(async () => {
    const pendingSessions = getPendingSessions();
    const pendingAttempts = getPendingAttempts();
    
    if (pendingSessions.length === 0 && pendingAttempts.length === 0) return;

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Sync Study Sessions
    for (const session of pendingSessions) {
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

    // 2. Sync Problem Attempts
    for (const attempt of pendingAttempts) {
      try {
        // Step A: Resolve Canonical Problem
        let canonicalProblemId = null;
        const { data: existing } = await supabase
          .from('problems')
          .select('id')
          .eq('user_id', user.id)
          .eq('title_normalized', attempt.problem_title.toLowerCase().trim())
          .eq('platform_normalized', attempt.problem_platform.toLowerCase().trim())
          .maybeSingle();

        if (existing) {
          canonicalProblemId = existing.id;
        } else {
          const { data: newProb, error: insertError } = await supabase
            .from('problems')
            .insert({
              user_id: user.id,
              title: attempt.problem_title,
              platform: attempt.problem_platform,
              difficulty: attempt.problem_difficulty,
              topic: attempt.problem_topic || null,
            })
            .select('id')
            .maybeSingle();

          if (insertError) {
            if (insertError.code === '23505') { // Unique violation
              const { data: retry } = await supabase
                .from('problems')
                .select('id')
                .eq('user_id', user.id)
                .eq('title_normalized', attempt.problem_title.toLowerCase().trim())
                .eq('platform_normalized', attempt.problem_platform.toLowerCase().trim())
                .single();
              canonicalProblemId = retry?.id;
            } else {
              console.error('Failed to insert canonical problem:', insertError?.message || JSON.stringify(insertError));
              continue;
            }
          } else if (newProb) {
            canonicalProblemId = newProb.id;
          }
        }

        if (!canonicalProblemId) {
          console.error('Could not resolve canonical problem ID');
          continue; // Keep pending item, retry later
        }

        // Step B: Upsert Attempt
        const { error: attemptError } = await supabase.from('problem_attempts').upsert({
          id: attempt.id,
          user_id: user.id,
          problem_id: canonicalProblemId,
          study_session_id: attempt.study_session_id,
          started_at: attempt.started_at,
          ended_at: attempt.ended_at,
          duration_seconds: attempt.duration_seconds,
          result: attempt.result,
          attempt_number: attempt.attempt_number,
          test_cases_passed: attempt.test_cases_passed,
          test_cases_total: attempt.test_cases_total,
          language: attempt.language,
          hint_used: attempt.hint_used,
          editorial_used: attempt.editorial_used,
          time_complexity: attempt.time_complexity,
          space_complexity: attempt.space_complexity,
          notes: attempt.notes,
        }, { onConflict: 'id' });

        if (!attemptError) {
          removePendingAttempt(attempt.id);
        } else {
          console.error('Failed to sync problem attempt:', attemptError?.message || JSON.stringify(attemptError));
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
