import { relay } from '../relay.mjs';

/** Wondoo's voice: Groq chat completions, small replies only. */
export default (req, context) =>
  relay(req, context, {
    prefix: '/api/groq',
    key: process.env.GROQ_API_KEY,
    target: 'https://api.groq.com/openai/v1',
    pathOk: /^\/chat\/completions$/,
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    clamp: (body) => {
      body.max_tokens = Math.min(Number(body.max_tokens) || 120, 200);
      body.stream = false;
    },
  });

export const config = { path: '/api/groq/*' };
