import { z } from 'zod';

export const PWA_ORIGIN = 'http://localhost:3000'; // In prod, we'd check against actual domain

// 1. Timer State Broadcast (PWA -> Ext)

export const TimerStatePayloadSchema = z.object({
  status: z.enum(['idle', 'running', 'paused', 'completed']),
  startTime: z.number().nullable(),
  accumulatedTime: z.number(),
  mode: z.enum(['timed', 'stopwatch', 'flow']).optional(),
  duration: z.number().optional(),
});

export const BridgeTimerStateMessageSchema = z.object({
  source: z.literal('studypulse-pwa'),
  type: z.literal('TIMER_STATE'),
  version: z.literal(1),
  payload: z.object({
    study: TimerStatePayloadSchema,
    dsa: TimerStatePayloadSchema,
  }),
});

export type BridgeTimerStateMessage = z.infer<typeof BridgeTimerStateMessageSchema>;

// 2. Command Flow (Ext -> PWA)

export const BridgeCommandMessageSchema = z.object({
  source: z.literal('studypulse-ext'),
  type: z.enum([
    'PAUSE_STUDY_TIMER', 
    'RESUME_STUDY_TIMER', 
    'STOP_STUDY_TIMER',
    'PAUSE_DSA_TIMER',
    'RESUME_DSA_TIMER',
    'STOP_DSA_TIMER'
  ]),
  version: z.literal(1),
});

export type BridgeCommandMessage = z.infer<typeof BridgeCommandMessageSchema>;
