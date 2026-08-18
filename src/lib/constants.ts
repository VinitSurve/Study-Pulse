// Duration presets in seconds
export const DURATION_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '25 min', seconds: 25 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
] as const;

// localStorage keys
export const STORAGE_KEYS = {
  TIMER_STATE: 'study-pulse-timer',
  PENDING_SESSIONS: 'study-pulse-pending',
} as const;

// Default subjects for new users
export const DEFAULT_SUBJECTS = [
  'Python',
  'DSA',
  'DevOps',
  'React',
  'Java',
  'Database',
  'College',
] as const;
