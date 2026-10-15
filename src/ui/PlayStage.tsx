import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Shuffle, X } from 'lucide-react';
import type { CategoryId, Fact, Hotspot, Lang, SourceType } from '../types/content';
import { tx } from '../content/loader';
import { CATEGORY_STYLE } from '../content/categories';
import { sfx } from '../audio/sfx';
import { rephrasePrompt } from '../llm/variants';
import { player } from '../three/playerState';
import { useApp } from '../state/store';
import { PuzzleRouter } from '../activities/puzzles/PuzzleRouter';
import { AudioMatchActivity, QuizRun, VideoActivity } from '../activities/Activities';
import { Feedback } from '../activities/Answers';
import { IconButton, SourceTag } from './Parts';

/**
 * The play stage: an activity gets the whole screen instead of a 400px column,
 * so there is room to drag, drop and read the choices. Opened by "Let's play!"
 * under what the kid just read, and closed back to that same card.
 */
export function PlayStage({
  hotspot: h,
  facts,
  category,
  lang,
  onCorrect,
  onWrong,
  onClose,
}: {
  hotspot: Hotspot;
  facts: Fact[];
  category: CategoryId;
  lang: Lang;
  onCorrect: () => void;
  onWrong: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [round, setRound] = useState(0);
  const [solved, setSolved] = useState(false);
  // a hands-on game can keep its old questions as an optional extra round
  const [bonus, setBonus] = useState(false);
  const [prompt, setPrompt] = useState<{ text: string; sourceType: SourceType } | null>(null);
  const puzzle = h.puzzle;
  const award = useApp((s) => s.award);
  const name = useApp((s) => s.name);
  // fewer slips, more stars: none = 3, one or two = 2, more = 1
  const slips = useRef(0);
  const win = () => {
    setSolved(true);
    award(h.id, slips.current === 0 ? 3 : slips.current <= 2 ? 2 : 1);
  };
  const slip = () => {
    slips.current += 1;
    onWrong();
  };
  const accent = CATEGORY_STYLE[category]?.color;

  // While the stage is up, the arrow keys belong to the game, not to walking.
  useEffect(() => {
    player.frozen = true;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      player.frozen = false;
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const nextRound = async () => {
    sfx('click');
    setSolved(false);
    setBonus(false);
    slips.current = 0;
    setRound((r) => r + 1);
    if (puzzle) setPrompt(await rephrasePrompt(tx(puzzle.prompt, lang), lang));
  };

  return (
    <div className="stage-wrap" role="dialog" aria-modal="true" aria-labelledby="stage-title" style={{ '--accent': accent } as CSSProperties}>
      <section className="slab stage">
        <header className="slab-head">
          <h2 id="stage-title">
            {tx(h.title, lang)}
          </h2>
          <IconButton
            label={t('card2.close')}
            onClick={() => {
              sfx('click');
              onClose();
            }}
          >
            <X className="i" />
          </IconButton>
        </header>

        <div className="slab-body stage-body">
          {puzzle && !bonus && (
            <div className="row stage-prompt">
              <strong>{prompt?.text ?? tx(puzzle.prompt, lang)}</strong>
              {prompt?.sourceType === 'ai-grounded' && <SourceTag type="ai-grounded" />}
            </div>
          )}
          <div className="stage-play" key={`${round}-${lang}`}>
            {(h.contentType === 'quiz' || bonus) && h.quiz && (
              <QuizRun hotspot={h} facts={facts} lang={lang} round={round} onCorrect={onCorrect} onWrong={onWrong} onComplete={(n) => { setSolved(true); award(h.id, n); }} onMore={nextRound} />
            )}
            {h.contentType === 'puzzle' && puzzle && !bonus && (
              <PuzzleRouter
                puzzle={puzzle}
                lang={lang}
                seed={round}
                onSolved={() => {
                  win();
                  onCorrect();
                }}
                onWrong={slip}
                photos={navigator.onLine}
              />
            )}
            {h.contentType === 'video' && h.video && <VideoActivity spec={h.video} facts={facts} lang={lang} />}
            {h.contentType === 'audio-match' && h.audioMatch && (
              <AudioMatchActivity spec={h.audioMatch} lang={lang} round={round} onSolved={win} onWrong={slip} />
            )}
          </div>

          {/* quizzes show their own result screen; everything else gets the fun fact here */}
          {solved && !bonus && h.contentType !== 'quiz' && (
            <Feedback
              kind="good"
              title={name ? t('card2.solvedNamed', { name }) : h.contentType === 'puzzle' ? t('card2.solvedTitle') : t('card.correct')}
              actions={
                <>
                  <button className="btn go" onClick={nextRound}>
                    <Shuffle className="i" /> {t('card2.moreRound')}
                  </button>
                  {h.quiz && (
                    <button className="btn" onClick={() => setBonus(true)}>
                      {t('stage.bonus')}
                    </button>
                  )}
                  <button className="btn" onClick={onClose}>
                    <Check className="i" /> {t('stage.done')}
                  </button>
                </>
              }
            >
              <strong>{t('card.funFact')}</strong> {tx(h.funFact, lang)}
            </Feedback>
          )}
        </div>
      </section>
    </div>
  );
}
