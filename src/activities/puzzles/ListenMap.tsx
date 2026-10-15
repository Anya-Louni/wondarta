import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MapPin, Pause, Play } from 'lucide-react';
import type { ListenMapPuzzle } from '../../types/content';
import { project } from '../../content/geo';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import { Feedback } from '../Answers';
import { seeded, type PuzzleProps } from './types';

/**
 * Encarta's music game: listen to an instrument, then find where in the world
 * it comes from. Every country in the set has a pin; tap the one you think.
 */
export function ListenMap({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<ListenMapPuzzle>) {
  const { t } = useTranslation();
  const rounds = useMemo(() => seeded(puzzle.rounds, seed).slice(0, puzzle.show), [puzzle, seed]);
  const [at, setAt] = useState(0);
  const [right, setRight] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const round = rounds[at];
  const last = at === rounds.length - 1;

  const play = () => {
    audio.current?.pause();
    const a = new Audio(`./audio/instruments/${round.sound}.mp3`);
    a.onended = () => setPlaying(false);
    audio.current = a;
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
  };
  // each new round plays its instrument straight away
  useEffect(() => {
    play();
    return () => audio.current?.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  const pick = (id: string) => {
    if (right) return;
    if (id === round.id) {
      sfx('correct');
      setRight(true);
      if (last) onSolved();
    } else {
      setWrong(id);
      window.setTimeout(() => setWrong(null), 600);
      onWrong();
    }
  };

  return (
    <div className="listenmap">
      <div className="listenmap-head">
        <button
          type="button"
          className={`btn go listen-btn${playing ? ' on' : ''}`}
          onClick={() => {
            if (playing) {
              audio.current?.pause();
              setPlaying(false);
            } else play();
          }}
        >
          {playing ? <Pause className="i" /> : <Play className="i" />} {playing ? t('puzzle.listening') : t('puzzle.listenAgain')}
        </button>
        <span className="muted">{t('puzzle.soundRound', { at: at + 1, of: rounds.length })}</span>
      </div>

      <figure className="worldmap">
        <div className="worldmap-frame">
          <img src="./images/map/world.png" alt={t('geo.mapAlt')} />
          {puzzle.rounds.map((r) => {
            const { x, y } = project(r.pin);
            const state = right && r.id === round.id ? ' picked' : wrong === r.id ? ' wrong shake' : '';
            return (
              <button key={r.id} type="button" className={`country-pin${state}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => pick(r.id)}>
                <MapPin className="i" />
                <span>{tx(r.country, lang)}</span>
              </button>
            );
          })}
        </div>
      </figure>

      {right && (
        <Feedback
          kind="good"
          title={`${tx(round.instrument, lang)}, ${tx(round.country, lang)}`}
          actions={
            !last && (
              <button
                className="btn go"
                onClick={() => {
                  sfx('click');
                  setRight(false);
                  setAt((i) => i + 1);
                }}
              >
                {t('card.next')} <ArrowRight className="i flip" />
              </button>
            )
          }
        >
          {tx(round.note, lang)}
        </Feedback>
      )}
    </div>
  );
}
