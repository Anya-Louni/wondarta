import { useTranslation } from 'react-i18next';
import { useVoiceLoad } from '../audio/tts';
import { WondooAvatar } from './Parts';

/** Shown only the first time a language's voice downloads; afterwards it is cached. */
export function VoiceWarm() {
  const { t } = useTranslation();
  const { lang, progress } = useVoiceLoad();
  if (!lang || progress >= 0.999) return null;
  const pct = Math.round(progress * 100);
  return (
    <div className="slab voice-warm" role="status">
      <WondooAvatar />
      {t('voice.warming', { pct })}
      <progress value={progress} max={1} />
    </div>
  );
}
