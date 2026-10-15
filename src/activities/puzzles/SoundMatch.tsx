import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Volume2 } from 'lucide-react';
import type { SoundMatchPuzzle } from '../../types/content';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import { useApp } from '../../state/store';
import { MediaView } from '../../ui/MediaView';
import { Feedback } from '../Answers';
import { seeded, type PuzzleProps } from './types';

/**
 * Sound Safari: a real recording plays, the kid picks who made it. Every clip
 * is a field recording of the actual animal (see CREDITS.md), never a voice
 * actor, so what they learn to recognise is the real thing.
 */
export function SoundMatch({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<SoundMatchPuzzle>) {
  const { t } = useTranslation();
  const soundOn = useApp((s) => s.sound);
  const rounds = useMemo(() => {
    const order = seeded(puzzle.animals, seed).slice(0, puzzle.show);
    return order.map((a, i) => {
      const others = seeded(puzzle.animals.filter((o) => o.id !== a.id), seed + i + 1).slice(0, puzzle.choices - 1);
      return { answer: a, choices: seeded([a, ...others], seed + i + 7) };
    });
  }, [puzzle, seed]);
  const [at, setAt] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const round = rounds[at];
  const last = at === rounds.length - 1;

  const play = () => {
    audio.current?.pause();
    const a = new Audio(`./audio/animals/${round.answer.sound}.mp3`);
    a.volume = soundOn ? 1 : 0.6; // the game IS the sound: play it even if UI sounds are muted
    a.onended = () => setPlaying(false);
    audio.current = a;
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
  };

  // each new round starts by playing its sound once
  useEffect(() => {
    setRight(false);
    setWrong(null);
    const id = window.setTimeout(play, 350);
    return () => {
      window.clearTimeout(id);
      audio.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, rounds]);

  const pick = (id: string) => {
    if (right) return;
    if (id === round.answer.id) {
      sfx('correct');
      setRight(true);
      if (last) onSolved();
    } else {
      setWrong(id);
      window.setTimeout(() => setWrong(null), 500);
      onWrong();
    }
  };

  return (
    <div className="soundmatch">
      <div className="soundmatch-head">
        <button type="button" className={`big-play${playing ? ' playing' : ''}`} onClick={play} aria-label={t('puzzle.playSound')}>
          <Volume2 className="i" />
        </button>
        <div>
          <strong>{t('puzzle.whoIsThat')}</strong>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {t('puzzle.soundRound', { at: at + 1, of: rounds.length })}
          </p>
        </div>
      </div>

      <div className="tiles soundmatch-choices">
        {round.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`tile${right && c.id === round.answer.id ? ' good' : ''}${wrong === c.id ? ' shake' : ''}`}
            onClick={() => pick(c.id)}
          >
            <MediaView media={c.media} photos={photos} size="big" label={tx(c.label, lang)} />
            <span>{tx(c.label, lang)}</span>
          </button>
        ))}
      </div>

      {right && last && (
        <p className="flower-news">
          <strong>{tx(round.answer.label, lang)}:</strong> {tx(round.answer.note, lang)}
        </p>
      )}
      {right && !last && (
        <Feedback
          kind="good"
          title={tx(round.answer.label, lang)}
          actions={
            !last && (
              <button
                className="btn go"
                onClick={() => {
                  sfx('click');
                  setAt((i) => i + 1);
                }}
              >
                {t('card.next')} <ArrowRight className="i flip" />
              </button>
            )
          }
        >
          {tx(round.answer.note, lang)}
        </Feedback>
      )}
    </div>
  );
}
