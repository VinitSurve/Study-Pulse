export interface AIContext {
  subject?: string;
  platform?: string;
  title?: string;
  difficulty?: string;
  topic?: string;
  duration?: number;
  attemptNumber?: number;
  hintLevel?: number;
}

export interface AIResponse {
  type?: 'motivation' | 'fact' | 'joke' | 'tool_tip';
  content?: string;
  level?: number;
  question?: string;
  explanation?: string | null;
  error?: string;
}

// Global cooldown tracker for automatic messages
let lastAutomaticFetch = 0;
const AUTOMATIC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchAutomaticAIContent(context: AIContext): Promise<AIResponse | null> {
  const now = Date.now();
  if (now - lastAutomaticFetch < AUTOMATIC_COOLDOWN_MS) {
    return null; // Enforce cooldown
  }

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'automatic',
        context,
      }),
    });

    if (!res.ok) {
      throw new Error('AI request failed');
    }

    const data: AIResponse = await res.json();
    if (data && !data.error) {
      lastAutomaticFetch = now; // Update cooldown only on success
      return data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch automatic AI content:', error);
    return null;
  }
}

export async function fetchAIHint(context: AIContext): Promise<AIResponse | null> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'hint',
        context,
      }),
    });

    if (!res.ok) {
      throw new Error('AI request failed');
    }

    const data: AIResponse = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch AI hint:', error);
    return null;
  }
}
