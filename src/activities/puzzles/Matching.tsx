import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConstructionPuzzle, DragToLabelPuzzle, PhotoToLabelPuzzle, SortMatchPuzzle } from '../../types/content';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import { MediaView } from '../../ui/MediaView';
import { modelThumb } from '../../models';
import { useDnd } from '../dnd';
import { seeded, type PuzzleProps } from './types';

function useCompletion(done: number, total: number, onSolved: () => void) {
  useEffect(() => {
    if (total > 0 && done === total) onSolved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, total]);
}

/** Texture swatches for the sort bins (drawn with CSS, no images). */
const BIN_LOOK: Record<string, string> = {
  fur: 'repeating-linear-gradient(60deg, #a2703f 0 3px, #c48a52 3px 6px)',
  feathers: 'repeating-linear-gradient(-30deg, #e9e2d2 0 4px, #b9a78a 4px 5px)',
  scales: 'radial-gradient(circle at 50% 100%, #6fae4a 0 38%, #3e7a2a 40% 44%, transparent 46%) 0 0 / 8px 8px, #5c9e3a',
};

// ------------------------------------------------------------ sort-match (Zoombinis-style)

export function SortMatch({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<SortMatchPuzzle>) {
  const { t } = useTranslation();
  // Round-robin across bins so every bin gets items, then trim to `show`.
  const items = useMemo(() => {
    const perBin = puzzle.bins.map((b) => seeded(puzzle.items.filter((i) => i.bin === b.id), seed + b.id.length));
    const out: SortMatchPuzzle['items'] = [];
    for (let k = 0; out.length < puzzle.show && perBin.some((l) => l[k]); k++) for (const l of perBin) if (l[k] && out.length < puzzle.show) out.push(l[k]);
    return seeded(out, seed);
  }, [puzzle, seed]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [bad, setBad] = useState<string | null>(null);

  const onDrop = useCallback(
    (itemId: string, binId: string) => {
      const it = items.find((i) => i.id === itemId);
      if (!it || placed[itemId]) return;
      if (it.bin === binId) {
        sfx('pop');
        setPlaced((p) => ({ ...p, [itemId]: binId }));
      } else {
        setBad(binId);
        window.setTimeout(() => setBad(null), 400);
        onWrong();
      }
    },
    [items, placed, onWrong],
  );
  const { bindDrag, bindDrop, picked, hot, ghostEl } = useDnd<string>(onDrop);
  useCompletion(Object.keys(placed).length, items.length, onSolved);

  return (
    <div>
      <p className="muted">{t('puzzle.tapPick')}</p>
      <div className="tiles" style={{ marginBlockEnd: 10 }}>
        {items
          .filter((i) => !placed[i.id])
          .map((i) => (
            <div key={i.id} className={`tile${picked === i.id ? ' picked' : ''}`} {...bindDrag(i.id, <div className="tile"><MediaView media={i.media} /></div>)}>
              <MediaView media={i.media} photos={photos} label={tx(i.label, lang)} />
              <span>{tx(i.label, lang)}</span>
            </div>
          ))}
      </div>
      <div className="bins">
        {puzzle.bins.map((b) => (
          <div key={b.id} className={`dropzone${hot === b.id ? ' hot' : ''}${bad === b.id ? ' shake' : ''}`} {...bindDrop(b.id)}>
            <div className="bin-head">
              <span className="swatch" style={{ background: BIN_LOOK[b.id] ?? 'var(--sky-200)' }} />
              {tx(b.label, lang)}
            </div>
            <div className="bin-items">
              {items
                .filter((i) => placed[i.id] === b.id)
                .map((i) => (
                  <img key={i.id} src={modelThumb(i.media.model, 96)} alt={tx(i.label, lang)} title={tx(i.label, lang)} />
                ))}
            </div>
          </div>
        ))}
      </div>
      {ghostEl}
    </div>
  );
}

// ------------------------------------------------------------ photo-to-label-match (Encarta "Animal Control")

export function PhotoToLabel({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<PhotoToLabelPuzzle>) {
  const pairs = useMemo(() => seeded(puzzle.pairs, seed).slice(0, puzzle.show), [puzzle, seed]);
  const labels = useMemo(() => seeded(pairs, seed + 7), [pairs, seed]);
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const { t } = useTranslation();

  const onDrop = useCallback(
    (labelId: string, photoId: string) => {
      if (labelId === photoId) {
        sfx('pop');
        setDone((d) => [...d, labelId]);
      } else {
        setBad(photoId);
        window.setTimeout(() => setBad(null), 400);
        onWrong();
      }
    },
    [onWrong],
  );
  const { bindDrag, bindDrop, picked, hot, ghostEl } = useDnd<string>(onDrop);
  useCompletion(done.length, pairs.length, onSolved);

  return (
    <div>
      <p className="muted">{t('puzzle.tapPick')}</p>
      <div className="bins" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {pairs.map((p) => (
          <div key={p.id} className={`dropzone${hot === p.id ? ' hot' : ''}${bad === p.id ? ' shake' : ''}`} style={{ display: 'grid', justifyItems: 'center' }} {...bindDrop(p.id)}>
            <MediaView media={p.media} photos={photos} size="big" />
            <strong style={{ minBlockSize: 22, fontSize: 13, color: done.includes(p.id) ? 'var(--grass-700)' : 'var(--ink-300)' }}>{done.includes(p.id) ? tx(p.label, lang) : '?'}</strong>
          </div>
        ))}
      </div>
      <div className="chips-tray">
        {labels
          .filter((l) => !done.includes(l.id))
          .map((l) => (
            <button key={l.id} className={`label-chip${picked === l.id ? ' picked' : ''}`} {...bindDrag(l.id, <span className="label-chip">{tx(l.label, lang)}</span>)}>
              {tx(l.label, lang)}
            </button>
          ))}
      </div>
      {ghostEl}
    </div>
  );
}

// ------------------------------------------------------------ drag-to-label (Encarta "Anatomy: A Game With Guts")

function PlantDiagram() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <rect x="0" y="76" width="100" height="24" fill="#b88a5a" opacity="0.55" />
      {[[-22, 18], [-10, 22], [0, 24], [10, 21], [22, 17]].map(([dx, dy], i) => (
        <path key={i} d={`M50 76 Q ${50 + dx / 2} ${76 + dy / 2} ${50 + dx} ${76 + dy}`} stroke="#8a5a34" strokeWidth="1.6" fill="none" />
      ))}
      <path d="M50 76 C 49 60, 51 40, 50 22" stroke="#3fae4a" strokeWidth="3" fill="none" />
      <ellipse cx="66" cy="46" rx="14" ry="6" transform="rotate(-25 66 46)" fill="#5ccf45" />
      <ellipse cx="34" cy="56" rx="13" ry="5.5" transform="rotate(25 34 56)" fill="#5ccf45" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <ellipse key={i} cx={50 + Math.cos(a) * 7} cy={16 + Math.sin(a) * 7} rx="5" ry="5" fill="#ffd257" />;
      })}
      <circle cx="50" cy="16" r="5" fill="#a0522d" />
    </svg>
  );
}

/**
 * The human body, drawn with Servier Medical Art (CC BY 4.0): a neutral body
 * outline with real anatomical illustrations of the organs laid over it. The
 * percentages line the organs up with the drop slots in the scene's
 * facts.json, so the art and the answers can't drift apart.
 */
const ORGANS: { id: string; src: string; left: number; top: number; width: number }[] = [
  { id: 'brain', src: 'brain.png', left: 46, top: 8, width: 18 },
  { id: 'lungs', src: 'lungs.png', left: 46, top: 32, width: 32 },
  { id: 'heart', src: 'heart.png', left: 55, top: 37, width: 14 },
  { id: 'stomach', src: 'stomach.png', left: 42, top: 54, width: 18 },
  { id: 'intestine', src: 'intestine.png', left: 52, top: 68, width: 24 },
];

function BodyDiagram() {
  return (
    <div className="body-art" aria-hidden>
      <img className="body-base" src="./images/servier/body.png" alt="" />
      {ORGANS.map((o) => (
        <img
          key={o.id}
          className="body-organ"
          src={`./images/servier/${o.src}`}
          alt=""
          style={{ left: `${o.left}%`, top: `${o.top}%`, inlineSize: `${o.width}%` }}
        />
      ))}
    </div>
  );
}

export function DragToLabel({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<DragToLabelPuzzle>) {
  const { t } = useTranslation();
  const chips = useMemo(() => seeded(puzzle.slots, seed), [puzzle, seed]);
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const onDrop = useCallback(
    (labelId: string, slotId: string) => {
      if (labelId === slotId) {
        sfx('pop');
        setDone((d) => [...d, slotId]);
      } else {
        setBad(slotId);
        window.setTimeout(() => setBad(null), 400);
        onWrong();
      }
    },
    [onWrong],
  );
  const { bindDrag, bindDrop, picked, hot, ghostEl } = useDnd<string>(onDrop);
  useCompletion(done.length, puzzle.slots.length, onSolved);

  return (
    <div>
      <p className="muted">{t('puzzle.tapPick')}</p>
      <div className={`diagram ${puzzle.diagram}`} style={{ direction: 'ltr' }}>
        {puzzle.diagram === 'plant' ? <PlantDiagram /> : <BodyDiagram />}
        {puzzle.slots.map((s) => (
          <div
            key={s.id}
            className={`slot dropzone${done.includes(s.id) ? ' filled' : ''}${hot === s.id ? ' hot' : ''}${bad === s.id ? ' shake' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            {...bindDrop(s.id)}
          >
            {done.includes(s.id) ? tx(s.label, lang) : '?'}
          </div>
        ))}
      </div>
      <div className="chips-tray">
        {chips
          .filter((c) => !done.includes(c.id))
          .map((c) => (
            <button key={c.id} className={`label-chip${picked === c.id ? ' picked' : ''}`} {...bindDrag(c.id, <span className="label-chip">{tx(c.label, lang)}</span>)}>
              {tx(c.label, lang)}
              <small>{tx(c.hint, lang)}</small>
            </button>
          ))}
      </div>
      {puzzle.diagram === 'body' && (
        <p className="muted art-credit">
          {t('puzzle.artBy')}{' '}
          <a className="link" href="https://smart.servier.com" target="_blank" rel="noreferrer noopener">
            Servier Medical Art
          </a>{' '}
          · CC BY 4.0
        </p>
      )}
      {ghostEl}
    </div>
  );
}

// ------------------------------------------------------------ construction (Encarta "Build a Bicycle")

export function Construction({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<ConstructionPuzzle>) {
  const { t } = useTranslation();
  const targets = useMemo(() => seeded(puzzle.targets, seed), [puzzle, seed]);
  const [contents, setContents] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<string[]>([]);

  const onDrop = useCallback(
    (partId: string, targetId: string) => {
      if (done.includes(targetId)) return;
      const target = puzzle.targets.find((x) => x.id === targetId)!;
      const next = [...(contents[targetId] ?? []), partId];
      if (next.length < target.needs.length) {
        sfx('pop');
        setContents((c) => ({ ...c, [targetId]: next }));
        return;
      }
      const ok = [...next].sort().join() === [...target.needs].sort().join();
      setContents((c) => ({ ...c, [targetId]: next }));
      if (ok) {
        sfx('pop');
        setDone((d) => [...d, targetId]);
      } else {
        onWrong();
        window.setTimeout(() => setContents((c) => ({ ...c, [targetId]: [] })), 700);
      }
    },
    [contents, done, puzzle, onWrong],
  );
  const { bindDrag, bindDrop, picked, hot, ghostEl } = useDnd<string>(onDrop);
  useCompletion(done.length, targets.length, onSolved);

  const swatch = (id: string) => puzzle.parts.find((p) => p.id === id)!.swatch;
  return (
    <div>
      <p className="muted">{t('puzzle.tapPick')}</p>
      <div className="row" style={{ justifyContent: 'center', gap: 14, marginBlockEnd: 12 }}>
        {puzzle.parts.map((p) => (
          <div key={p.id} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <div
              className={`paint${picked === p.id ? ' picked' : ''}`}
              style={{ background: p.swatch }}
              aria-label={tx(p.label, lang)}
              role="button"
              {...bindDrag(p.id, <div className="paint" style={{ background: p.swatch }} />)}
            />
            <small>{tx(p.label, lang)}</small>
          </div>
        ))}
      </div>
      <div className="pots">
        {targets.map((tg) => {
          const c = contents[tg.id] ?? [];
          const isDone = done.includes(tg.id);
          const bg = isDone
            ? tg.swatch
            : c.length
              ? `linear-gradient(90deg, ${c.map((id) => swatch(id)).join(', ')}${c.length === 1 ? ', #ffffff' : ''})`
              : '#ffffff';
          return (
            <div key={tg.id} className={`dropzone pot${hot === tg.id ? ' hot' : ''}`} {...bindDrop(tg.id)}>
              <strong style={{ fontSize: 13, color: isDone ? 'var(--grass-700)' : undefined }}>{tx(tg.label, lang)}</strong>
              <div className="blob" style={{ background: bg }} aria-label={c.length ? undefined : t('puzzle.empty')} />
              <span style={{ inlineSize: 18, blockSize: 18, borderRadius: '50%', background: tg.swatch, border: '2px solid #fff' }} />
            </div>
          );
        })}
      </div>
      {ghostEl}
    </div>
  );
}
