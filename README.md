# StudyPulse

A lightweight, minimal Progressive Web Application (PWA) designed to track your study sessions. 
Built with a focus on speed, privacy, and an distraction-free experience.

## Features

- **Blazing Fast Sessions:** Start a timer in just a few taps. No complex setup or unnecessary productivity bloat.
- **Timestamp-Based Accuracy:** The timer engine relies on strict timestamps rather than JavaScript intervals, ensuring absolute accuracy even when the app is in the background or the device is asleep.
- **Offline Resilience:** Complete PWA support with a Service Worker. If you finish a study session while offline, it is saved locally and automatically synced to the cloud when you reconnect.
- **Analytics & History:** Visual calendar grids and CSS-only weekly charts to track your study intensity and subject breakdown.
- **Dark Mode First:** A beautiful, focus-oriented dark mode aesthetic using Tailwind CSS v4.
- **Secure Authentication:** User authentication and Row Level Security (RLS) powered by Supabase.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Language:** TypeScript

## Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/VinitSurve/Study-Pulse.git
cd Study-Pulse/study-pulse
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Supabase
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL migration located in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor. This will set up the necessary tables (`profiles`, `subjects`, `study_sessions`), relationships, and strict Row Level Security (RLS) policies.

### 4. Configure Environment Variables
Copy the example environment file and fill in your Supabase details:
```bash
cp .env.local.example .env.local
```
Inside `.env.local`, set:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Project Anon Key

### 5. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture & Future Proofing

The timer state is deeply decoupled from the UI and strictly persisted in `localStorage`. This architecture explicitly anticipates a future where the PWA can be wrapped in Capacitor/TWA to launch a native Android Foreground Service, reading this state to project a `TYPE_APPLICATION_OVERLAY` floating timer.

## License
MIT
