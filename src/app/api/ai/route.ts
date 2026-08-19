import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const AUTOMATIC_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['motivation', 'fact', 'joke', 'tool_tip'] },
    content: { type: Type.STRING },
  },
  required: ['type', 'content'],
};

const HINT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    level: { type: Type.INTEGER },
    question: { type: Type.STRING },
    explanation: { type: Type.STRING, nullable: true },
  },
  required: ['level', 'question'],
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 503 });
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const body = await req.json();
    const { requestType, context } = body;

    if (!requestType || !context) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let systemInstruction = '';
    let prompt = '';
    let responseSchema: Schema;

    if (requestType === 'automatic') {
      systemInstruction = `You are a helpful Computer Science / DSA study coach. The user is currently studying.
Generate a short, lightweight message (1-2 sentences).
Types allowed: motivation, fact, joke, tool_tip.
CRITICAL RULE: DO NOT provide hints, solutions, or algorithms for their current problem. Keep it generic to the subject or encouraging. Use very simple, conversational English.`;
      
      prompt = `Context:
Subject/Topic: ${context.subject || 'Unknown'}
Platform: ${context.platform || 'N/A'}
Title: ${context.title || 'N/A'}
Difficulty: ${context.difficulty || 'N/A'}
Time elapsed: ${context.duration || 0} seconds

Generate an automatic message for the user.`;
      
      responseSchema = AUTOMATIC_SCHEMA;
    } else if (requestType === 'hint') {
      systemInstruction = `You are a friendly DSA teacher helping a student.
You must use very simple English. Use short sentences. One idea per sentence.
Use words like "check", "use", and "try this". DO NOT use formal words like "therefore", "iterate", "utilize", or "consider".
Do not sound like an exam. Do not write long paragraphs.
If giving an example, use actual simple numbers.

You will provide a hint based on the requested level (1 to 5).
Level 1 (Simple): Ask a simple question to get them started. (e.g. "What happens if you check every pair?")
Level 2 (Simpler): Give a simple direction. (e.g. "You can use two loops.")
Level 3 (Example): Give a tiny example with real numbers. Reduce the problem.
Level 4 (Concept): Explain the core concept without full code. (e.g. "Store each number in a HashMap as you go.")
Level 5 (Solution): Explain the complete approach simply, including why it works.

Strictly answer exactly for Level ${context.hintLevel || 1}. Never jump ahead.`;

      prompt = `Problem Context:
Title: ${context.title}
Platform: ${context.platform}
Difficulty: ${context.difficulty}
Topic: ${context.topic}
Elapsed time: ${context.duration} seconds
Previous attempts: ${context.attemptNumber - 1}

Generate a Level ${context.hintLevel || 1} hint following the exact rules.`;
      
      responseSchema = HINT_SCHEMA;
    } else {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('AI request timed out')), 10000);
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.7,
        },
      }),
      timeoutPromise
    ]) as any;

    clearTimeout(timeoutId!);

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from AI');
    }

    const json = JSON.parse(resultText);
    return NextResponse.json(json);

  } catch (error: any) {
    console.error('AI Request failed:', error);
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
