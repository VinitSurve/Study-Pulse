/**
 * Pending session storage for offline resilience.
 *
 * When a completed session cannot be saved to Supabase (e.g., network failure),
 * it's stored locally and synced when connectivity returns.
 *
 * Uses the session's pre-generated UUID as an idempotency key —
 * the same session cannot be uploaded twice because of the PRIMARY KEY constraint.
 */

import type { PendingSession } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * Get all pending sessions from localStorage.
 */
export function getPendingSessions(): PendingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw) as PendingSession[];
  } catch {
    return [];
  }
}

/**
 * Add a session to the pending queue.
 * Checks for duplicates by ID to ensure idempotency.
 */
export function addPendingSession(session: PendingSession): void {
  try {
    const pending = getPendingSessions();
    // Don't add if already pending (idempotency)
    if (pending.some(s => s.id === session.id)) return;
    pending.push(session);
    localStorage.setItem(STORAGE_KEYS.PENDING_SESSIONS, JSON.stringify(pending));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Remove a session from the pending queue (after successful sync).
 */
export function removePendingSession(sessionId: string): void {
  try {
    const pending = getPendingSessions().filter(s => s.id !== sessionId);
    if (pending.length === 0) {
      localStorage.removeItem(STORAGE_KEYS.PENDING_SESSIONS);
    } else {
      localStorage.setItem(STORAGE_KEYS.PENDING_SESSIONS, JSON.stringify(pending));
    }
  } catch {
    // fail silently
  }
}

/**
 * Clear all pending sessions.
 */
export function clearPendingSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_SESSIONS);
  } catch {
    // fail silently
  }
}
