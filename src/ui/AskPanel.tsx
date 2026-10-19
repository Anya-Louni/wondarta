import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Search, X, Sparkles } from 'lucide-react';
import { askAnything, type GroundedResult } from '../llm/grounded';
import { llmAwake, useApp, type WonderVisit } from '../state/store';
import { matchWonder } from '../content/wonders';
import { retrieve } from '../wiki/wikipedia';
import { looksUnsafe } from '../llm/guards';
import { sfx } from '../audio/sfx';
import { mascotBus } from '../three/playerState';
import { speak } from '../audio/tts';
import { Citation, IconButton, SourceTag } from './Parts';
import { MicButton } from './MicButton';
import { SleepLine } from './Hud';

/**
 * "Ask about anything": Wikipedia retrieval first; Gemini may only restate the
 * retrieved text. Limited per free session (UI/business logic only;
 * `plan: 'unlimited'` in the store is the hook for a future tier).
 */
/** "What is a rainbow?" -> "rainbow": search Wikipedia for the thing, not the question. */
const QUESTION_WORDS = /^(what|who|why|how|where|when|which|is|are|was|do|does|did|can|could|a|an|the|of|tell|me|about|work|works|made|make|qu|est|ce|que|qui|quoi|comment|pourquoi|où|quand|quel|quelle|quels|quelles|un|une|le|la|les|l|des|du|de|d|c|fonctionne|marche|ما|ماذا|من|لماذا|كيف|أين|متى|هو|هي|هل|عن|تعمل|يعمل)$/i;
function topicOf(question: string): string {
  const words = question.replace(/[?؟!.,«»"“”]/g, ' ').split(/[\s']+/).filter(Boolean);
  const kept = words.filter((w) => !QUESTION_WORDS.test(w));
  return (kept.length ? kept : words).join(' ');
}

/** Split text into sentences for the tour's pages. */
function sentences(text: string): string[] {
  return (text.match(/[^.!?؟]+[.!?؟]+/g) ?? [text]).map((x) => x.trim()).filter((x) => x.length > 20).map((x) => (x.length > 280 ? x.slice(0, 277) + '…' : x));
}

export function AskPanel() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const setAskOpen = useApp((s) => s.setAskOpen);
  const consumeAsk = useApp((s) => s.consumeAsk);
  const asksLeft = useApp((s) => s.asksLeft());
  const say = useApp((s) => s.say);
  useApp((s) => s.providers.gemini); // re-render when the provider wakes/sleeps
  useApp((s) => s.bedtime);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<GroundedResult | 'limit' | null>(null);
  const awake = llmAwake('gemini');

  const [offer, setOffer] = useState<WonderVisit | null>(null);
  const visitWonder = useApp((s) => s.visitWonder);

  const submit = async (text = q) => {
    const query = text.trim();
    if (!query || busy) return;
    if (looksUnsafe(query)) return setRes({ status: 'unsuitable' });
    sfx('click');
    setBusy(true);
    setRes(null);
    setOffer(null);
    say(t('ask.thinking'));
    mascotBus.emit('think');
    // a hand-built world if there is one; otherwise Wikipedia (no key needed) gives the world its pages
    const built = matchWonder(query, lang);
    const [r, page] = await Promise.all([
      awake ? (consumeAsk() ? askAnything(query, lang) : Promise.resolve('limit' as const)) : Promise.resolve(null),
      built ? Promise.resolve(null) : retrieve(topicOf(query), lang).catch(() => null),
    ]);
    setBusy(false);
    say(null);
    setRes(r);
    const kid = r && r !== 'limit' && r.status === 'ok' ? r.text : null;
    const next: WonderVisit | null = built
      ? { kind: 'built', id: built.id }
      : page
        ? {
            kind: 'wiki',
            title: page.title,
            url: page.url,
            parts: sentences(kid ?? page.text).slice(0, 3),
            videoTitle: page.edition === 'en' || page.edition === 'simple' ? page.title : undefined,
          }
        : null;
    setOffer(next);
    if (kid) {
      sfx('correct');
      speak(kid, lang);
    }
    if (next) {
      mascotBus.emit('happy');
      if (!kid) speak(t('wonder.followMe'), lang);
    } else if (!r) setRes({ status: 'not-found' });
  };

  return (
    <section className="slab popover" role="dialog" aria-labelledby="ask-title">
      <header className="slab-head">
        <h2 id="ask-title">
          {awake && <span className="kicker">{Number.isFinite(asksLeft) ? t('hud.asksLeft', { count: asksLeft }) : t('hud.asksUnlimited')}</span>}
          {t('ask.title')}
        </h2>
        <IconButton small label={t('card2.close')} onClick={() => setAskOpen(false)}>
          <X className="i" />
        </IconButton>
      </header>
      <div className="slab-body">
        {(
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Search className="i" color="var(--ink-300)" />
            <input autoFocus value={q} maxLength={140} onChange={(e) => setQ(e.target.value)} placeholder={t('ask.placeholder')} aria-label={t('ask.placeholder')} disabled={busy} />
            <MicButton
              lang={lang}
              disabled={busy}
              onText={(said) => {
                setQ(said);
                void submit(said);
              }}
            />
            <IconButton small type="submit" label={t('ask.go')} disabled={busy || !q.trim()}>
              <ArrowRight className="i flip" />
            </IconButton>
          </form>
        )}
        {busy && <p className="muted" style={{ marginBlockEnd: 0 }}>{t('ask.thinking')}</p>}
        {awake && (res === 'limit' || (asksLeft <= 0 && !res)) && (
          <div className="answer-box">
            {t('ask.limit')}
            <div className="muted" style={{ marginBlockStart: 4 }}>{t('ask.upgradeNote')}</div>
          </div>
        )}
        {res && res !== 'limit' && (
          <div className="answer-box" aria-live="polite">
            {res.status === 'ok' ? (
              <>
                <p style={{ margin: '0 0 8px' }}>{res.text}</p>
                <SourceTag type={res.sourceType} />
                <Citation meta={res.sourceMeta} />
              </>
            ) : res.status === 'asleep' ? (
              <SleepLine />
            ) : (
              t(`ask.${res.status === 'not-found' ? 'notFound' : res.status}`)
            )}
          </div>
        )}
        {offer && !busy && (
          <div className="answer-box wonder-offer">
            {!res && offer.kind === 'wiki' && (
              <>
                <p style={{ margin: '0 0 6px' }}>{offer.parts[0]}</p>
                <span className="muted" style={{ fontSize: 12 }}>
                  {t('wonder.fromWiki')} {offer.title}
                </span>
              </>
            )}
            <button
              type="button"
              className="btn go wonder-cta"
              onClick={() => {
                sfx('portal');
                visitWonder(offer);
              }}
            >
              <Sparkles className="i" /> {t('wonder.followMe')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
