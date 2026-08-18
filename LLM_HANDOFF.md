# StudyPulse — AI Context & Handoff Document

**To the AI reading this:** You are acting as a senior full-stack developer working on "StudyPulse," a minimal, lightweight Progressive Web App (PWA) for study tracking. This document contains the entire architectural context of the application. Please adhere strictly to the rules and paradigms outlined below to avoid breaking the application.

## 1. Project Philosophy
- **Core Mission:** A blazing fast study stopwatch. It is NOT a complex productivity platform. The primary goal is: "Start a timer fast, leave the app, come back, and see accurate time."
- **Design Aesthetic:** Dark mode first (`#0f1117` background, `#f59e0b` amber accents). Focus-oriented, minimal UI. No heavy UI libraries—just Tailwind CSS.

## 2. Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (imported via `@import "tailwindcss";` in `globals.css`)
- **Backend / Auth:** Supabase (PostgreSQL, Row Level Security, SSR cookies)
- **Hosting Target:** Vercel / PWA

## 3. Database Schema (Supabase)
The database relies on strict Row Level Security (RLS). All API calls from the browser use the user's JWT to enforce access.

**Tables:**
1. `profiles`: (id, display_name, created_at) — created via a trigger on `auth.users` insertion.
2. `subjects`: (id, user_id, name, created_at)
3. `study_sessions`: (id, user_id, subject_id, started_at, ended_at, duration_seconds, mode, planned_duration_seconds, status, created_at)

**RLS Policy Note:** 
All `INSERT` and `UPDATE` policies use `WITH CHECK (auth.uid() = user_id)` to prevent malicious cross-user writes. `SELECT` uses `USING (auth.uid() = user_id)`.

## 4. Core Architectures & Critical Logic

### A. The Timer Engine (`src/lib/timer/engine.ts`)
**CRITICAL RULE:** The timer does *not* rely on `setInterval` or `setTimeout` to track time. 
- Time is tracked purely via ISO timestamps (`startedAt`, `pausedAt`) and an accumulated integer (`totalPausedMs`).
- This ensures absolute accuracy even if the browser throttles JavaScript execution, the phone screen turns off, or the app is killed.
- The state is constantly flushed to `localStorage`.
- The `useTimer` hook (`src/hooks/use-timer.ts`) uses an interval *only* to update the visual UI display, never to mutate the source of truth.

### B. Offline Resilience & Sync (`src/lib/timer/pending.ts`)
Because this is a PWA designed for mobile devices, network drops are expected.
- If a user completes a timer and the Supabase save fails (e.g., offline), the session is pushed to an offline queue in `localStorage` (`pending_sessions`).
- A globally mounted hook (`usePendingSync` inside `layout.tsx`) checks this queue on load and when the `online` window event fires.
- It attempts to sync the sessions back to Supabase using an `upsert` with a pre-generated client-side UUID to guarantee idempotency.

### C. Service Worker & PWA (`public/sw.js`)
- We use a custom, lightweight Service Worker instead of heavy plugins like `next-pwa` (to avoid Turbopack/Webpack conflicts).
- **Caching Strategy:**
  - `GET` Navigation requests: Network-first, fallback to cache, fallback to `/offline`.
  - Static Assets (CSS, JS, Fonts): Cache-first.
  - API Calls (Supabase): Specifically excluded from caching (always network).

### D. Supabase Types & Prerendering
- The app uses explicit type assertions instead of the brittle generated `Database` generic because passing the generic caused massive `never` type-inference failures in TypeScript.
- **SSR Fallbacks:** In `src/lib/supabase/client.ts` and `server.ts`, we provide dummy fallback strings for the environment variables (`|| 'http://localhost:54321'`). This prevents Next.js from throwing errors during build-time static prerendering of client components.

## 5. File Structure
```text
/public
  sw.js               # Service Worker
  manifest.webmanifest # PWA configuration
/src
  /app
    /(app)            # Protected routes (Dashboard, Timer, Stats, Calendar)
    /auth             # Auth callbacks
    /login            # Public auth pages
    globals.css       # Tailwind v4 configuration + variables
  /components
    /layout           # AppShell, BottomNav
    /providers        # TimerProvider, SWRegistration
    /timer            # StartSession modal (z-[60] to overlay nav)
  /hooks
    use-timer.ts      # UI hook for the timer engine
    use-pending-sync.ts
    use-sessions.ts   # Fetches history/stats
  /lib
    /supabase         # SSR and Browser Supabase clients
    /timer            # Pure functions for timer math & offline queue
    utils.ts          # Formatting & local timezone math
```

## 6. Current Development Status
- **Phase:** Initial MVP is complete. Authentication, timer engine, offline sync, dashboard, calendar, and statistics are implemented.
- **Future Native App:** The `localStorage` timer architecture is explicitly designed so that if this PWA is later wrapped in Capacitor/TWA, a native Android Foreground Service can read the exact same data to launch a floating `TYPE_APPLICATION_OVERLAY` timer. Keep `localStorage` as the source of truth for active timers.
