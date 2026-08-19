'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';

export default function DSAStatsPage() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('problem_attempts')
        .select('*, problems(title, platform, difficulty, topic)')
        .order('started_at', { ascending: false });

      setAttempts(data || []);
    } catch (err) {
      console.error('Failed to fetch DSA stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const stats = useMemo(() => {
    const total = attempts.length;
    const solved = attempts.filter(a => a.result === 'solved');
    const failed = attempts.filter(a => a.result === 'failed');
    const abandoned = attempts.filter(a => a.result === 'abandoned');
    
    const successRate = total > 0 ? Math.round((solved.length / total) * 100) : 0;
    
    const totalDuration = attempts.reduce((acc, a) => acc + (a.duration_seconds || 0), 0);
    const avgDuration = total > 0 ? Math.floor(totalDuration / total) : 0;
    const avgSolvedDuration = solved.length > 0 ? Math.floor(solved.reduce((acc, a) => acc + (a.duration_seconds || 0), 0) / solved.length) : 0;

    const noHintSolved = solved.filter(a => !a.hint_used && !a.editorial_used).length;

    // Aggregate by Platform
    const platformMap = new Map<string, { total: number, solved: number, duration: number }>();
    attempts.forEach(a => {
      const plat = a.problems?.platform || 'Unknown';
      const curr = platformMap.get(plat) || { total: 0, solved: 0, duration: 0 };
      curr.total++;
      if (a.result === 'solved') curr.solved++;
      curr.duration += (a.duration_seconds || 0);
      platformMap.set(plat, curr);
    });

    // Aggregate by Topic
    const topicMap = new Map<string, { total: number, solved: number }>();
    attempts.forEach(a => {
      const topic = a.problems?.topic || 'Uncategorized';
      if (!topic.trim()) return;
      const curr = topicMap.get(topic) || { total: 0, solved: 0 };
      curr.total++;
      if (a.result === 'solved') curr.solved++;
      topicMap.set(topic, curr);
    });

    // Aggregate by Difficulty
    const diffMap = new Map<string, { total: number, solved: number, duration: number }>();
    attempts.forEach(a => {
      const diff = a.problems?.difficulty || 'Unknown';
      const curr = diffMap.get(diff) || { total: 0, solved: 0, duration: 0 };
      curr.total++;
      if (a.result === 'solved') curr.solved++;
      curr.duration += (a.duration_seconds || 0);
      diffMap.set(diff, curr);
    });

    return {
      total,
      solved: solved.length,
      failed: failed.length,
      abandoned: abandoned.length,
      successRate,
      avgDuration,
      avgSolvedDuration,
      noHintSolved,
      platforms: Array.from(platformMap.entries()).sort((a, b) => b[1].total - a[1].total),
      topics: Array.from(topicMap.entries()).sort((a, b) => b[1].total - a[1].total),
      difficulties: Array.from(diffMap.entries()),
    };
  }, [attempts]);

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3 text-text-muted">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p>Loading DSA analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6 overflow-y-auto w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">DSA Analytics</h1>
        <Link 
          href="/stats"
          className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          View Study Stats →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Attempts" value={stats.total.toString()} />
        <StatCard label="Solved" value={stats.solved.toString()} textClass="text-green-500" />
        <StatCard label="Success Rate" value={`${stats.successRate}%`} />
        <StatCard label="Avg Solving Time" value={formatDuration(stats.avgSolvedDuration)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Platforms */}
        <div className="bg-bg-elevated border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Platform Performance</h2>
          <div className="space-y-4">
            {stats.platforms.map(([name, data]) => {
              const rate = Math.round((data.solved / data.total) * 100);
              const avg = data.total > 0 ? Math.floor(data.duration / data.total) : 0;
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-text-primary">{name}</span>
                    <span className="text-text-muted">{rate}% Solved ({data.solved}/{data.total}) - Avg {formatDuration(avg)}</span>
                  </div>
                  <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.platforms.length === 0 && <p className="text-sm text-text-muted text-center py-4">No data yet</p>}
          </div>
        </div>

        {/* Difficulties */}
        <div className="bg-bg-elevated border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Difficulty Performance</h2>
          <div className="space-y-4">
            {stats.difficulties.map(([name, data]) => {
              const rate = Math.round((data.solved / data.total) * 100);
              const color = name === 'Easy' ? 'bg-green-500' : name === 'Medium' ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-text-primary">{name}</span>
                    <span className="text-text-muted">{rate}% Solved</span>
                  </div>
                  <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color} rounded-full`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.difficulties.length === 0 && <p className="text-sm text-text-muted text-center py-4">No data yet</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Topics */}
        <div className="bg-bg-elevated border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Topic Mastery</h2>
          <div className="space-y-3">
            {stats.topics.slice(0, 8).map(([name, data]) => {
              const rate = Math.round((data.solved / data.total) * 100);
              return (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-text-primary truncate pr-4">{name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-text-muted w-8 text-right">{rate}%</span>
                    <div className="w-16 h-1.5 bg-bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {stats.topics.length === 0 && <p className="text-sm text-text-muted text-center py-4">No data yet</p>}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-bg-elevated border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Insights</h2>
          <div className="flex-1 space-y-4">
            <div className="p-3 bg-bg-surface rounded-xl border border-border/40">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Independence</h3>
              <p className="text-sm text-text-primary">
                You solved <span className="font-semibold text-accent">{stats.noHintSolved}</span> problems completely on your own without hints or editorials.
              </p>
            </div>
            
            <div className="p-3 bg-bg-surface rounded-xl border border-border/40">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Persistence</h3>
              <p className="text-sm text-text-primary">
                You have <span className="font-semibold text-red-400">{stats.failed}</span> failed attempts and <span className="font-semibold text-orange-400">{stats.abandoned}</span> abandoned attempts. Keep pushing!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, textClass = "text-text-primary" }: { label: string, value: string, textClass?: string }) {
  return (
    <div className="bg-bg-elevated border border-border/50 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
      <span className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-bold ${textClass}`}>{value}</span>
    </div>
  );
}
