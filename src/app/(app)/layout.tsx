'use client';

import { TimerProvider } from '@/components/providers/timer-provider';
import { ProblemTimerProvider } from '@/components/providers/problem-timer-provider';
import { BottomNav } from '@/components/layout/bottom-nav';
import { usePendingSync } from '@/hooks/use-pending-sync';

function AppShell({ children }: { children: React.ReactNode }) {
  // Sync any pending offline sessions
  usePendingSync();

  return (
    <>
      <main className="flex-1 pb-[140px]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TimerProvider>
      <ProblemTimerProvider>
        <AppShell>{children}</AppShell>
      </ProblemTimerProvider>
    </TimerProvider>
  );
}
