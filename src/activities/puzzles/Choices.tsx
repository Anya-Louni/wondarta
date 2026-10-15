import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CipherPuzzle, Lang, NameThatXPuzzle, OddOneOutPuzzle, PatternSeriesPuzzle, RebusPuzzle, RiddlePuzzle } from '../../types/content';
import { tx } from '../../content/loader';
import { MediaView } from '../../ui/MediaView';
import { NarrationText } from '../../ui/NarrationText';
import { AnswerList } from '../Answers';
import { WondooLine } from '../../ui/Parts';
import { seeded, type PuzzleProps } from './types';

// ------------------------------------------------------------ name-that-x (Encarta "Name That...")

export function NameThatX({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<NameThatXPuzzle>) {
  const { t } = useTranslation();
  const rounds = useMemo(() => seeded(puzzle.rounds, seed).slice(0, puzzle.show), [puzzle, seed]);
  const [i, setI] = useState(0);
  const r = rounds[i];
  return (
    <div>
      <div className="qbar">
        <div className="pips">
          {rounds.map((_, k) => (
            <span key={k} className={`pip${k < i ? ' done' : k === i ? ' now' : ''}`} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{t('puzzle.whichOne')}</span>
      </div>
      <div style={{ display: 'grid', placeItems: 'center', marginBlock: '4px 12px' }}>
        <MediaView media={r.media} size="big" photos={photos} />
      </div>
      <AnswerList
        key={r.id}
        seed={seed + i}
        choices={r.choices.map((c) => tx(c, lang))}
        answerIndex={r.answerIndex}
        onWrong={onWrong}
        onRight={() => window.setTimeout(() => (i + 1 < rounds.length ? setI(i + 1) : onSolved()), 650)}
      />
    </div>
  );
}

// ------------------------------------------------------------ odd-one-out

export function OddOneOut({ puzzle, lang, seed, onSolved, onWrong, photos }: PuzzleProps<OddOneOutPuzzle>) {
  const opts = useMemo(() => seeded(puzzle.options, seed), [puzzle, seed]);
  const [done, setDone] = useState(false);
  return (
    <div>
      <AnswerList
        media
        seed={0}
        choices={opts.map((o) => tx(o.label, lang))}
        answerIndex={opts.findIndex((o) => o.id === puzzle.answerId)}
        render={(i) => (
          <>
            <MediaView media={opts[i].media} photos={photos} label={tx(opts[i].label, lang)} />
            <span>{tx(opts[i].label, lang)}</span>
          </>
        )}
        onWrong={onWrong}
        onRight={() => {
          setDone(true);
          onSolved();
        }}
      />
      {done && <p className="muted" style={{ marginBlockEnd: 0 }}>{tx(puzzle.explanation, lang)}</p>}
    </div>
  );
}

// ------------------------------------------------------------ pattern-series

export function PatternSeries({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<PatternSeriesPuzzle>) {
  const choices = useMemo(() => seeded(puzzle.choices, seed), [puzzle, seed]);
  const [answer, setAnswer] = useState<PatternSeriesPuzzle['choices'][number] | null>(null);
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;
  return (
    <div>
      <div className="sequence">
        {puzzle.sequence.map((s, i) => (
          <div key={i} className="row" style={{ gap: 4 }}>
            <div className="tile" style={{ cursor: 'default' }}>
              <MediaView media={s.media} label={tx(s.label, lang)} />
              <span>{tx(s.label, lang)}</span>
            </div>
            <Arrow className="i arrow" />
          </div>
        ))}
        <div className="tile dropzone" style={{ cursor: 'default', blockSize: 84, alignContent: 'center' }}>
          {answer ? (
            <>
              <MediaView media={answer.media} />
              <span>{tx(answer.label, lang)}</span>
            </>
          ) : (
            <strong style={{ fontSize: 26, color: 'var(--sky-500)' }}>?</strong>
          )}
        </div>
      </div>
      <AnswerList
        media
        seed={seed}
        choices={choices.map((c) => tx(c.label, lang))}
        answerIndex={choices.findIndex((c) => c.id === puzzle.answerId)}
        render={(i) => (
          <>
            <MediaView media={choices[i].media} label={tx(choices[i].label, lang)} />
            <span>{tx(choices[i].label, lang)}</span>
          </>
        )}
        onWrong={onWrong}
        onRight={() => {
          setAnswer(choices.find((c) => c.id === puzzle.answerId)!);
          onSolved();
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------ riddle

export function Riddle({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<RiddlePuzzle>) {
  return (
    <div>
      <div className="answer-box" style={{ marginBlock: '0 12px', fontStyle: 'italic' }}>
        <NarrationText text={tx(puzzle.riddle, lang)} className="" />
      </div>
      <AnswerList seed={seed} choices={puzzle.choices.map((c) => tx(c, lang))} answerIndex={puzzle.answerIndex} onRight={onSolved} onWrong={onWrong} />
    </div>
  );
}

// ------------------------------------------------------------ rebus (the picture is real 3D, in the scene)

export function Rebus({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<RebusPuzzle>) {
  const { t } = useTranslation();
  return (
    <div>
      <WondooLine>{t('puzzle.lookScene')}</WondooLine>
      <AnswerList seed={seed} choices={puzzle.choices.map((c) => tx(c, lang))} answerIndex={puzzle.answerIndex} onRight={onSolved} onWrong={onWrong} />
    </div>
  );
}

// ------------------------------------------------------------ cipher

export const ALPHABETS: Record<Lang, string[]> = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  fr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  // hijā'ī order, 28 letters
  ar: 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' '),
};

/** Encoded text is computed from the locked plain word, so it can never contain a typo. */
export function shiftText(text: string, shift: number, lang: Lang): string {
  const abc = ALPHABETS[lang];
  return [...text]
    .map((ch) => {
      const i = abc.indexOf(ch.toUpperCase());
      return i < 0 ? ch : abc[(i + shift + abc.length) % abc.length];
    })
    .join('');
}

export function Cipher({ puzzle, lang, seed, onSolved, onWrong }: PuzzleProps<CipherPuzzle>) {
  const { t } = useTranslation();
  const plain = tx(puzzle.plain, lang);
  const encoded = shiftText(plain, puzzle.shift, lang);
  const choices = puzzle.choices.map((c) => tx(c, lang));
  return (
    <div>
      <div className="muted">{t('puzzle.encoded')}</div>
      {/* spaced letters show each letter's isolated form: easier to decode, including Arabic */}
      <div className="cipher-word" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {encoded.split('').join(' ')}
      </div>
      <div className="muted">{t('puzzle.alphabet')}</div>
      <div className="alphabet">
        {ALPHABETS[lang].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <AnswerList seed={seed} choices={choices} answerIndex={choices.indexOf(plain)} onRight={onSolved} onWrong={onWrong} />
    </div>
  );
}
