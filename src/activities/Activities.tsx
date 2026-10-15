import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Lightbulb, Play, RotateCcw, Star, Volume2 } from 'lucide-react';
import type { AudioMatch, Fact, Hotspot, Lang, Quiz, SourceType, VideoSpec } from '../types/content';
import { tx } from '../content/loader';
import { frameQuiz } from '../llm/mascot';
import { moreQuiz } from '../llm/variants';
import { useApp } from '../state/store';
import { useLines } from '../i18n';
import { speak, hasVoice } from '../audio/tts';
import { wikiVideo } from '../wiki/wikipedia';
import { modelThumb } from '../models';
import { WondooLine, SourceTag, StarRow } from '../ui/Parts';
import { AnswerList, Feedback } from './Answers';
import { seeded } from './puzzles/types';

// ------------------------------------------------------------ quiz run (MindMaze + Encarta)

interface Q {
  question: string;
  choices: string[];
  answerIndex: number;
  factId: string;
  sourceType: SourceType;
}

const QUESTION_SECONDS = 20;

/** Stars for one question: MindMaze rewarded speed; we never punish below 1. */
function starsFor(seconds: number, wrongs: number, hinted: boolean) {
  const base = seconds < 10 ? 3 : seconds < QUESTION_SECONDS ? 2 : 1;
  return Math.max(1, base - wrongs - (hinted ? 1 : 0));
}

function TimerRing({ start, stopped }: { start: number; stopped: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (stopped) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [stopped]);
  const frac = Math.min(1, (now - start) / 1000 / QUESTION_SECONDS);
  const c = 2 * Math.PI * 10;
  const color = frac < 0.5 ? '#62cf4c' : frac < 1 ? '#f5b700' : '#9fb3c2';
  return (
    <span className="timer" aria-hidden>
      <svg viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="10" fill="none" stroke="rgba(16,78,125,0.14)" strokeWidth="4" />
        <circle cx="13" cy="13" r="10" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(1 - frac) * c} ${c}`} />
      </svg>
    </span>
  );
}

export function QuizRun({
  hotspot,
  facts,
  lang,
  round,
  onCorrect,
  onWrong,
  onComplete,
  onMore,
}: {
  hotspot: Hotspot;
  facts: Fact[];
  lang: Lang;
  round: number;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: (stars: number) => void;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  const line = useLines();
  const say = useApp((s) => s.say);
  const [qs, setQs] = useState<Q[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'ask' | 'right' | 'done'>('ask');
  const [wrongs, setWrongs] = useState(0);
  const [hint, setHint] = useState<number[]>([]);
  const [stars, setStars] = useState<number[]>([]);
  const [start, setStart] = useState(Date.now());
  const [nimbo, setWondoo] = useState(tx(hotspot.mascotLine, lang));

  // Build the run: curated questions first time; "I want more!" asks Gemini for a grounded variant.
  useEffect(() => {
    let alive = true;
    const curated = (q: Quiz): Q => ({
      question: tx(q.question, lang),
      choices: q.choices.map((c) => tx(c, lang)),
      answerIndex: q.answerIndex,
      factId: q.factId,
      sourceType: 'curated',
    });
    (async () => {
      let list: Q[];
      if (round === 0) list = [hotspot.quiz!, ...(hotspot.moreQuestions ?? [])].map(curated);
      else {
        const v = await moreQuiz(hotspot, facts, lang, tx(hotspot.quiz!.question, lang));
        list = v ? [{ ...v }] : [curated(hotspot.quiz!)];
      }
      if (!alive) return;
      setQs(list);
      setIdx(0);
      setPhase('ask');
      setStars([]);
      setStart(Date.now());
    })();
    return () => {
      alive = false;
    };
  }, [hotspot, facts, lang, round]);

  // Wondoo introduces each question (Groq framing for the first, pre-written lines after).
  useEffect(() => {
    if (!qs || phase !== 'ask') return;
    let alive = true;
    const q = qs[idx];
    (async () => {
      const intro = idx === 0 ? await frameQuiz(hotspot, hotspot.quiz!.question, hotspot.quiz!.choices[hotspot.quiz!.answerIndex], lang) : line('quiz.nextLines');
      if (!alive) return;
      setWondoo(intro);
      say(intro);
      speak(`${intro} ${q.question}`, lang);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, idx]);

  if (!qs) return <p className="muted">{t('card.loading')}</p>;
  const q = qs[idx];
  const fact = facts.find((f) => f.id === q.factId);
  const total = qs.length;
  const max = total * 3;
  const sum = stars.reduce((a, b) => a + b, 0);

  if (phase === 'done') {
    const rating = Math.max(1, Math.round((sum / max) * 3));
    return (
      <div className="result">
        <h3 style={{ margin: 0 }}>{t('quiz.resultTitle')}</h3>
        <StarRow n={rating} max={3} />
        <p className="muted" style={{ marginBlock: '0 4px' }}>{t('quiz.resultBody', { stars: sum, max })}</p>
        <Feedback kind="good" title={t('card.funFact')} actions={
          <button className="btn go" onClick={onMore}>
            <RotateCcw className="i" /> {t('card2.moreRound')}
          </button>
        }>
          {tx(hotspot.funFact, lang)}
        </Feedback>
      </div>
    );
  }

  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setPhase('ask');
      setWrongs(0);
      setHint([]);
      setStart(Date.now());
    } else {
      setPhase('done');
      onComplete(Math.max(1, Math.round((stars.reduce((a, b) => a + b, 0) / (qs.length * 3)) * 3)));
    }
  };

  return (
    <div>
      <WondooLine>{nimbo}</WondooLine>
      <div className="qbar">
        <div className="pips" aria-label={t('quiz.questionOf', { n: idx + 1, total })}>
          {qs.map((_, i) => (
            <span key={i} className={`pip${i < idx || (i === idx && phase === 'right') ? ' done' : i === idx ? ' now' : ''}`} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>
          {t('quiz.questionOf', { n: idx + 1, total })}
        </span>
        <span className="spacer" />
        <span className="stars">
          <Star className="i" /> {sum}
        </span>
        <TimerRing start={start} stopped={phase !== 'ask'} />
      </div>
      <div className="row" style={{ alignItems: 'flex-start', marginBlockEnd: 2 }}>
        <p className="question" style={{ flex: 1 }}>{q.question}</p>
        {q.sourceType !== 'curated' && <SourceTag type={q.sourceType} />}
      </div>
      <AnswerList
        key={`${round}-${idx}`}
        seed={round * 7 + idx}
        choices={q.choices}
        answerIndex={q.answerIndex}
        removed={hint}
        onWrong={() => {
          setWrongs((w) => w + 1);
          onWrong();
        }}
        onRight={() => {
          const s = starsFor((Date.now() - start) / 1000, wrongs, hint.length > 0);
          setStars((a) => [...a, s]);
          setPhase('right');
          onCorrect();
        }}
      />
      {phase === 'ask' && (
        <div className="row" style={{ marginBlockStart: 10 }}>
          <button
            className="link"
            disabled={hint.length > 0}
            onClick={() => {
              const wrongIdx = seeded(q.choices.map((_, i) => i).filter((i) => i !== q.answerIndex), idx + 3)[0];
              setHint([wrongIdx]);
              setWondoo(t('quiz.hintUsed'));
            }}
          >
            <Lightbulb className="i" /> {t('quiz.hint')}
          </button>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 11 }}>{t('quiz.keysHint')}</span>
        </div>
      )}
      {phase === 'right' && (
        <Feedback
          kind="good"
          title={`${t('quiz.correctTitle')} +${stars[stars.length - 1]}`}
          actions={
            <button className="btn primary" onClick={next} autoFocus>
              {idx + 1 < total ? t('quiz.next') : t('quiz.results')} <ArrowRight className="i flip" />
            </button>
          }
        >
          {fact && (
            <>
              <strong>{t('quiz.didYouKnow')}</strong> {tx(fact.text, lang)}
            </>
          )}
        </Feedback>
      )}
    </div>
  );
}

// ------------------------------------------------------------ video

export function VideoActivity({ spec, facts, lang }: { spec: VideoSpec; facts: Fact[]; lang: Lang }) {
  const { t } = useTranslation();
  const [video, setVideo] = useState<{ src: string; file: string; page: string } | null | 'loading'>('loading');
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!navigator.onLine) setVideo(null);
    else wikiVideo(spec.wikiArticle).then((v) => alive && setVideo(v));
    return () => {
      alive = false;
    };
  }, [spec.wikiArticle]);

  const showSlides = video === null || failed;
  useEffect(() => {
    if (!showSlides) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % spec.frames.length), 4500);
    return () => window.clearInterval(id);
  }, [showSlides, spec.frames.length]);

  if (video === 'loading') return <p className="muted">{t('video.loading')}</p>;
  if (!showSlides && video) {
    return (
      <div>
        <video className="video-frame" src={video.src} controls playsInline preload="metadata" onError={() => setFailed(true)} />
        <div className="cite">
          <a href={video.page} target="_blank" rel="noreferrer noopener">
            {t('source.video', { file: video.file })}
          </a>
        </div>
      </div>
    );
  }
  // Fallback picture show: every caption is a locked, curated fact.
  const f = spec.frames[frame];
  const fact = facts.find((x) => x.id === f.factId);
  return (
    <div className="slideshow" aria-live="polite">
      <img src={modelThumb(f.media.model, 320)} alt="" />
      <div>{fact ? tx(fact.text, lang) : ''}</div>
      <small style={{ opacity: 0.7 }}>
        {t('video.pictureShow')} · {frame + 1}/{spec.frames.length}
      </small>
    </div>
  );
}

// ------------------------------------------------------------ audio-match

export function AudioMatchActivity({ spec, lang, round, onSolved, onWrong }: { spec: AudioMatch; lang: Lang; round: number; onSolved: () => void; onWrong: () => void }) {
  const { t } = useTranslation();
  const clips = useMemo(() => seeded(spec.clips, round + 1), [spec, round]);
  const answers = useMemo(() => spec.clips.map((c) => tx(c.answer, lang)), [spec, lang]);
  const [i, setI] = useState(0);
  const [played, setPlayed] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const clip = clips[i];

  const play = () => {
    const ok = speak(clip.text, clip.speakLang, { rate: 0.85 });
    setPlayed(true);
    setNoVoice(!ok);
  };

  return (
    <div>
      <div className="qbar">
        <div className="pips">
          {clips.map((_, k) => (
            <span key={k} className={`pip${k < i ? ' done' : k === i ? ' now' : ''}`} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{tx(spec.prompt, lang)}</span>
      </div>
      <div className="row" style={{ justifyContent: 'center', marginBlock: 8 }}>
        <button className="btn primary" onClick={play}>
          {played ? <Volume2 className="i" /> : <Play className="i" />} {t('puzzle.play')}
        </button>
        {(played || !hasVoice(lang)) && (
          <strong style={{ fontSize: 20 }} lang={clip.speakLang}>
            {clip.text}
          </strong>
        )}
      </div>
      {noVoice && <p className="muted">{t('card.noVoice')}</p>}
      <AnswerList
        key={clip.id}
        seed={round + i}
        choices={answers}
        answerIndex={spec.clips.findIndex((c) => c.id === clip.id)}
        onWrong={onWrong}
        onRight={() =>
          window.setTimeout(() => {
            if (i + 1 < clips.length) {
              setI(i + 1);
              setPlayed(false);
            } else onSolved();
          }, 600)
        }
      />
    </div>
  );
}

