import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Search, X } from 'lucide-react';
import { askAnything, type GroundedResult } from '../llm/grounded';
import { llmAwake, useApp } from '../state/store';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/tts';
import { Citation, IconButton, WondooLine, SourceTag } from './Parts';
import { SleepLine } from './Hud';

/**
 * "Ask about anything": Wikipedia retrieval first; Gemini may only restate the
 * retrieved text. Limited per free session (UI/business logic only;
 * `plan: 'unlimited'` in the store is the hook for a future tier).
 */
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

  const submit = async () => {
    if (!q.trim() || busy || !awake) return;
    if (!consumeAsk()) return setRes('limit');
    sfx('click');
    setBusy(true);
    setRes(null);
    say(t('ask.thinking'));
    const r = await askAnything(q, lang);
    setBusy(false);
    setRes(r);
    say(null);
    if (r.status === 'ok') {
      sfx('correct');
      speak(r.text, lang);
    }
  };

  return (
    <section className="slab popover" role="dialog" aria-labelledby="ask-title">
      <header className="slab-head">
        <h2 id="ask-title">
          <span className="kicker">{Number.isFinite(asksLeft) ? t('hud.asksLeft', { count: asksLeft }) : t('hud.asksUnlimited')}</span>
          {t('ask.title')}
        </h2>
        <IconButton small label={t('card2.close')} onClick={() => setAskOpen(false)}>
          <X className="i" />
        </IconButton>
      </header>
      <div className="slab-body">
        {!awake ? (
          <WondooLine sleeping>
            <SleepLine />
          </WondooLine>
        ) : (
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Search className="i" color="var(--ink-300)" />
            <input autoFocus value={q} maxLength={140} onChange={(e) => setQ(e.target.value)} placeholder={t('ask.placeholder')} aria-label={t('ask.placeholder')} disabled={busy} />
            <IconButton small type="submit" label={t('ask.go')} disabled={busy || !q.trim() || asksLeft <= 0}>
              <ArrowRight className="i flip" />
            </IconButton>
          </form>
        )}
        {busy && <p className="muted" style={{ marginBlockEnd: 0 }}>{t('ask.thinking')}</p>}
        {(res === 'limit' || (asksLeft <= 0 && !res)) && (
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
      </div>
    </section>
  );
}
