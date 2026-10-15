import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { Lang } from '../types/content';
import { useApp } from '../state/store';
import { seeded } from './puzzles/types';

/** Per-session salt so answer order isn't predictable between visits. */
const SALT = Math.floor(Math.random() * 997);

const KEYS: Record<Lang, string[]> = {
  en: ['A', 'B', 'C', 'D', 'E', 'F'],
  fr: ['A', 'B', 'C', 'D', 'E', 'F'],
  ar: ['أ', 'ب', 'ج', 'د', 'هـ', 'و'],
};

/**
 * Lettered answer keys (Encarta / MindMaze style). Wrong picks shake and lock,
 * the right pick glows; number keys 1-6 answer from the keyboard.
 */
export function AnswerList({
  choices,
  answerIndex,
  onRight,
  onWrong,
  seed = 0,
  removed = [],
  render,
  media = false,
}: {
  choices: string[];
  answerIndex: number;
  onRight: () => void;
  onWrong: () => void;
  seed?: number;
  /** indices hidden by a hint */
  removed?: number[];
  /** optional custom content per choice (e.g. a picture) */
  render?: (i: number) => ReactNode;
  media?: boolean;
}) {
  const lang = useApp((s) => s.lang);
  const order = useMemo(() => seeded(choices.map((_, i) => i), seed + SALT), [choices, seed]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState(false);

  const pick = (i: number) => {
    if (right || wrong.includes(i) || removed.includes(i)) return;
    if (i === answerIndex) {
      setRight(true);
      onRight();
    } else {
      setWrong((w) => [...w, i]);
      onWrong();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= order.length) pick(order[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`answers${media ? ' media' : ''}`} role="group">
      {order.map((i, pos) => {
        const isRight = right && i === answerIndex;
        const isWrong = wrong.includes(i);
        const isGone = removed.includes(i);
        return (
          <button
            key={i}
            type="button"
            className={`answer${isRight ? ' right' : ''}${isWrong ? ' wrong' : ''}${isGone ? ' gone' : ''}`}
            disabled={right || isWrong || isGone}
            onClick={() => pick(i)}
          >
            <span className="key" aria-hidden>
              {KEYS[lang][pos]}
            </span>
            {render ? render(i) : <span>{choices[i]}</span>}
            <span className="mark" aria-hidden>
              {isRight && <Check className="i" color="#1f7a2a" />}
              {isWrong && <X className="i" color="#e5484d" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Result strip under an answer: green with a curated fact, or red with encouragement. */
export function Feedback({ kind, title, children, actions }: { kind: 'good' | 'bad'; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`feedback ${kind}`} role="status" aria-live="polite">
      <span className="badge-icon">{kind === 'good' ? <Check className="i" /> : <X className="i" />}</span>
      <div style={{ flex: 1 }}>
        <h4>{title}</h4>
        {children && <p>{children}</p>}
        {actions && <div className="row">{actions}</div>}
      </div>
    </div>
  );
}
