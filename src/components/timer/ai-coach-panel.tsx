'use client';

import { useState, useEffect } from 'react';
import { useTimerContext } from '@/components/providers/timer-provider';
import { useProblemTimerContext } from '@/components/providers/problem-timer-provider';
import { fetchAutomaticAIContent, fetchAIHint, AIResponse } from '@/lib/ai/client';

export function AICoachPanel() {
  const { timerState: studyTimer } = useTimerContext();
  const { timerState: problemTimer } = useProblemTimerContext();
  
  const [content, setContent] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    // Automatic fetching logic
    if (isOffline) return;
    if (!studyTimer && !problemTimer) return;

    const fetchAutomatic = async () => {
      try {
        const res = await fetchAutomaticAIContent({
          subject: studyTimer?.subjectName,
          title: problemTimer?.problemTitle,
          platform: problemTimer?.platform,
          difficulty: problemTimer?.difficulty,
        });
        if (res) {
          setContent(res);
        }
      } catch (err) {
        console.warn('Failed to fetch automatic AI content:', err);
      }
    };

    // Attempt to fetch right away (cooldown will protect us)
    void fetchAutomatic();

    // Check periodically
    const interval = setInterval(fetchAutomatic, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [studyTimer, problemTimer, isOffline]);

  const handleAskForHint = async () => {
    if (!problemTimer) return;
    if (isOffline) return;

    setIsLoading(true);
    const res = await fetchAIHint({
      title: problemTimer.problemTitle,
      platform: problemTimer.platform,
      difficulty: problemTimer.difficulty,
      topic: problemTimer.topic,
      duration: Math.floor(Date.now() - problemTimer.startedAt - problemTimer.totalPausedMs) / 1000,
      hintLevel: hintLevel,
    });
    
    setIsLoading(false);
    if (res) {
      setContent(res);
      if (hintLevel < 5) {
        setHintLevel(h => h + 1);
      }
    }
  };

  if (!studyTimer && !problemTimer) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-8 bg-bg-elevated border border-border/50 rounded-2xl p-4 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 12 2.1 12"/>
            <path d="M12 12 21.9 12"/>
          </svg>
          AI Coach
        </h3>
        {isOffline && (
          <span className="text-xs font-medium text-text-muted bg-bg-surface px-2 py-0.5 rounded-full">
            Offline
          </span>
        )}
      </div>

      <div className="min-h-[60px] flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            Thinking...
          </div>
        ) : content ? (
          <div className="animate-in fade-in duration-300">
            {content.question ? (
              <div className="space-y-2">
                <p className="text-sm text-text-primary leading-relaxed border-l-2 border-accent pl-3">
                  {content.question}
                </p>
                {content.explanation && (
                  <p className="text-sm text-text-secondary mt-2">
                    {content.explanation}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <span className="text-xl">
                  {content.type === 'motivation' ? '🔥' : 
                   content.type === 'joke' ? '😂' : 
                   content.type === 'fact' ? '💡' : '📌'}
                </span>
                <p className="text-sm text-text-primary leading-relaxed pt-0.5">
                  {content.content}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            {isOffline ? "AI coach unavailable while offline." : "Monitoring your progress..."}
          </p>
        )}
      </div>

      {/* Explicit Hint Action for DSA */}
      {problemTimer && !isOffline && (
        <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
          <button
            onClick={handleAskForHint}
            disabled={isLoading}
            className="text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {hintLevel === 1 ? 'Ask for Help' :
             hintLevel === 2 ? 'Think With Me' :
             hintLevel === 3 ? 'Give Me a Hint' :
             hintLevel === 4 ? 'Show Approach' : 'Explain Solution'}
          </button>
        </div>
      )}
    </div>
  );
}
