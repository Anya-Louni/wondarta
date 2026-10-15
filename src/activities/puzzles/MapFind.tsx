import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { MapFindPuzzle } from '../../types/content';
import type { ContinentId } from '../../content/geo';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import { MediaView } from '../../ui/MediaView';
import { WorldMap } from '../../ui/WorldMap';
import { Feedback } from '../Answers';
import { seeded, type PuzzleProps } from './types';

/**
 * The atlas game: an animal, a world map, and "where does it live?". Getting
 * it right drops real pins on its range, the way a children's atlas puts the
 * animal's icon on the continent it comes from.
 */
export function MapFind({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<MapFindPuzzle>) {
  const { t } = useTranslation();
  const rounds = useMemo(() => seeded(puzzle.rounds, seed), [puzzle, seed]);
  const [at, setAt] = useState(0);
  const [wrong, setWrongPick] = useState<ContinentId | null>(null);
  const [right, setRight] = useState(false);
  const round = rounds[at];
  const last = at === rounds.length - 1;

  const pick = (id: ContinentId) => {
    if (right) return;
    if (id === round.answer) {
      sfx('correct');
      setRight(true);
      setWrongPick(null);
      if (last) onSolved();
    } else {
      setWrongPick(id);
      window.setTimeout(() => setWrongPick(null), 600);
      onWrong();
    }
  };

  return (
    <div className="mapfind">
      <div className="mapfind-head">
        <MediaView media={round.media} photos={photos} size="big" />
        <div>
          <strong>{tx(round.question, lang)}</strong>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {t('puzzle.mapRound', { at: at + 1, of: rounds.length })}
          </p>
        </div>
      </div>

      <WorldMap
        options={puzzle.options}
        picked={right ? round.answer : null}
        wrong={wrong}
        highlight={right ? round.answer : undefined}
        pins={right ? round.pins : []}
        onPick={pick}
      />

      {right && last && (
        <p className="flower-news">
          <strong>{t(`geo.${round.answer}`)}:</strong> {tx(round.note, lang)}
        </p>
      )}
      {right && !last && (
        <Feedback
          kind="good"
          title={t(`geo.${round.answer}`)}
          actions={
            !last && (
              <button
                className="btn go"
                onClick={() => {
                  sfx('click');
                  setAt((i) => i + 1);
                  setRight(false);
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
