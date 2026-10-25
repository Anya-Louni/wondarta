import type { Lang, SourcedText } from '../types/content';
import { normalizeWord } from '../content/loader';
import { llmAwake } from '../state/store';
import { retrieve, retrieveMore, retrieveTitle, topicOf, type Retrieved } from '../wiki/wikipedia';
import { geminiGenerate } from './gemini';
import { brief, isRefusal, looksUnsafe, numbersGrounded } from './guards';
import { groundedSystem } from './prompts';

/**
 * Wikipedia-grounded generation (real RAG, never unsourced):
 * 1. retrieve real text from the matching-language Wikipedia
 * 2. Gemini may only restate what that text says
 * 3. machine checks: no invented numbers, and (same language) the answer's
 *    content words must mostly come from the source
 * If any step fails we say so honestly instead of generating something.
 */

export type GroundedResult = ({ status: 'ok' } & SourcedText) | { status: 'not-found' | 'unsuitable' | 'asleep' | 'unverified' | 'offline' };

function overlapOk(answer: string, source: string, lang: Lang): boolean {
  const words = answer
    .split(/[\s,.;:!?()«»"'؟،]+/)
    .map((w) => normalizeWord(w, lang))
    .filter((w) => w.length >= 5);
  if (words.length < 3) return true;
  const src = normalizeWord(source, lang);
  const hits = words.filter((w) => src.includes(w.slice(0, Math.max(5, w.length - 2)))).length;
  // simple words replace some of the source's hard ones, so a third is enough to show it came from the source
  return hits / words.length >= 0.3;
}

async function englishQuery(query: string): Promise<string | undefined> {
  try {
    const out = await geminiGenerate('Translate this short search query into English. Output only the translated query, nothing else.', query, { maxTokens: 30 });
    return out && !isRefusal(out) ? out.split('\n')[0].slice(0, 80) : undefined;
  } catch {
    return undefined;
  }
}

/** Which Wikipedia article answers the question? Keyword search alone picks "Bleu ciel" for "pourquoi le ciel est bleu". */
async function articleTitle(question: string): Promise<string | undefined> {
  try {
    // English titles are the ones the model knows best; Wikipedia's language links do the rest
    const out = await geminiGenerate(
      'A child asked a question, possibly in French or Arabic. Name the one article on the ENGLISH Wikipedia (en.wikipedia.org) that best answers it. Write the title in English, exactly as on en.wikipedia.org, even when the question is not in English. Example: "Comment volent les avions ?" -> Lift (force). Output only the title.',
      question,
      { maxTokens: 24 },
    );
    const title =
      out && !isRefusal(out)
        ? out
            .split('\n')[0]
            .replace(/["«»*]/g, '')
            .trim()
            .slice(0, 80)
        : '';
    return title || undefined;
  } catch {
    return undefined;
  }
}

async function answerFrom(r: Retrieved, question: string, lang: Lang): Promise<GroundedResult> {
  const translating = Boolean(r.translatedFrom);
  const user = `SOURCE TEXT (Wikipedia article "${r.title}"):\n"""${r.text}"""\n\nQUESTION: ${question}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await geminiGenerate(groundedSystem(lang, translating), user, { maxTokens: 220 });
    const refusal = isRefusal(raw);
    if (refusal === 'unsuitable') return { status: 'unsuitable' };
    if (refusal === 'not-found') return { status: 'not-found' };
    const text = brief(raw, 3);
    if (!text) continue;
    if (!numbersGrounded(text, [r.text])) continue;
    if (!translating && !overlapOk(text, r.text, lang)) continue;
    return {
      status: 'ok',
      text,
      sourceType: 'ai-grounded',
      sourceMeta: {
        provider: 'wikipedia',
        wikiLang: r.edition,
        url: r.url,
        title: r.title,
        translatedFrom: r.translatedFrom,
      },
    };
  }
  return { status: 'unverified' };
}

/** Answer from the article's opening; if that does not cover the question, from more of the article. */
async function answerWithMore(r: Retrieved, q: string, lang: Lang): Promise<GroundedResult> {
  const first = await answerFrom(r, q, lang);
  if (first.status !== 'not-found') return first;
  const more = await retrieveMore(r);
  return more && more.text.length > r.text.length ? answerFrom(more, q, lang) : first;
}

export async function askAnything(query: string, lang: Lang): Promise<GroundedResult> {
  const q = query.trim().slice(0, 140);
  if (!q) return { status: 'not-found' };
  if (looksUnsafe(q)) return { status: 'unsuitable' };
  if (!llmAwake('gemini')) return { status: 'asleep' };
  if (!navigator.onLine) return { status: 'offline' };
  try {
    // the article the AI points to first, then a search for the thing asked about (not the whole question)
    const title = await articleTitle(q);
    const topic = topicOf(q);
    let r = (title ? ((await retrieveTitle(title, lang)) ?? (await retrieve(title, lang))) : null) ?? (await retrieve(topic, lang));
    if (!r && lang !== 'en') {
      const en = await englishQuery(q);
      if (en) r = await retrieve(topic, lang, en);
    }
    if (!r) return { status: 'not-found' };
    let res = await answerWithMore(r, q, lang);
    // a short local article may not answer it: the English one, translated, often does
    if (res.status === 'not-found' && lang !== 'en' && !r.translatedFrom && title) {
      const en = await retrieveTitle(title, 'en');
      if (en) res = await answerWithMore({ ...en, translatedFrom: en.edition as 'en' | 'simple' }, q, lang);
    }
    return res;
  } catch {
    return { status: 'asleep' };
  }
}

/** Learn More: a Wikipedia-grounded extra for a hotspot, using its curated per-language search phrase. */
export async function learnMoreFromWiki(wikiQuery: string, englishQuery: string, lang: Lang, prompt: string): Promise<GroundedResult> {
  if (!llmAwake('gemini')) return { status: 'asleep' };
  if (!navigator.onLine) return { status: 'offline' };
  try {
    const r = await retrieve(wikiQuery, lang, englishQuery);
    if (!r) return { status: 'not-found' };
    return await answerFrom(r, prompt, lang);
  } catch {
    return { status: 'asleep' };
  }
}
