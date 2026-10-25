import type { Fact, Hotspot, Lang, LText } from '../types/content';
import { findHotspot, normalizeWord, tx } from '../content/loader';
import { llmAwake } from '../state/store';
import { groqChat, type ChatMsg } from './groq';
import { brief, numbersIn } from './guards';
import { chatSystem, quizFramingSystem } from './prompts';

/**
 * The mascot (Groq) is a voice, never a source. It frames questions and makes
 * conversation; every fact it "says" is inserted verbatim by our code from the
 * locked facts.json. Any output that looks like it smuggled in a claim (numbers,
 * the answer, too long) is thrown away in favour of a pre-written line.
 */

function containsPhrase(text: string, phrase: string, lang: Lang) {
  const p = normalizeWord(phrase, lang).replace(/^(a|an|the|un|une|le|la|les)\s+/, '');
  return p.length > 2 && normalizeWord(text, lang).includes(p);
}

/** One in-character line introducing a curated quiz. Falls back to the hotspot's pre-written line. */
export async function frameQuiz(h: Hotspot, question: LText, answer: LText, lang: Lang): Promise<string> {
  const fallback = tx(h.mascotLine, lang);
  if (!llmAwake('groq')) return fallback;
  try {
    const out = await groqChat(
      [
        { role: 'system', content: quizFramingSystem(lang) },
        { role: 'user', content: `Topic: ${tx(h.title, 'en')}. Question (do not repeat): ${tx(question, lang)}` },
      ],
      60,
    );
    const line = brief(out, 1);
    const bad =
      !line ||
      line.length > 140 ||
      numbersIn(line).length > 0 ||
      containsPhrase(line, tx(answer, lang), lang) ||
      containsPhrase(line, tx(answer, 'en'), 'en');
    return bad ? fallback : line;
  } catch {
    return fallback;
  }
}

// ---------------- Mascot Room chat ----------------

export interface RecallQuestion {
  hotspotId: string;
  question: string;
  /** null = open recall ("tell me something you remember"), no grading. */
  answer: string | null;
}

export interface ChatTurn {
  say: string;
  fact?: string;
  recall?: RecallQuestion;
  sourceType: 'curated' | 'ai-generated';
}

export interface ExploredTopic {
  hotspotId: string;
  title: LText;
  facts: Fact[];
}

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

/** Recall questions come from curated quizzes when possible, else a safe open template. */
export function recallFor(topic: ExploredTopic, lang: Lang, openTemplate: string): RecallQuestion {
  const h = findHotspot(topic.hotspotId)?.hotspot;
  if (h?.quiz) {
    return { hotspotId: h.id, question: tx(h.quiz.question, lang), answer: tx(h.quiz.choices[h.quiz.answerIndex], lang) };
  }
  return { hotspotId: topic.hotspotId, question: openTemplate.replace('{{title}}', tx(topic.title, lang)), answer: null };
}

export function gradeRecall(reply: string, recall: RecallQuestion, lang: Lang): boolean | null {
  if (!recall.answer) return null;
  return containsPhrase(reply, recall.answer, lang);
}

export async function chatReply(opts: {
  lang: Lang;
  history: ChatMsg[];
  topics: ExploredTopic[];
  childText: string;
  gradeNote?: string;
  fallbackSay: string;
  openRecallTemplate: string;
}): Promise<ChatTurn> {
  const { lang } = opts;
  // the most recent topics only: a long visit would otherwise overflow the model's request limit
  const topics = opts.topics.slice(-8);
  const allFacts = topics.flatMap((t) => t.facts.map((f) => ({ ...f, hotspotId: t.hotspotId })));

  const offline = (): ChatTurn => {
    const t = topics.length ? pick(topics) : null;
    return {
      say: opts.fallbackSay,
      fact: t ? tx(pick(t.facts).text, lang) : undefined,
      recall: t ? recallFor(t, lang, opts.openRecallTemplate) : undefined,
      sourceType: 'curated',
    };
  };
  if (!llmAwake('groq')) return offline();

  const factList = allFacts.map((f) => `[${f.id}] ${tx(f.text, 'en')}`).join('\n');
  try {
    const raw = await groqChat(
      [
        { role: 'system', content: `${chatSystem(lang, topics.map((t) => tx(t.title, 'en')))}\n\nFACTS:\n${factList || '(none)'}` },
        ...opts.history.slice(-6),
        { role: 'user', content: opts.gradeNote ? `${opts.childText}\n(${opts.gradeNote})` : opts.childText },
      ],
      160,
    );
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as {
      say?: string;
      factId?: string | null;
      askRecall?: boolean;
    };
    const say = brief(json.say ?? '', 2);
    // Fact lock: conversational glue may not carry numbers and must stay short.
    if (!say || say.length > 220 || numbersIn(say).length) return offline();
    const fact = allFacts.find((f) => f.id === json.factId);
    const recallTopic = json.askRecall && topics.length ? pick(topics) : null;
    return {
      say,
      fact: fact ? tx(fact.text, lang) : undefined,
      recall: recallTopic ? recallFor(recallTopic, lang, opts.openRecallTemplate) : undefined,
      sourceType: 'ai-generated',
    };
  } catch {
    return offline();
  }
}
