import { z } from 'zod';

export const AIHintRequestSchema = z.object({
  problem: z.object({
    title: z.string().max(500, "Title is too long"),
    statement: z.string().max(10000, "Statement is too long"),
    constraints: z.array(z.string().max(2000, "Constraint is too long")).max(50, "Too many constraints").nullable().optional(),
    examples: z.array(
      z.object({
        input: z.string().max(2000),
        output: z.string().max(2000),
      })
    ).max(20).nullable().optional(),
  }),
  code: z.string().max(20000, "Code exceeds maximum allowed length of 20,000 characters"),
  language: z.string().max(50, "Language string too long").transform(l => l.toLowerCase()), // Allow any language string up to 50 chars, let Gemini handle the exact version semantics, but normalize to lowercase
  timer: z.object({
    elapsedSeconds: z.number().min(0),
  }).optional(),
  hintLevel: z.number().int().min(1).max(5),
});

export type AIHintRequest = z.infer<typeof AIHintRequestSchema>;

export const AIHintResponseSchema = z.object({
  hint: z.string(),
  hintLevel: z.number().int().min(1).max(5),
});

export type AIHintResponse = z.infer<typeof AIHintResponseSchema>;
