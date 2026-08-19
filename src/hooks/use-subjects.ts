'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Subject } from '@/types';

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setSubjects((data as Subject[]) || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const createSubject = useCallback(async (name: string): Promise<Subject | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const normalizedName = trimmed.toLowerCase();

    // Check for duplicate locally first using normalized name
    const existing = subjects.find(
      s => s.name.toLowerCase() === normalizedName
    );
    if (existing) return existing;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('subjects')
        .insert({ user_id: user.id, name: trimmed })
        .select()
        .maybeSingle();

      if (insertError) {
        // Handle unique constraint violation (our new unique_user_subject_normalized)
        if (insertError.code === '23505') {
          const { data: existingData } = await supabase
            .from('subjects')
            .select('*')
            .eq('user_id', user.id)
            .eq('name_normalized', normalizedName)
            .single();
            
          const existingSubject = existingData as Subject | null;
          if (existingSubject) {
            setSubjects(prev => {
              if (prev.some(s => s.id === existingSubject.id)) return prev;
              return [...prev, existingSubject].sort((a, b) => a.name.localeCompare(b.name));
            });
            return existingSubject;
          }
          return null;
        }
        throw insertError;
      }

      const created = data as Subject;
      if (created) {
        setSubjects(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to create subject:', err);
      setError('Failed to create subject');
      return null;
    }
  }, [supabase, subjects]);

  const ensureCanonicalDSASubject = useCallback(async (): Promise<Subject | null> => {
    return await createSubject('DSA');
  }, [createSubject]);

  return { subjects, loading, error, createSubject, ensureCanonicalDSASubject, refetch: fetchSubjects };
}
