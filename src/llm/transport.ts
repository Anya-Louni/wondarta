import { useApp } from '../state/store';

/**
 * Shared transport for both free-tier providers.
 *
 * - Dev: requests go to the Vite proxy (/api/groq, /api/gemini), which attaches
 *   keys server-side. Keys never reach the browser bundle.
 * - Deployed (Vercel): the serverless relay in /api attaches the keys, which
 *   are set as environment variables on the host and never shipped.
 * - Tauri / elsewhere: set window.__WONDARTA_API_BASE__ to your own relay.
 *   Without one, providers stay "unconfigured" and the mascot sleeps for LLM
 *   features. Scenes are unaffected.
 *
 * A client-side token bucket keeps us under each free tier's request rate, and
 * any 429 / quota response flips the provider to "exhausted", which is the
 * automatic trigger for the mascot's Sleep state.
 */

type Provider = 'groq' | 'gemini';

const LIMITS: Record<Provider, { perMinute: number }> = {
  groq: { perMinute: 25 }, // Groq free tier allows ~30 RPM on small Llama models
  gemini: { perMinute: 12 }, // Gemini free tier ~15 RPM; keep headroom
};

const buckets: Record<Provider, number[]> = { groq: [], gemini: [] };
const wakeTimers: Partial<Record<Provider, number>> = {};

function apiBase(): string | null {
  if (import.meta.env.DEV) return '/api';
  if (window.__WONDARTA_API_BASE__) return window.__WONDARTA_API_BASE__;
  // Deployed on the web with keys set at build time: the serverless relay in
  // /api holds them. From file:// (or Tauri without a relay) there is none.
  return location.protocol.startsWith('http') && (__HAS_GROQ__ || __HAS_GEMINI__) ? '/api' : null;
}

function takeToken(p: Provider): boolean {
  const now = Date.now();
  buckets[p] = buckets[p].filter((t) => now - t < 60_000);
  if (buckets[p].length >= LIMITS[p].perMinute) return false;
  buckets[p].push(now);
  return true;
}

function exhaust(p: Provider, ms: number) {
  useApp.getState().setProvider(p, 'exhausted');
  window.clearTimeout(wakeTimers[p]);
  wakeTimers[p] = window.setTimeout(() => useApp.getState().setProvider(p, 'ok'), ms);
}

export class LlmUnavailable extends Error {}

export async function postJson<T>(p: Provider, path: string, body: unknown, timeoutMs = 12_000): Promise<T> {
  const state = useApp.getState().providers[p];
  const base = apiBase();
  if (state !== 'ok' || !base) throw new LlmUnavailable(`${p} ${state}`);
  if (!takeToken(p)) {
    exhaust(p, 20_000); // brief nap until the per-minute window frees up
    throw new LlmUnavailable(`${p} rate limited (client)`);
  }
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/${p}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (res.status === 429 || res.status === 403) {
      const text = await res.text().catch(() => '');
      const daily = /per.?day|daily|quota/i.test(text);
      const retry = Number(res.headers.get('retry-after')) * 1000;
      exhaust(p, daily ? 60 * 60_000 : retry || 60_000);
      throw new LlmUnavailable(`${p} quota`);
    }
    if (res.status === 401) {
      useApp.getState().setProvider(p, 'unconfigured');
      throw new LlmUnavailable(`${p} not configured`);
    }
    if (!res.ok) throw new Error(`${p} HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}
