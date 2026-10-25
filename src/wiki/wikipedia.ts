import type { Lang } from '../types/content';
import { normalizeWord } from '../content/loader';

/**
 * Free Wikipedia APIs (no key). This is the ONLY retrieval source for
 * on-demand content: "Ask about anything" and Learn More grounding.
 * `origin=*` enables anonymous CORS on the Action API.
 */
export type Edition = Lang | 'simple';

export interface Retrieved {
  edition: Edition;
  title: string;
  text: string;
  url: string;
  /** Set when we had to fall back from the kid's language to English. */
  translatedFrom?: 'en' | 'simple';
}

/** "What is a rainbow?" -> "rainbow": search Wikipedia for the thing, not the question. */
const QUESTION_WORDS =
  /^(what|who|why|how|where|when|which|is|are|was|do|does|did|can|could|a|an|the|of|tell|me|about|work|works|made|make|qu|est|ce|que|qui|quoi|comment|pourquoi|où|quand|quel|quelle|quels|quelles|un|une|le|la|les|l|des|du|de|d|c|fonctionne|marche|ما|ماذا|من|لماذا|كيف|أين|متى|هو|هي|هل|عن|تعمل|يعمل)$/i;
export function topicOf(question: string): string {
  const words = question
    .replace(/[?؟!.,«»"“”]/g, ' ')
    .split(/[\s']+/)
    .filter(Boolean);
  const kept = words.filter((w) => !QUESTION_WORDS.test(w));
  return (kept.length ? kept : words).join(' ');
}

const host = (e: Edition) => `https://${e}.wikipedia.org`;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function search(e: Edition, q: string): Promise<string[]> {
  const u = `${host(e)}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json&origin=*`;
  const d = await getJson<{ query?: { search?: { title: string }[] } }>(u);
  return d?.query?.search?.map((s) => s.title) ?? [];
}

interface PageResp {
  query?: {
    pages?: Record<string, { title: string; extract?: string; fullurl?: string; pageprops?: Record<string, string>; missing?: string }>;
  };
}

async function intro(e: Edition, title: string, full = false): Promise<Retrieved | null> {
  const u = `${host(e)}/w/api.php?action=query&prop=extracts|pageprops|info&inprop=url${full ? '' : '&exintro=1'}&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const d = await getJson<PageResp>(u);
  const page = d?.query?.pages && Object.values(d.query.pages)[0];
  if (!page || page.missing !== undefined || !page.extract) return null;
  if (page.pageprops && 'disambiguation' in page.pageprops) return null;
  // Keep the grounding context small: free-tier friendly and easy to verify against.
  const text = page.extract
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, full ? 6000 : 1800);
  return { edition: e, title: page.title, text, url: page.fullurl ?? `${host(e)}/wiki/${encodeURIComponent(page.title)}` };
}

/** Does the article plausibly match this query? Guards against grounding on an unrelated page. */
function goodMatch(query: string, r: Retrieved, lang: Lang): boolean {
  if (r.text.length < 120) return false;
  const tokens = (s: string) =>
    s
      .split(/[\s\-_,.;:!?()«»"'؟،]+/)
      .map((w) => normalizeWord(w, lang))
      .filter((w) => w.length >= 3);
  const q = tokens(query);
  if (!q.length) return false;
  const hay = normalizeWord(`${r.title} ${r.text.slice(0, 600)}`, lang);
  return q.some((w) => hay.includes(w));
}

async function tryEdition(e: Edition, query: string, matchLang: Lang): Promise<Retrieved | null> {
  // a short topic like "rainbow" is usually an article title: try it directly before searching
  if (query.trim().split(/\s+/).length <= 3) {
    const direct = await intro(e, query.trim().charAt(0).toUpperCase() + query.trim().slice(1));
    if (direct && goodMatch(query, direct, matchLang)) return direct;
  }
  for (const title of (await search(e, query)).slice(0, 2)) {
    const r = await intro(e, title);
    if (r && goodMatch(query, r, matchLang)) return r;
  }
  return null;
}

/** The same article with more than its first paragraph, for when the intro does not answer the question. */
export function retrieveMore(r: Retrieved): Promise<Retrieved | null> {
  return intro(r.edition, r.title, true).then((m) => (m ? { ...m, translatedFrom: r.translatedFrom } : null));
}

/**
 * An English article title (for example one the AI named), read in the kid's language:
 * Wikipedia's own language link gives the same article in French or Arabic. Without
 * one, the English text is used and flagged for translation.
 */
export async function retrieveTitle(enTitle: string, lang: Lang): Promise<Retrieved | null> {
  const t = enTitle.trim().charAt(0).toUpperCase() + enTitle.trim().slice(1);
  if (lang === 'en') return (await intro('simple', t)) ?? (await intro('en', t));
  const d = await getJson<{ query?: { pages?: Record<string, { langlinks?: { '*': string }[] }> } }>(
    `${host('en')}/w/api.php?action=query&prop=langlinks&lllang=${lang}&redirects=1&titles=${encodeURIComponent(t)}&format=json&origin=*`,
  );
  const local = d?.query?.pages && Object.values(d.query.pages)[0]?.langlinks?.[0]?.['*'];
  const r = local ? await intro(lang, local) : null;
  if (r) return r;
  const en = await intro('en', t);
  return en ? { ...en, translatedFrom: 'en' } : null;
}

/**
 * Query the matching-language Wikipedia first. English prefers Simple English
 * (kid reading level). French/Arabic fall back to Simple English / English only
 * when no reasonable local article exists; the caller then translates and the
 * result is flagged `translatedFrom`.
 */
export async function retrieve(query: string, lang: Lang, englishQuery?: string): Promise<Retrieved | null> {
  if (lang === 'en') return (await tryEdition('simple', query, 'en')) ?? (await tryEdition('en', query, 'en'));
  const local = await tryEdition(lang, query, lang);
  if (local) return local;
  const q = englishQuery ?? query;
  const fallback = (await tryEdition('simple', q, 'en')) ?? (await tryEdition('en', q, 'en'));
  return fallback ? { ...fallback, translatedFrom: fallback.edition as 'en' | 'simple' } : null;
}

// ---------------- media (photos and videos, always credited) ----------------

const thumbCache = new Map<string, Promise<{ src: string; page: string } | null>>();

/** Lead image of an English Wikipedia article (hosted on Wikimedia Commons). */
export function wikiThumb(title: string) {
  if (!thumbCache.has(title)) {
    thumbCache.set(
      title,
      getJson<{ thumbnail?: { source: string }; content_urls?: { desktop?: { page: string } } }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`).then((d) =>
        d?.thumbnail ? { src: d.thumbnail.source, page: d.content_urls?.desktop?.page ?? '' } : null,
      ),
    );
  }
  return thumbCache.get(title)!;
}

interface VideoInfoResp {
  query?: {
    pages?: Record<string, { videoinfo?: { url: string; descriptionurl: string; derivatives?: { src: string; type: string }[] }[] }>;
  };
}

/** First video on an English Wikipedia article, resolved to a playable Commons URL. */
export async function wikiVideo(title: string): Promise<{ src: string; file: string; page: string } | null> {
  const list = await getJson<{ items?: { title: string; type: string }[] }>(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`);
  const file = list?.items?.find((i) => i.type === 'video')?.title;
  if (!file) return null;
  const info = await getJson<VideoInfoResp>(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(file)}&prop=videoinfo&viprop=url|derivatives&format=json&origin=*`);
  const vi = info?.query?.pages && Object.values(info.query.pages)[0]?.videoinfo?.[0];
  if (!vi) return null;
  const small = vi.derivatives?.find((d) => /webm/.test(d.type) && /480|360/.test(d.src));
  return { src: small?.src ?? vi.url, file: file.replace(/^File:/, ''), page: vi.descriptionurl };
}

/** A Commons video by file name (or, with `isArticle`, the first video on that English article). */
export async function commonsVideo(name: string, isArticle = false): Promise<{ src: string; file: string; page: string } | null> {
  if (isArticle) return wikiVideo(name);
  const file = name.startsWith('File:') ? name : `File:${name}`;
  const info = await getJson<VideoInfoResp>(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(file)}&prop=videoinfo&viprop=url|derivatives&format=json&origin=*`);
  const vi = info?.query?.pages && Object.values(info.query.pages)[0]?.videoinfo?.[0];
  if (!vi) return null;
  const small = vi.derivatives?.find((d) => /webm/.test(d.type) && /480|360/.test(d.src));
  return {
    src: small?.src ?? vi.url,
    file: file
      .replace(/^File:/, '')
      .replace(/_/g, ' ')
      .replace(/\.(webm|ogv|mp4)$/i, ''),
    page: vi.descriptionurl,
  };
}
