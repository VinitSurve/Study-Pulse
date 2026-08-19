'use client';

import { useState } from 'react';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';

interface CompleteProblemProps {
  onClose: () => void;
}

export function CompleteProblem({ onClose }: CompleteProblemProps) {
  const { stop, timerState } = useProblemTimerContext();
  
  const [result, setResult] = useState<'solved' | 'failed' | 'abandoned'>('solved');
  const [timeComplexity, setTimeComplexity] = useState('');
  const [spaceComplexity, setSpaceComplexity] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [editorialUsed, setEditorialUsed] = useState(false);
  const [notes, setNotes] = useState('');

  if (!timerState) {
    onClose();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await stop(result, {
      timeComplexity: timeComplexity.trim() || null,
      spaceComplexity: spaceComplexity.trim() || null,
      hintUsed,
      editorialUsed,
      notes: notes.trim() || null,
    });
    onClose();
    window.dispatchEvent(new Event('close_problem_timer'));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 pb-0">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative w-full max-w-md bg-bg-elevated rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/50 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300">
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3 sm:hidden" />
        
        <div className="px-6 pt-6 pb-safe max-h-[85vh] overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Complete Problem</h2>
            <p className="text-sm text-text-secondary mt-1">{timerState.problemTitle}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Result Selection */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResult('solved')}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-colors border ${
                  result === 'solved' 
                    ? 'bg-success/10 border-success/30 text-success' 
                    : 'bg-bg-surface border-border text-text-muted hover:text-text-secondary'
                }`}
              >
                Solved
              </button>
              <button
                type="button"
                onClick={() => setResult('failed')}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-colors border ${
                  result === 'failed' 
                    ? 'bg-error/10 border-error/30 text-error' 
                    : 'bg-bg-surface border-border text-text-muted hover:text-text-secondary'
                }`}
              >
                Couldn't Solve
              </button>
              <button
                type="button"
                onClick={() => setResult('abandoned')}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-colors border ${
                  result === 'abandoned' 
                    ? 'bg-accent/10 border-accent/30 text-accent' 
                    : 'bg-bg-surface border-border text-text-muted hover:text-text-secondary'
                }`}
              >
                Abandoned
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="time-complexity" className="block text-sm font-medium text-text-secondary mb-1.5">
                    Time Complexity
                  </label>
                  <input
                    id="time-complexity"
                    type="text"
                    value={timeComplexity}
                    onChange={(e) => setTimeComplexity(e.target.value)}
                    placeholder="e.g. O(n)"
                    className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors text-sm font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="space-complexity" className="block text-sm font-medium text-text-secondary mb-1.5">
                    Space Complexity
                  </label>
                  <input
                    id="space-complexity"
                    type="text"
                    value={spaceComplexity}
                    onChange={(e) => setSpaceComplexity(e.target.value)}
                    placeholder="e.g. O(1)"
                    className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-surface border border-border rounded-xl">
                <label htmlFor="hint-used" className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
                  <input 
                    id="hint-used"
                    type="checkbox" 
                    checked={hintUsed} 
                    onChange={(e) => setHintUsed(e.target.checked)} 
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-bg-elevated"
                  />
                  Used Hint
                </label>
                <label htmlFor="editorial-used" className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
                  <input 
                    id="editorial-used"
                    type="checkbox" 
                    checked={editorialUsed} 
                    onChange={(e) => setEditorialUsed(e.target.checked)} 
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-bg-elevated"
                  />
                  Viewed Solution
                </label>
              </div>

              <div>
                <label htmlFor="problem-notes" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Notes
                </label>
                <textarea
                  id="problem-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you learn?"
                  rows={3}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors text-sm resize-none"
                />
              </div>
            </div>

            <div className="pt-2 pb-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-border/50 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] py-3.5 bg-accent text-bg font-semibold rounded-xl hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-accent/10"
              >
                Save Attempt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
