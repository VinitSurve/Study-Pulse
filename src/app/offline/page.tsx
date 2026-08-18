export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-bg">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-surface mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <line x1="1" x2="23" y1="1" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" x2="12.01" y1="20" y2="20" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">You&apos;re offline</h1>
        <p className="text-sm text-text-muted">
          Check your connection and try again.
          <br />
          Your active timer is still running locally.
        </p>
      </div>
    </div>
  );
}
