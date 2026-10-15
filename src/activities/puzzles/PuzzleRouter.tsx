import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { LogicGridPuzzle, Puzzle } from '../../types/content';
import { tx } from '../../content/loader';
import { Construction, DragToLabel, PhotoToLabel, SortMatch } from './Matching';
import { Cipher, NameThatX, OddOneOut, PatternSeries, Rebus, Riddle } from './Choices';
import { CommandRoute } from './CommandRoute';
import { MemoryPairs } from './Memory';
import { MapFind } from './MapFind';
import { SoundMatch } from './SoundMatch';
import { BuildFlower } from './BuildFlower';
import { Arcade } from './Arcade';
import { ListenMap } from './ListenMap';

// the 3D body game brings its own canvas; load it only when someone opens it
const BodyBuild = lazy(() => import('./BodyBuild').then((m) => ({ default: m.BodyBuild })));
import type { PuzzleProps } from './types';

/** Braingle-style logic grid: mark one match per row, then check. */
function LogicGrid({ puzzle, lang, onSolved, onWrong }: PuzzleProps<LogicGridPuzzle>) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<Record<number, number>>({});
  return (
    <div>
      <ul>
        {puzzle.clues.map((c, i) => (
          <li key={i}>{tx(c, lang)}</li>
        ))}
      </ul>
      <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
        <thead>
          <tr>
            <th />
            {puzzle.cols.map((c, i) => (
              <th key={i}>{tx(c, lang)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {puzzle.rows.map((r, ri) => (
            <tr key={ri}>
              <th>{tx(r, lang)}</th>
              {puzzle.cols.map((_, ci) => (
                <td key={ci}>
                  <button className={`ibtn sm${pick[ri] === ci ? ' on' : ''}`} onClick={() => setPick((p) => ({ ...p, [ri]: ci }))}>
                    {pick[ri] === ci ? <Check className="i" /> : null}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="btn green"
        onClick={() => (puzzle.rows.every((_, ri) => pick[ri] === puzzle.solution[ri]) ? onSolved() : onWrong())}
      >
        {t('card.check')}
      </button>
    </div>
  );
}

export function PuzzleRouter(props: PuzzleProps) {
  const p = props.puzzle;
  // Narrow the discriminated union and hand each puzzle its own typed props.
  const as = <P extends Puzzle>(x: P) => ({ ...props, puzzle: x });
  switch (p.type) {
    case 'sort-match':
      return <SortMatch {...as(p)} />;
    case 'photo-to-label-match':
      return <PhotoToLabel {...as(p)} />;
    case 'name-that-x':
      return <NameThatX {...as(p)} />;
    case 'sound-match':
      return <SoundMatch {...as(p)} />;
    case 'build-flower':
      return <BuildFlower {...as(p)} />;
    case 'body-build':
      return (
        <Suspense fallback={<p className="muted">…</p>}>
          <BodyBuild {...as(p)} />
        </Suspense>
      );
    case 'map-find':
      return <MapFind {...as(p)} />;
    case 'memory-pairs':
      return <MemoryPairs {...as(p)} />;
    case 'drag-to-label':
      return <DragToLabel {...as(p)} />;
    case 'odd-one-out':
      return <OddOneOut {...as(p)} />;
    case 'pattern-series':
      return <PatternSeries {...as(p)} />;
    case 'riddle':
      return <Riddle {...as(p)} />;
    case 'rebus':
      return <Rebus {...as(p)} />;
    case 'cipher':
      return <Cipher {...as(p)} />;
    case 'construction':
      return <Construction {...as(p)} />;
    case 'command-route':
      return <CommandRoute {...as(p)} />;
    case 'listen-map':
      return <ListenMap {...as(p)} />;
    case 'arcade':
      return <Arcade {...as(p)} />;
    case 'logic-grid':
      return <LogicGrid {...as(p)} />;
  }
}
