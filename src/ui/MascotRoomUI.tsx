import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, X } from 'lucide-react';
import { factsForExplored } from '../content/loader';
import { chatReply, gradeRecall, type RecallQuestion } from '../llm/mascot';
import type { ChatMsg } from '../llm/groq';
import { looksUnsafe } from '../llm/guards';
import { useApp } from '../state/store';
import { useLines } from '../i18n';
import { sfx } from '../audio/sfx';
import { speak, stopSpeaking } from '../audio/tts';
import { mascotBus } from '../three/playerState';
import { IconButton, WondooAvatar, WondooLine, SourceTag } from './Parts';
import { MicButton } from './MicButton';
import { SleepLine } from './Hud';
import { PremiumButton, PremiumTag } from './Premium';

interface Msg {
  from: 'kid' | 'nimbo';
  text: string;
  fact?: string;
  question?: string;
  sourceType?: 'curated' | 'ai-generated';
  /** the free AI replies for this visit are used up: show the Premium invitation */
  premium?: boolean;
}

/**
 * Chatting with Wondoo in the AI's own words is Premium, with a few free replies
 * every visit. After those, Wondoo keeps chatting with fact-checked lines and
 * recall questions, and invites the family to Premium once.
 */
function Chat() {
  const { t } = useTranslation();
  const line = useLines();
  const lang = useApp((s) => s.lang);
  const explored = useApp((s) => s.explored);
  const topics = useMemo(() => factsForExplored(explored), [explored]);
  const [log, setLog] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const recall = useRef<RecallQuestion | null>(null);
  const history = useRef<ChatMsg[]>([]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [log]);

  const consumeChat = useApp((s) => s.consumeChat);
  const invited = useRef(false);
  const nimboSays = async (childText: string, gradeNote?: string, prefix?: string) => {
    setBusy(true);
    const curatedOnly = !consumeChat();
    const turn = await chatReply({
      curatedOnly,
      lang,
      history: history.current,
      topics,
      childText,
      gradeNote,
      fallbackSay: line('mascot.chatFallback'),
      openRecallTemplate: t('mascot.openRecall'),
    });
    setBusy(false);
    recall.current = turn.recall ?? null;
    const say = [prefix, turn.say].filter(Boolean).join(' ');
    history.current.push({ role: 'user', content: childText }, { role: 'assistant', content: turn.say });
    setLog((l) => [...l, { from: 'nimbo', text: say, fact: turn.fact, question: turn.recall?.question, sourceType: turn.sourceType }]);
    if (curatedOnly && !invited.current) {
      invited.current = true;
      setLog((l) => [...l, { from: 'nimbo', text: t('premium.chatUsed'), sourceType: 'curated', premium: true }]);
    }
    mascotBus.emit('wave');
    speak([say, turn.fact, turn.recall?.question].filter(Boolean).join(' '), lang);
  };

  // one greeting per language, even when React runs the effect twice
  const greeted = useRef<string | null>(null);
  useEffect(() => {
    if (greeted.current === lang) return () => stopSpeaking();
    greeted.current = lang;
    if (!topics.length) setLog([{ from: 'nimbo', text: t('mascot.noTopics'), sourceType: 'curated' }]);
    else void nimboSays('(The child just came to chat. Greet them warmly and invite a recall question.)');
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const send = async (said?: string) => {
    const text = (said ?? input).trim();
    if (!text || busy) return;
    setInput('');
    sfx('click');
    setLog((l) => [...l, { from: 'kid', text }]);
    if (looksUnsafe(text)) {
      setLog((l) => [...l, { from: 'nimbo', text: t('mascot.chatUnsafe'), sourceType: 'curated' }]);
      return;
    }
    // Recall answers are graded locally against the curated quiz answer: the LLM never judges facts.
    let prefix: string | undefined;
    let note: string | undefined;
    if (recall.current) {
      const g = gradeRecall(text, recall.current, lang);
      if (g === true) {
        prefix = t('mascot.recallRight');
        note = 'The child answered the recall question correctly. Celebrate briefly.';
        sfx('correct');
        mascotBus.emit('happy');
      } else if (g === false) {
        prefix = t('mascot.recallWrong', { answer: recall.current.answer });
        note = 'The child did not give the answer to the recall question; the correct answer was already shown to them. Never say they got the question right. Encourage them kindly and reply to what they said.';
      }
    }
    if (!topics.length) {
      setLog((l) => [...l, { from: 'nimbo', text: t('mascot.noTopics'), sourceType: 'curated' }]);
      return;
    }
    await nimboSays(text, note, prefix);
  };

  return (
    <>
      <div className="chat-log" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            {m.text}
            {m.fact && (
              <span className="fact">
                {m.fact} <SourceTag type="curated" />
              </span>
            )}
            {m.question && <span className="q">{m.question}</span>}
            {m.from === 'nimbo' && m.sourceType === 'ai-generated' && (
              <div style={{ marginBlockStart: 4 }}>
                <SourceTag type="ai-generated" /> <PremiumTag />
              </div>
            )}
            {m.premium && (
              <div style={{ marginBlockStart: 8 }}>
                <PremiumButton />
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg nimbo muted">{t('card.loading')}</div>}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="field">
          <input autoFocus value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} placeholder={t('room.chatPlaceholder')} aria-label={t('room.chatPlaceholder')} />
          <MicButton lang={lang} disabled={busy} onText={(said) => void send(said)} />
          <IconButton small type="submit" label={t('room.send')} disabled={busy || !input.trim()}>
            <ArrowRight className="i flip" />
          </IconButton>
        </div>
      </form>
    </>
  );
}

/** Overlay for Wondoo's Den: the chat drawer and a one-time hint. Everything else happens in the room itself. */
export function MascotRoomUI() {
  const { t } = useTranslation();
  const mode = useApp((s) => s.roomMode);
  const setMode = useApp((s) => s.setRoomMode);
  const bedtime = useApp((s) => s.bedtime);
  const groq = useApp((s) => s.providers.groq);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setHint(false), 9000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      {mode === 'chat' && (
        <section className="slab drawer" aria-label={t('room.chat')}>
          <header className="slab-head">
            <WondooAvatar size={28} sleeping={bedtime || groq !== 'ok'} />
            <h2>{t('mascot.name')}</h2>
            <IconButton small label={t('room2.closeChat')} onClick={() => setMode('play')}>
              <X className="i" />
            </IconButton>
          </header>
          {bedtime || groq !== 'ok' ? (
            <div className="slab-body">
              <WondooLine sleeping>
                <SleepLine />
              </WondooLine>
              <p className="muted" style={{ margin: 0 }}>{bedtime ? t('room2.wake') : t('room.asleepBanner')}</p>
            </div>
          ) : (
            <Chat />
          )}
        </section>
      )}
      {hint && mode !== 'chat' && (
        <div className="toast" role="note">
          <span>{bedtime ? t('room2.wake') : t('room2.hint')}</span>
          <button className="btn" onClick={() => setHint(false)}>
            {t('hub2.dismiss')}
          </button>
        </div>
      )}
    </>
  );
}
