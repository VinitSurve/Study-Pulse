'use client';

import React, { createContext, useContext } from 'react';
import { useProblemTimer } from '@/hooks/use-problem-timer';

type ProblemTimerContextType = ReturnType<typeof useProblemTimer>;

const ProblemTimerContext = createContext<ProblemTimerContextType | null>(null);

export function ProblemTimerProvider({ children }: { children: React.ReactNode }) {
  const timer = useProblemTimer();
  return (
    <ProblemTimerContext.Provider value={timer}>
      {children}
    </ProblemTimerContext.Provider>
  );
}

export function useProblemTimerContext(): ProblemTimerContextType {
  const context = useContext(ProblemTimerContext);
  if (!context) {
    throw new Error('useProblemTimerContext must be used within a ProblemTimerProvider');
  }
  return context;
}
