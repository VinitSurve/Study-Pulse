'use client';

import React, { createContext, useContext } from 'react';
import { useTimer } from '@/hooks/use-timer';

type TimerContextType = ReturnType<typeof useTimer>;

const TimerContext = createContext<TimerContextType | null>(null);

import { useEffect } from 'react';
import { BridgeCommandMessageSchema, BridgeTimerStateMessage } from '@/lib/timer/bridge-schema';

import { useProblemTimer } from '@/hooks/use-problem-timer';

import { getElapsedSeconds } from '@/lib/timer/engine';

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const timer = useTimer();
  const problemTimer = useProblemTimer();

  // 1. Broadcast state to extension
  useEffect(() => {
    if (!timer.timerState) return;

    const message: BridgeTimerStateMessage = {
      source: 'studypulse-pwa',
      type: 'TIMER_STATE',
      version: 1,
      payload: {
        study: {
          status: timer.timerState.status as any,
          startTime: timer.timerState.startedAt,
          accumulatedTime: getElapsedSeconds(timer.timerState),
          mode: timer.timerState.mode as any,
          duration: timer.timerState.plannedDurationSeconds,
        },
        dsa: problemTimer.timerState ? {
          status: problemTimer.timerState.status as any,
          startTime: problemTimer.timerState.startedAt,
          accumulatedTime: getElapsedSeconds(problemTimer.timerState as any),
        } : {
          status: 'idle',
          startTime: null,
          accumulatedTime: 0
        }
      }
    };
    window.postMessage(message, window.location.origin);
  }, [timer.timerState, problemTimer.timerState]);

  // 2. Listen for extension commands
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security Validation
      if (event.source !== window || event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data || data.source !== 'studypulse-ext') return;

      const result = BridgeCommandMessageSchema.safeParse(data);
      if (!result.success) return; // Invalid schema, ignore

      const cmd = result.data;
      switch (cmd.type) {
        case 'PAUSE_STUDY_TIMER':
          timer.pause();
          break;
        case 'RESUME_STUDY_TIMER':
          timer.resume();
          break;
        case 'STOP_STUDY_TIMER':
          timer.stop();
          break;
        case 'PAUSE_DSA_TIMER':
          problemTimer.pause();
          break;
        case 'RESUME_DSA_TIMER':
          problemTimer.resume();
          break;
        case 'STOP_DSA_TIMER':
          problemTimer.cancel();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [timer]);

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
