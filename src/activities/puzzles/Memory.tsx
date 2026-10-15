import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import type { MemoryPairsPuzzle } from '../../types/content';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import { MediaView } from '../../ui/MediaView';
import { seeded, type PuzzleProps } from './types';

type Card = { key: string; pairId: string; kind: 'picture' | 'word' };

/**
 * Concentration: turn two cards over and keep them if the picture and the word
 * belong together. A staple of children's encyclopedias, and it rewards the
 * thing we actually want — connecting a name to what it looks like.
 */
export function MemoryPairs({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<MemoryPairsPuzzle>) {
  const { t } = useTranslation();
  const pairs = useMemo(() => seeded(puzzle.pairs, seed).slice(0, puzzle.show), [puzzle, seed]);
  const cards = useMemo(() => {
    const deck: Card[] = pairs.flatMap((p) => [
      { key: `${p.id}:pic`, pairId: p.id, kind: 'picture' as const },
      { key: `${p.id}:word`, pairId: p.id, kind: 'word' as const },
    ]);
    return seeded(deck, seed + 31);
  }, [pairs, seed]);

  const [up, setUp] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    setUp([]);
    setDone([]);
    setTries(0);
  }, [cards]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flip = useCallback(
    (card: Card) => {
      if (up.length === 2 || up.includes(card.key) || done.includes(card.pairId)) return;
      sfx('click');
      const next = [...up, card.key];
      setUp(next);
      if (next.length < 2) return;
      setTries((n) => n + 1);
      const [a, b] = next.map((k) => cards.find((c) => c.key === k)!);
      if (a.pairId === b.pairId) {
        sfx('pop');
        const solved = [...done, a.pairId];
        setDone(solved);
        setUp([]);
        if (solved.length === pairs.length) onSolved();
      } else {
        onWrong();
        setWrongPair(next);
        timer.current = window.setTimeout(() => {
          setUp([]);
          setWrongPair([]);
        }, 900);
      }
    },
    [up, done, cards, pairs.length, onSolved, onWrong],
  );

  return (
    <div>
      <p className="muted">{t('puzzle.memoryHint', { count: pairs.length })}</p>
      <div className="memory-board">
        {cards.map((c) => {
          const pair = pairs.find((p) => p.id === c.pairId)!;
          const open = up.includes(c.key) || done.includes(c.pairId);
          return (
            <button
              key={c.key}
              type="button"
              className={`memory-card${open ? ' open' : ''}${done.includes(c.pairId) ? ' matched' : ''}${wrongPair.includes(c.key) ? ' shake' : ''}`}
              aria-label={open ? tx(pair.label, lang) : t('puzzle.memoryFaceDown')}
              onClick={() => flip(c)}
            >
              {open ? (
                c.kind === 'picture' ? (
                  <MediaView media={pair.media} photos={photos} size="big" />
                ) : (
                  <span className="memory-word">{tx(pair.label, lang)}</span>
                )
              ) : (
                <HelpCircle className="i back" />
              )}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ marginBlockEnd: 0 }}>{t('puzzle.memoryTries', { count: tries })}</p>
    </div>
  );
}
