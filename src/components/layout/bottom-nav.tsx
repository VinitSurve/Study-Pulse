'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTimerContext } from '@/components/providers/timer-provider';
import { formatTimerDisplay } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        {!active && <polyline points="9 22 9 12 15 12 15 22" />}
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Stats',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'History',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
  },
];

import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';

export function BottomNav() {
  const pathname = usePathname();
  const { timerState, displaySeconds, isRunning, isPaused } = useTimerContext();
  const { 
    timerState: problemState, 
    displaySeconds: problemSeconds, 
    isRunning: isProblemRunning, 
    isPaused: isProblemPaused 
  } = useProblemTimerContext();

  const hasActiveTimer = timerState && (isRunning || isPaused);
  const hasActiveProblem = problemState && (isProblemRunning || isProblemPaused);

  return (
    <>
      {/* Active Problem Timer mini bar (displays above Study Timer if both exist) */}
      {hasActiveProblem && pathname !== '/timer' && (
        <Link
          href="/timer"
          className={`fixed left-3 right-3 z-40 bg-bg-surface border border-accent/30 rounded-2xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-all safe-bottom ${
            hasActiveTimer ? 'bottom-[126px]' : 'bottom-[68px]'
          }`}
        >
          <div className="flex items-center gap-3 truncate pr-4">
            <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isProblemRunning ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
            <span className="text-sm font-medium text-text-primary truncate">
              {problemState.problemTitle}
            </span>
          </div>
          <span className="shrink-0 font-mono text-sm font-semibold text-accent tabular-nums">
            {formatTimerDisplay(problemSeconds)}
          </span>
        </Link>
      )}

      {/* Active Study Timer mini bar */}
      {hasActiveTimer && pathname !== '/timer' && (
        <Link
          href="/timer"
          className="fixed bottom-[68px] left-3 right-3 z-40 bg-bg-elevated border border-border rounded-2xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-transform safe-bottom"
        >
          <div className="flex items-center gap-3 truncate pr-4">
            <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
            <span className="text-sm font-medium text-text-primary truncate">{timerState.subjectName}</span>
          </div>
          <span className="shrink-0 font-mono text-sm font-semibold text-accent tabular-nums">
            {formatTimerDisplay(displaySeconds)}
          </span>
        </Link>
      )}

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/90 backdrop-blur-xl border-t border-border safe-bottom"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 min-w-[64px] transition-colors ${
                  active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                }`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                {icon(active)}
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
