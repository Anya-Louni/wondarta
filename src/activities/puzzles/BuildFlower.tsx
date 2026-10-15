import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildFlowerPuzzle, FlowerPartId } from '../../types/content';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import { seeded, type PuzzleProps } from './types';

/**
 * Build a flower. Parts go on in the order a real plant has them: roots,
 * stem and leaves from the ground up, then the flower itself from the outside
 * in (sepals, petals, stamens, pistil — the real order of a flower's rings).
 * Each part pops into the drawing with its job underneath.
 */
const ART: Record<FlowerPartId, ReactNode> = {
  roots: (
    <g stroke="#9a6a3c" strokeWidth="2.4" fill="none" strokeLinecap="round">
      <path d="M100 196 C 96 212 86 222 74 232" />
      <path d="M100 196 C 102 214 110 226 124 236" />
      <path d="M100 196 L 100 240" />
      <path d="M88 222 C 82 224 78 230 74 236" />
      <path d="M112 222 C 118 226 122 230 126 238" />
    </g>
  ),
  stem: <path d="M100 196 C 97 160 103 120 100 84" stroke="#3f9a3a" strokeWidth="5" fill="none" strokeLinecap="round" />,
  leaves: (
    <g fill="#57b847" stroke="#3a8a33" strokeWidth="1.2">
      <path d="M100 160 C 78 150 64 156 56 170 C 74 176 90 172 100 160 Z" />
      <path d="M100 138 C 122 126 138 130 146 144 C 128 152 110 150 100 138 Z" />
    </g>
  ),
  sepals: (
    <g fill="#4fae44" stroke="#3a8a33" strokeWidth="1">
      <path d="M100 86 C 88 88 80 84 76 78 C 88 76 96 80 100 86 Z" />
      <path d="M100 86 C 112 88 120 84 124 78 C 112 76 104 80 100 86 Z" />
    </g>
  ),
  petals: (
    <g fill="#ff9ec3" stroke="#e5709f" strokeWidth="1.2">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="100" cy="46" rx="11" ry="24" transform={`rotate(${i * 45} 100 70)`} />
      ))}
    </g>
  ),
  stamens: (
    <g>
      {Array.from({ length: 7 }, (_, i) => {
        const a = ((i / 7) * 360 * Math.PI) / 180;
        const x = 100 + Math.cos(a) * 13;
        const y = 70 + Math.sin(a) * 13;
        return (
          <g key={i}>
            <line x1="100" y1="70" x2={x} y2={y} stroke="#f2e8a0" strokeWidth="1.6" />
            <circle cx={x} cy={y} r="3" fill="#f5b700" />
          </g>
        );
      })}
    </g>
  ),
  pistil: (
    <g>
      <circle cx="100" cy="70" r="6.5" fill="#8fcf5a" stroke="#5f9e3a" strokeWidth="1" />
      <circle cx="100" cy="70" r="2.6" fill="#e6f5a8" />
    </g>
  ),
};

export function BuildFlower({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<BuildFlowerPuzzle>) {
  const { t } = useTranslation();
  const tray = useMemo(() => seeded(puzzle.parts, seed), [puzzle, seed]);
  const [built, setBuilt] = useState<FlowerPartId[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const next = puzzle.parts[built.length];
  const last = built.length ? puzzle.parts.find((p) => p.id === built[built.length - 1]) : null;
  const done = built.length === puzzle.parts.length;

  const pick = (id: FlowerPartId) => {
    if (done) return;
    if (id === next.id) {
      sfx('pop');
      const nextBuilt = [...built, id];
      setBuilt(nextBuilt);
      setHint(false);
      if (nextBuilt.length === puzzle.parts.length) onSolved();
    } else {
      setWrong(id);
      setHint(true);
      window.setTimeout(() => setWrong(null), 500);
      onWrong();
    }
  };

  // draw order: flower rings on top of the stem, stem on top of the roots
  const drawOrder: FlowerPartId[] = ['roots', 'stem', 'leaves', 'sepals', 'petals', 'stamens', 'pistil'];

  return (
    <div className="buildflower">
      <div className="buildflower-stage">
        <svg viewBox="0 0 200 250" aria-hidden>
          <rect x="0" y="196" width="200" height="54" fill="#b98552" opacity="0.35" rx="6" />
          <line x1="0" y1="196" x2="200" y2="196" stroke="#8a5a36" strokeWidth="1.5" opacity="0.5" />
          {drawOrder
            .filter((id) => built.includes(id))
            .map((id) => (
              <g key={id} className="flower-part">
                {ART[id]}
              </g>
            ))}
        </svg>
        <ol className="buildflower-list">
          {puzzle.parts.map((p, i) => (
            <li key={p.id} className={built.includes(p.id) ? 'done' : i === built.length ? 'now' : ''}>
              <strong>{built.includes(p.id) ? tx(p.label, lang) : '?'}</strong>
              {built.includes(p.id) && <span>{tx(p.job, lang)}</span>}
            </li>
          ))}
        </ol>
      </div>

      {!done && (
        <>
          <p className="muted" style={{ margin: '8px 0' }}>
            {hint ? t('puzzle.flowerHint') : t('puzzle.flowerWhatNext')}
          </p>
          <div className="chips-tray">
            {tray
              .filter((p) => !built.includes(p.id))
              .map((p) => (
                <button key={p.id} type="button" className={`label-chip${wrong === p.id ? ' shake' : ''}`} onClick={() => pick(p.id)}>
                  {tx(p.label, lang)}
                </button>
              ))}
          </div>
        </>
      )}

      {last && !done && (
        <p className="flower-news">
          <strong>{tx(last.label, lang)}:</strong> {tx(last.job, lang)}
        </p>
      )}

      {done && (
        <p className="flower-news">
          <strong>{t('puzzle.flowerDone')}</strong> {t('puzzle.flowerDoneNote')}
        </p>
      )}
    </div>
  );
}
