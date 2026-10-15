import type { Fact, Hotspot, Lang, SourceMeta, SourceType } from '../types/content';
import { normalizeWord, tx } from '../content/loader';
import { llmAwake } from '../state/store';
import { geminiGenerate } from './gemini';
import { brief, numbersGrounded, numbersIn } from './guards';
import { rephraseSystem, variantSystem } from './prompts';

/**
 * "I want more!" — Gemini may only rephrase / recombine facts already in the
 * scene's locked facts.json. Output is machine-checked against the cited fact;
 * anything that fails falls back to a local reshuffle of curated content.
 */

export interface QuizVariant {
  question: string;
  choices: string[];
  answerIndex: number;
  factId: string;
  sourceType: SourceType;
  sourceMeta: SourceMeta;
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function curatedQuiz(h: Hotspot, lang: Lang): QuizVariant | null {
  if (!h.quiz) return null;
  const order = shuffle(h.quiz.choices.map((_, i) => i));
  return {
    question: tx(h.quiz.question, lang),
    choices: order.map((i) => tx(h.quiz!.choices[i], lang)),
    answerIndex: order.indexOf(h.quiz.answerIndex),
    factId: h.quiz.factId,
    sourceType: 'curated',
    sourceMeta: { provider: 'wondarta-editors', basedOnFactIds: [h.quiz.factId] },
  };
}

const norm = (s: string, lang: Lang) => normalizeWord(s, lang).replace(/\s+/g, ' ');

export function validateVariant(v: unknown, facts: Fact[], lang: Lang, avoid: string): Omit<QuizVariant, 'sourceType' | 'sourceMeta'> | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const fact = facts.find((f) => f.id === o.factId);
  const choices = Array.isArray(o.choices) ? o.choices.map(String).map((c) => c.trim()) : [];
  const ai = Number(o.answerIndex);
  const question = typeof o.question === 'string' ? brief(o.question, 1) : '';
  if (!fact || choices.length !== 4 || !(ai >= 0 && ai < 4) || !question || question.length > 160) return null;
  if (new Set(choices.map((c) => norm(c, lang))).size !== 4) return null;
  if (norm(question, lang) === norm(avoid, lang)) return null;
  const factText = norm(tx(fact.text, lang), lang);
  // The right answer must literally come from the cited fact...
  if (!factText.includes(norm(choices[ai], lang))) return null;
  // ...and no distractor may also be supported by it (no two right answers).
  if (choices.some((c, i) => i !== ai && factText.includes(norm(c, lang)))) return null;
  // No invented numbers anywhere in the question or answer.
  if (!numbersGrounded(`${question} ${choices[ai]}`, [tx(fact.text, lang)])) return null;
  return { question, choices, answerIndex: ai, factId: fact.id };
}

export async function moreQuiz(h: Hotspot, sceneFacts: Fact[], lang: Lang, previousQuestion: string): Promise<QuizVariant | null> {
  const facts = sceneFacts.filter((f) => h.factIds.includes(f.id));
  if (llmAwake('gemini') && facts.length) {
    try {
      const raw = await geminiGenerate(
        variantSystem(lang),
        `FACTS:\n${facts.map((f) => `[${f.id}] ${tx(f.text, lang)}`).join('\n')}\n\nDo not reuse this question: ${previousQuestion}`,
        { json: true, maxTokens: 250 },
      );
      const ok = validateVariant(JSON.parse(raw), facts, lang, previousQuestion);
      if (ok) {
        return { ...ok, sourceType: 'ai-grounded', sourceMeta: { provider: 'gemini', basedOnFactIds: [ok.factId] } };
      }
    } catch {
      /* fall through to curated */
    }
  }
  return curatedQuiz(h, lang);
}

/** New wording for a puzzle's instruction line. The puzzle itself is recombined locally from curated data. */
export async function rephrasePrompt(prompt: string, lang: Lang): Promise<{ text: string; sourceType: SourceType }> {
  if (!llmAwake('gemini')) return { text: prompt, sourceType: 'curated' };
  try {
    const out = brief(await geminiGenerate(rephraseSystem(lang), prompt, { maxTokens: 60 }), 1);
    if (!out || out.length > 120 || numbersIn(out).length > numbersIn(prompt).length) return { text: prompt, sourceType: 'curated' };
    return { text: out, sourceType: 'ai-grounded' };
  } catch {
    return { text: prompt, sourceType: 'curated' };
  }
}
