/**
 * Shared relay for the two free-tier LLM providers, used by the functions in
 * netlify/functions. The browser never sees a key: it posts to /api/groq/...
 * or /api/gemini/..., and the key is attached here.
 *
 * It is deliberately narrow. Only the two calls the app makes are allowed,
 * the reply size is capped, and each visitor gets a small per-minute budget,
 * so a public demo link cannot be used as a free general-purpose LLM proxy.
 */
const WINDOW_MS = 60_000;
const PER_MINUTE = 20;
const hits = new Map(); // best effort: lives as long as the warm function instance

function allowed(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= PER_MINUTE) return false;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return true;
}

const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function relay(req, context, { prefix, key, target, pathOk, headers, clamp }) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  if (!key) return json(401, { error: 'provider not configured' });
  const path = new URL(req.url).pathname.slice(prefix.length) || '/';
  if (!pathOk.test(path)) return json(404, { error: 'unknown path' });
  if (!allowed(context.ip || 'local')) return json(429, { error: 'slow down' });

  const raw = await req.text();
  if (raw.length > 24_000) return json(413, { error: 'request too large' });
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json(400, { error: 'bad json' });
  }
  clamp(body);

  try {
    const upstream = await fetch(target + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers(key) },
      body: JSON.stringify(body),
    });
    const out = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    const retry = upstream.headers.get('retry-after');
    if (retry) out.set('retry-after', retry);
    return new Response(await upstream.text(), { status: upstream.status, headers: out });
  } catch {
    return json(502, { error: 'upstream unreachable' });
  }
}
