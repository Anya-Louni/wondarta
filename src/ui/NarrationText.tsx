import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Lang } from '../types/content';
import { lookupWord, tx } from '../content/loader';
import { learnMoreFromWiki, type GroundedResult } from '../llm/grounded';
import { useApp } from '../state/store';
import { sfx } from '../audio/sfx';
import { Search, X } from 'lucide-react';
import { Citation, IconButton, SourceTag } from './Parts';

interface Segment {
  text: string;
  word: boolean;
}

function segment(text: string, lang: Lang): Segment[] {
  // Intl.Segmenter handles Arabic and French word boundaries correctly.
  if ('Segmenter' in Intl) {
    const seg = new Intl.Segmenter(lang, { granularity: 'word' });
    return [...seg.segment(text)].map((s) => ({ text: s.segment, word: Boolean(s.isWordLike) }));
  }
  return text.split(/(\s+)/).map((s) => ({ text: s, word: /\S/.test(s) }));
}

interface Tip {
  word: string;
  x: number;
  y: number;
}

/**
 * Narration where every word is clickable for an instant definition
 * (Encarta's built-in dictionary pattern). Definitions come from the curated,
 * locked glossary; unknown words can be looked up through the same
 * Wikipedia-grounded pipeline (never the model's own memory).
 */
export function NarrationText({ text, sceneId, className = 'narration' }: { text: string; sceneId?: string; className?: string }) {
  const lang = useApp((s) => s.lang);
  const [tip, setTip] = useState<Tip | null>(null);
  const segs = useMemo(() => segment(text, lang), [text, lang]);

  return (
    <>
      <p className={className}>
        {segs.map((s, i) =>
          s.word ? (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className={`word${lookupWord(s.text, lang, sceneId) ? ' known' : ''}`}
              onClick={(e) => {
                const r = (e.target as HTMLElement).getBoundingClientRect();
                sfx('click');
                setTip({ word: s.text, x: r.left, y: r.bottom + 6 });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLElement).click();
              }}
            >
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {tip && <WordTooltip tip={tip} sceneId={sceneId} onClose={() => setTip(null)} />}
    </>
  );
}

function WordTooltip({ tip, sceneId, onClose }: { tip: Tip; sceneId?: string; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const entry = lookupWord(tip.word, lang, sceneId);
  const [lookup, setLookup] = useState<GroundedResult | 'loading' | null>(null);

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const left = Math.max(12, Math.min(tip.x, window.innerWidth - 312));
  const top = Math.min(tip.y, window.innerHeight - 180);

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={onClose} />
      <div className="slab tooltip" style={{ left, top }} /* pixel anchor at the clicked word, direction-agnostic */ role="dialog" aria-label={tip.word}>
        <div className="slab-body">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <strong>{tip.word}</strong>
            <IconButton small label={t('tooltip.close')} onClick={onClose}>
              <X className="i" />
            </IconButton>
          </div>
          {entry ? (
            <>
              <p style={{ margin: '4px 0 8px' }}>{tx(entry.definition, lang)}</p>
              <SourceTag type="curated" />
            </>
          ) : lookup === null ? (
            <>
              <p className="muted" style={{ margin: '4px 0 8px' }}>{t('tooltip.none')}</p>
              <button
                className="link"
                onClick={async () => {
                  setLookup('loading');
                  const prompt = { en: `What does the word "${tip.word}" mean? Explain in one short sentence.`, fr: `Que veut dire le mot « ${tip.word} » ? Explique en une phrase courte.`, ar: `ما معنى كلمة «${tip.word}»؟ اشرحها بجملة قصيرة.` }[lang];
                  setLookup(await learnMoreFromWiki(tip.word, tip.word, lang, prompt));
                }}
              >
                <Search className="i" /> {t('tooltip.lookup')}
              </button>
            </>
          ) : lookup === 'loading' ? (
            <p className="muted">{t('card.loading')}</p>
          ) : lookup.status === 'ok' ? (
            <>
              <p style={{ margin: '4px 0 8px' }}>{lookup.text}</p>
              <SourceTag type={lookup.sourceType} />
              <Citation meta={lookup.sourceMeta} />
            </>
          ) : (
            <p className="muted">{t(lookup.status === 'asleep' ? 'mascot.sleepLines.0' : lookup.status === 'offline' ? 'ask.offline' : 'ask.notFound')}</p>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
