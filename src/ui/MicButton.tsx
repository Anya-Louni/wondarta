import { useTranslation } from 'react-i18next';
import { Loader2, Mic, Square } from 'lucide-react';
import type { Lang } from '../types/content';
import { useListen } from '../audio/listen';
import { sfx } from '../audio/sfx';

/** Tap to talk, tap again to stop. What the child says is written into the box and sent. */
export function MicButton({ lang, onText, disabled }: { lang: Lang; onText: (text: string) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const { state, start, stop, supported } = useListen(lang, onText);
  if (!supported) return null;
  const busy = state.phase === 'loading' || state.phase === 'thinking';
  const label =
    state.phase === 'recording'
      ? t('mic.stop')
      : state.phase === 'loading'
        ? t('mic.loading', { pct: Math.round(state.progress * 100) })
        : state.phase === 'thinking'
          ? t('mic.thinking')
          : state.phase === 'error'
            ? t('mic.error')
            : t('mic.talk');
  return (
    <button
      type="button"
      className={`mic-btn ${state.phase}`}
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      onClick={() => {
        sfx('click');
        if (state.phase === 'recording') stop();
        else void start();
      }}
    >
      {busy ? <Loader2 className="i spin" /> : state.phase === 'recording' ? <Square className="i" /> : <Mic className="i" />}
      {(state.phase !== 'idle' || undefined) && <span className="mic-label">{label}</span>}
    </button>
  );
}
