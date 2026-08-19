'use client';

import { useState } from 'react';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';
import { useTimerContext } from '@/components/providers/timer-provider';
import { useSubjects } from '@/hooks/use-subjects';

interface StartProblemProps {
  onClose: () => void;
}

export function StartProblem({ onClose }: StartProblemProps) {
  const [title, setTitle] = useState('');
  const [platformOption, setPlatformOption] = useState('LeetCode');
  const [customPlatform, setCustomPlatform] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [topic, setTopic] = useState('');
  
  const { start } = useProblemTimerContext();
  const { timerState: studyTimerState } = useTimerContext();
  const { ensureCanonicalDSASubject } = useSubjects();

  const finalPlatform = platformOption === 'Other' ? customPlatform : platformOption;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !finalPlatform.trim()) return;

    // Start problem with current study session if active
    start(
      title.trim(),
      finalPlatform.trim(),
      difficulty,
      topic.trim(),
      studyTimerState?.id || null
    );

    // Fire-and-forget: ensure the canonical DSA subject exists in the background
    // so that the analytics/history pages will have "DSA" as a valid subject entity
    // for all these problem attempts.
    void ensureCanonicalDSASubject();

    // Open problem timer
    window.dispatchEvent(new Event('open_problem_timer'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 pb-0">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative w-full max-w-md bg-bg-elevated rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/50 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 max-h-[90vh] flex flex-col">
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3 sm:hidden shrink-0" />
        
        <div className="px-6 pt-6 pb-safe overflow-y-auto">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Start Problem</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="problem-title" className="block text-sm font-medium text-text-secondary mb-1.5">
                Problem Title
              </label>
              <input
                id="problem-title"
                type="text"
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Two Sum"
                className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label htmlFor="problem-platform" className="block text-sm font-medium text-text-secondary mb-1.5">
                Platform
              </label>
              <div className="space-y-2">
                <select
                  id="problem-platform"
                  value={platformOption}
                  onChange={(e) => setPlatformOption(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none"
                >
                  <option value="LeetCode">LeetCode</option>
                  <option value="NeetCode">NeetCode</option>
                  <option value="HackerRank">HackerRank</option>
                  <option value="Codeforces">Codeforces</option>
                  <option value="CodeSignal">CodeSignal</option>
                  <option value="AtCoder">AtCoder</option>
                  <option value="CodeChef">CodeChef</option>
                  <option value="Other">Other...</option>
                </select>
                
                {platformOption === 'Other' && (
                  <input
                    type="text"
                    required
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    aria-label="Custom platform name"
                    placeholder="Enter platform name"
                    className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors animate-in fade-in slide-in-from-top-2"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="problem-difficulty" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Difficulty
                </label>
                <select
                  id="problem-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label htmlFor="problem-topic" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Topic (Optional)
                </label>
                <input
                  id="problem-topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Arrays"
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-bg-elevated pt-4 pb-6 mt-4 flex gap-3 border-t border-border/40">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-border/50 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !finalPlatform.trim()}
                className="flex-[2] py-3.5 bg-accent text-bg font-semibold rounded-xl hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-accent/10"
              >
                Start Timer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
