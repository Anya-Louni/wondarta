import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowUp, Play, RotateCcw, RotateCw, Star, Trash2, Undo2 } from 'lucide-react';
import type { CommandRoutePuzzle } from '../../types/content';
import { sfx } from '../../audio/sfx';
import type { PuzzleProps } from './types';

type Cmd = 'F' | 'L' | 'R';
type Dir = 'N' | 'E' | 'S' | 'W';
const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const STEP: Record<Dir, [number, number]> = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const ANGLE: Record<Dir, number> = { N: -90, E: 0, S: 90, W: 180 };

/**
 * Lightbot-style coding: queue commands, run them, watch the robot. Hitting a
 * wall is a "bug"; the kid debugs by editing the program. The grid always
 * renders left-to-right (it's a map, not text), even in Arabic.
 */
export function CommandRoute({ puzzle, onSolved, onWrong }: PuzzleProps<CommandRoutePuzzle>) {
  const { t } = useTranslation();
  const start = useMemo(() => {
    for (let r = 0; r < puzzle.grid.length; r++) {
      const c = puzzle.grid[r].indexOf('S');
      if (c >= 0) return { r, c };
    }
    return { r: 0, c: 0 };
  }, [puzzle]);
  const [program, setProgram] = useState<Cmd[]>([]);
  const [bot, setBot] = useState({ ...start, dir: puzzle.startDir as Dir });
  const [status, setStatus] = useState<'idle' | 'running' | 'bump' | 'miss' | 'win' | 'full'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const cell = (r: number, c: number) => puzzle.grid[r]?.[c];

  const add = (c: Cmd) => {
    if (status === 'running' || status === 'win') return;
    if (program.length >= puzzle.maxCommands) return setStatus('full');
    sfx('click');
    setStatus('idle');
    setProgram((p) => [...p, c]);
  };

  const run = () => {
    if (!program.length) return;
    let s = { ...start, dir: puzzle.startDir as Dir };
    setBot(s);
    setStatus('running');
    let i = 0;
    timer.current = window.setInterval(() => {
      const cmd = program[i++];
      if (cmd === 'L' || cmd === 'R') {
        s = { ...s, dir: DIRS[(DIRS.indexOf(s.dir) + (cmd === 'R' ? 1 : 3)) % 4] };
      } else if (cmd === 'F') {
        const [dr, dc] = STEP[s.dir];
        const nr = s.r + dr;
        const nc = s.c + dc;
        const target = cell(nr, nc);
        if (!target || target === '#') {
          window.clearInterval(timer.current);
          setStatus('bump');
          onWrong();
          return;
        }
        s = { ...s, r: nr, c: nc };
      }
      setBot(s);
      sfx('click');
      if (i >= program.length) {
        window.clearInterval(timer.current);
        if (cell(s.r, s.c) === 'G') {
          setStatus('win');
          onSolved();
        } else {
          setStatus('miss');
          onWrong();
        }
      }
    }, 450);
  };

  const reset = () => {
    window.clearInterval(timer.current);
    setBot({ ...start, dir: puzzle.startDir as Dir });
    setStatus('idle');
  };

  const cols = puzzle.grid[0].length;
  const LABEL: Record<Cmd, string> = { F: t('puzzle.forward'), L: t('puzzle.left'), R: t('puzzle.right') };
  const ICON: Record<Cmd, JSX.Element> = { F: <ArrowUp className="i" />, L: <RotateCcw className="i" />, R: <RotateCw className="i" /> };
  return (
    <div>
      <div className="grid-robot" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {puzzle.grid.flatMap((row, r) =>
          row.split('').map((ch, c) => (
            <div key={`${r}-${c}`} className={`cell${ch === '#' ? ' wall' : ''}${ch === 'G' ? ' goal' : ''}`}>
              {bot.r === r && bot.c === c ? (
                <ArrowRight className="robot-arrow" style={{ transform: `rotate(${ANGLE[bot.dir]}deg)` }} aria-label="robot" />
              ) : ch === 'G' ? (
                <Star fill="currentColor" />
              ) : null}
            </div>
          )),
        )}
      </div>
      <div className="keys">
        {(['L', 'F', 'R'] as Cmd[]).map((c) => (
          <button key={c} className="btn" onClick={() => add(c)} disabled={status === 'running'} title={LABEL[c]}>
            {ICON[c]} {LABEL[c]}
          </button>
        ))}
      </div>
      <div className="muted">{t('puzzle.commands')}</div>
      <div className="program dropzone" dir="ltr">
        {program.map((c, i) => (
          <span key={i} className="cmd" title={LABEL[c]}>
            {i + 1} {ICON[c]}
          </span>
        ))}
      </div>
      <div className="row" style={{ marginBlockStart: 8 }}>
        <button className="btn go" onClick={run} disabled={status === 'running' || !program.length}>
          <Play className="i" /> {t('puzzle.run')}
        </button>
        <button className="link" onClick={() => setProgram((p) => p.slice(0, -1))} disabled={status === 'running'}>
          <Undo2 className="i" /> {t('puzzle.undo')}
        </button>
        <button
          className="link"
          onClick={() => {
            reset();
            setProgram([]);
          }}
          disabled={status === 'running'}
        >
          <Trash2 className="i" /> {t('puzzle.clear')}
        </button>
        {(status === 'bump' || status === 'miss') && (
          <button className="link" onClick={reset}>
            <RotateCcw className="i" /> {t('card.reset')}
          </button>
        )}
      </div>
      {status === 'bump' && <p className="muted" style={{ color: 'var(--coral-500)' }}>{t('puzzle.bump')}</p>}
      {status === 'miss' && <p className="muted" style={{ color: 'var(--coral-500)' }}>{t('puzzle.notThere')}</p>}
      {status === 'full' && <p className="muted">{t('puzzle.tooMany')}</p>}
    </div>
  );
}
