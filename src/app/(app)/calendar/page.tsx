'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';
import type { StudySessionWithSubject } from '@/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DayData {
  date: number;
  totalSeconds: number;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthData, setMonthData] = useState<Map<number, number>>(new Map());
  const [daySessionsData, setDaySessionsData] = useState<StudySessionWithSubject[]>([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch month data
  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const { data } = await supabase
        .from('study_sessions')
        .select('started_at, duration_seconds')
        .eq('status', 'completed')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString());

      const map = new Map<number, number>();
      (data || []).forEach((session: any) => {
        // Use the user's local timezone for day bucketing
        const d = new Date(session.started_at);
        const day = d.getDate();
        map.set(day, (map.get(day) || 0) + (session.duration_seconds || 0));
      });
      setMonthData(map);
    } catch (err) {
      console.error('Failed to fetch month data:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Fetch day detail
  const fetchDaySessions = useCallback(async (date: Date) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const { data } = await supabase
        .from('study_sessions')
        .select('*, subjects(name)')
        .eq('status', 'completed')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .order('started_at', { ascending: false });

      setDaySessionsData((data as StudySessionWithSubject[]) || []);
    } catch (err) {
      console.error('Failed to fetch day sessions:', err);
    }
  }, []);

  const handleSelectDate = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    fetchDaySessions(date);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  // Calendar grid calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based: Mon=0, Tue=1, ..., Sun=6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Max study time for intensity scaling
  const maxSeconds = Math.max(...Array.from(monthData.values()), 1);

  const getIntensity = (seconds: number): string => {
    if (seconds === 0) return '';
    const ratio = seconds / maxSeconds;
    if (ratio > 0.7) return 'bg-accent';
    if (ratio > 0.4) return 'bg-accent/60';
    return 'bg-accent/30';
  };

  // Subject breakdown for selected day
  const dayBreakdown = (() => {
    const map = new Map<string, number>();
    daySessionsData.forEach(s => {
      const name = s.subjects?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + (s.duration_seconds || 0));
    });
    return Array.from(map.entries())
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds);
  })();

  const dayTotal = daySessionsData.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

  return (
    <div className="px-5 pt-14 pb-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Previous month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">
          {MONTHS[month]} {year}
        </h1>
        <button
          onClick={nextMonth}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Next month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-bg-surface rounded-2xl p-4 mb-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs text-text-muted font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const seconds = monthData.get(day) || 0;
            const isToday = isCurrentMonth && today.getDate() === day;
            const isSelected = selectedDate?.getDate() === day &&
              selectedDate?.getMonth() === month &&
              selectedDate?.getFullYear() === year;

            return (
              <button
                key={day}
                onClick={() => handleSelectDate(day)}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all relative
                  ${isSelected ? 'bg-accent/20 border border-accent/40' : 'hover:bg-bg-hover'}
                  ${isToday ? 'font-bold text-accent' : 'text-text-primary'}
                `}
                aria-label={`${MONTHS[month]} ${day}, ${seconds > 0 ? formatDuration(seconds) + ' studied' : 'no study data'}`}
              >
                <span>{day}</span>
                {seconds > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getIntensity(seconds)}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="bg-bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
            </h2>
            {dayTotal > 0 && (
              <span className="text-sm font-mono text-accent tabular-nums">
                {formatDuration(dayTotal)}
              </span>
            )}
          </div>

          {dayBreakdown.length === 0 ? (
            <p className="text-sm text-text-muted">No sessions this day.</p>
          ) : (
            <div className="space-y-2">
              {dayBreakdown.map(({ name, seconds }) => (
                <div key={name} className="flex items-center justify-between py-2">
                  <span className="text-sm text-text-primary">{name}</span>
                  <span className="text-sm font-mono text-text-secondary tabular-nums">
                    {formatDuration(seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-4 text-text-muted text-sm">Loading…</div>
      )}
    </div>
  );
}
