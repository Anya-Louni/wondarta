import { relay } from '../relay.mjs';

/** Grounded answers and rephrasing: Gemini generateContent, small replies only. */
export default (req, context) =>
  relay(req, context, {
    prefix: '/api/gemini',
    key: process.env.GEMINI_API_KEY,
    target: 'https://generativelanguage.googleapis.com/v1beta',
    pathOk: /^\/models\/gemini-[a-z0-9.-]+:generateContent$/,
    headers: (key) => ({ 'x-goog-api-key': key }),
    clamp: (body) => {
      body.generationConfig = body.generationConfig || {};
      body.generationConfig.maxOutputTokens = Math.min(Number(body.generationConfig.maxOutputTokens) || 300, 400);
    },
  });

export const config = { path: '/api/gemini/*' };
