'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubjects } from '@/hooks/use-subjects';
import { useTimerContext } from '@/components/providers/timer-provider';
import { DURATION_PRESETS } from '@/lib/constants';
import type { TimerMode } from '@/types';

interface StartSessionProps {
  onClose: () => void;
}

type Step = 'subject' | 'mode' | 'duration';

export function StartSession({ onClose }: StartSessionProps) {
  const [step, setStep] = useState<Step>('subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedMode, setSelectedMode] = useState<TimerMode | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { subjects, loading: subjectsLoading, createSubject } = useSubjects();
  const { start } = useTimerContext();
  const router = useRouter();

  const handleSelectSubject = (id: string, name: string) => {
    setSelectedSubjectId(id);
    setSelectedSubjectName(name);
    setStep('mode');
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    setIsCreating(true);
    const subject = await createSubject(newSubjectName.trim());
    setIsCreating(false);
    if (subject) {
      handleSelectSubject(subject.id, subject.name);
      setNewSubjectName('');
    }
  };

  const handleSelectMode = (mode: TimerMode) => {
    setSelectedMode(mode);
    if (mode === 'until_stop') {
      // Start immediately
      handleStart(mode);
    } else {
      setStep('duration');
    }
  };

  const handleStart = (mode?: TimerMode, durationSeconds?: number) => {
    const m = mode || selectedMode!;
    start(selectedSubjectId!, selectedSubjectName, m, durationSeconds);
    onClose();
    router.push('/timer');
  };

  const handleCustomDuration = () => {
    const mins = parseInt(customMinutes);
    if (mins > 0 && mins <= 480) {
      handleStart('timed', mins * 60);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Start study session">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-bg-surface rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[85dvh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center mb-4 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Back / Close */}
        <div className="flex items-center justify-between mb-6">
          {step !== 'subject' ? (
            <button
              onClick={() => setStep(step === 'duration' ? 'mode' : 'subject')}
              className="text-text-secondary hover:text-text-primary p-1 -ml-1 transition-colors"
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 -mr-1 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step 1: Subject */}
        {step === 'subject' && (
          <div>
            <h2 className="text-lg font-semibold mb-1">What are you studying?</h2>
            <p className="text-sm text-text-secondary mb-5">Pick a subject or create a new one</p>

            {/* Create new */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                placeholder="New subject…"
                className="flex-1 px-4 py-3 bg-bg border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 transition-colors text-sm"
                maxLength={50}
                aria-label="New subject name"
              />
              <button
                onClick={handleCreateSubject}
                disabled={!newSubjectName.trim() || isCreating}
                className="px-4 py-3 bg-accent text-bg font-medium rounded-xl text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Add
              </button>
            </div>

            {/* Subject list */}
            {subjectsLoading ? (
              <div className="text-center py-8 text-text-muted text-sm">Loading…</div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No subjects yet. Create one above.
              </div>
            ) : (
              <div className="space-y-1.5">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSelectSubject(subject.id, subject.name)}
                    className="w-full text-left px-4 py-3.5 rounded-xl bg-bg hover:bg-bg-hover text-text-primary transition-colors text-sm font-medium active:scale-[0.98]"
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Timer Mode */}
        {step === 'mode' && (
          <div>
            <h2 className="text-lg font-semibold mb-1">How do you want to study?</h2>
            <p className="text-sm text-text-secondary mb-5">
              Studying <span className="text-accent font-medium">{selectedSubjectName}</span>
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSelectMode('timed')}
                className="w-full text-left px-5 py-4 rounded-2xl bg-bg hover:bg-bg-hover border border-border transition-all active:scale-[0.98]"
              >
                <div className="font-medium text-text-primary">Set duration</div>
                <div className="text-sm text-text-secondary mt-0.5">Study for a fixed amount of time</div>
              </button>

              <button
                onClick={() => handleSelectMode('until_stop')}
                className="w-full text-left px-5 py-4 rounded-2xl bg-bg hover:bg-bg-hover border border-border transition-all active:scale-[0.98]"
              >
                <div className="font-medium text-text-primary">Until I stop</div>
                <div className="text-sm text-text-secondary mt-0.5">Open-ended study session</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Duration (only for timed) */}
        {step === 'duration' && (
          <div>
            <h2 className="text-lg font-semibold mb-1">How long?</h2>
            <p className="text-sm text-text-secondary mb-5">
              <span className="text-accent font-medium">{selectedSubjectName}</span> · Timed session
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {DURATION_PRESETS.map(({ label, seconds }) => (
                <button
                  key={seconds}
                  onClick={() => handleStart('timed', seconds)}
                  className="py-3.5 rounded-xl bg-bg hover:bg-bg-hover border border-border text-text-primary text-sm font-medium transition-all active:scale-95"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom duration */}
            <div className="flex gap-2">
              <input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomDuration()}
                placeholder="Custom (min)"
                min="1"
                max="480"
                className="flex-1 px-4 py-3 bg-bg border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 transition-colors text-sm"
                aria-label="Custom duration in minutes"
              />
              <button
                onClick={handleCustomDuration}
                disabled={!customMinutes || parseInt(customMinutes) < 1}
                className="px-5 py-3 bg-accent text-bg font-medium rounded-xl text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Start
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
