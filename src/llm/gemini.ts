import { postJson } from './transport';

const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const SAFETY = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' }));

/** Gemini free tier: grounded answers, "I want more!" variants, Learn More simplification. */
export async function geminiGenerate(system: string, user: string, opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const data = await postJson<{
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  }>('gemini', `/models/${MODEL}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    safetySettings: SAFETY,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: opts.maxTokens ?? 300,
      // keep "thinking" off: we want short, cheap, fast answers on the free tier
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  });
  if (data.promptFeedback?.blockReason) return 'UNSUITABLE';
  const c = data.candidates?.[0];
  if (!c || c.finishReason === 'SAFETY') return 'UNSUITABLE';
  return (c.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
}
