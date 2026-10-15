import { postJson } from './transport';

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant';

/** Groq (OpenAI-compatible). Chosen for very low latency: powers the mascot's voice. */
export async function groqChat(messages: ChatMsg[], maxTokens = 120): Promise<string> {
  const data = await postJson<{ choices: { message: { content: string } }[] }>('groq', '/chat/completions', {
    model: MODEL,
    messages,
    temperature: 0.6,
    max_tokens: maxTokens,
  });
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}
