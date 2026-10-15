/**
 * Shared relay for the two free-tier LLM providers, used by the serverless
 * functions in this folder. The browser never sees a key: it posts to
 * /api/groq/... or /api/gemini/..., and the key is attached here.
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

export async function relay(req, res, { key, target, pathOk, headers, clamp }) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!key) return res.status(401).json({ error: 'provider not configured' });
  const path = '/' + String(req.query.path || '').replace(/^\/+/, '');
  if (!pathOk.test(path)) return res.status(404).json({ error: 'unknown path' });
  const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: 'slow down' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'bad json' });
  }
  if (JSON.stringify(body).length > 24_000) return res.status(413).json({ error: 'request too large' });
  clamp(body);

  try {
    const upstream = await fetch(target + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers(key) },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    const retry = upstream.headers.get('retry-after');
    if (retry) res.setHeader('retry-after', retry);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
}
