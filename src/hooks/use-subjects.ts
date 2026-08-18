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

    // Check for duplicate locally first
    const existing = subjects.find(
      s => s.name.toLowerCase() === trimmed.toLowerCase()
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
        .single();

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === '23505') {
          const { data: existingData } = await supabase
            .from('subjects')
            .select('*')
            .eq('name', trimmed)
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

  return { subjects, loading, error, createSubject, refetch: fetchSubjects };
}
