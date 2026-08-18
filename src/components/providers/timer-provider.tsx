'use client';

import React, { createContext, useContext } from 'react';
import { useTimer } from '@/hooks/use-timer';

type TimerContextType = ReturnType<typeof useTimer>;

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const timer = useTimer();
  return (
    <TimerContext.Provider value={timer}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
}
