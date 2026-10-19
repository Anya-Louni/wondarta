import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked, Home, Search, Star, Volume2, VolumeX, X } from 'lucide-react';
import { starTally } from '../content/loader';
import { useApp } from '../state/store';
import { useLines } from '../i18n';
import { sfx } from '../audio/sfx';
import { IconButton } from './Parts';
import { SettingsMenu } from './Settings';

/** A warm, pre-written rotating line. Zero API calls. */
export function SleepLine() {
  const line = useLines();
  const lang = useApp((s) => s.lang);
  const [text, setText] = useState(() => line('mascot.sleepLines'));
  useEffect(() => {
    setText(line('mascot.sleepLines'));
    const id = window.setInterval(() => setText(line('mascot.sleepLines')), 7000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  return <>{text}</>;
}

export function Hud() {
  const { t } = useTranslation();
  const scene = useApp((s) => s.scene);
  const goTo = useApp((s) => s.goTo);
  const sound = useApp((s) => s.sound);
  const toggleSound = useApp((s) => s.toggleSound);
  const setAskOpen = useApp((s) => s.setAskOpen);
  const askOpen = useApp((s) => s.askOpen);
  const asksLeft = useApp((s) => s.asksLeft());
  const stars = useApp((s) => s.stars);
  // no AI keys on this deployment: the ask button would only show a sleeping Wondoo, so leave it out
  // asking always works: without AI keys Wondoo still builds a world from Wikipedia
  const canAsk = true;
  const tally = starTally(stars);
  const journalOpen = useApp((s) => s.journalOpen);
  const setJournalOpen = useApp((s) => s.setJournalOpen);

  return (
    <nav className="hud" aria-label="Wondarta">
      {scene !== 'hub' && (
        <div className="cap">
          <IconButton
            label={t('hud.backToHall')}
            onClick={() => {
              sfx('portal');
              goTo('hub');
            }}
          >
            <Home className="i" />
          </IconButton>
        </div>
      )}
      <div className="cap star-count" title={t('hud.stars', { got: tally.got, max: tally.max })}>
        <Star className="i" />
        {tally.got}
      </div>
      <div className="spacer" />
      <div className="cap">
        <IconButton label={t('journal.open')} pressed={journalOpen} onClick={() => setJournalOpen(!journalOpen)}>
          <BookMarked className="i" />
        </IconButton>
        {canAsk && (
        <IconButton
          label={`${t('hud.ask')} (${Number.isFinite(asksLeft) ? t('hud.asksLeft', { count: asksLeft }) : t('hud.asksUnlimited')})`}
          pressed={askOpen}
          onClick={() => setAskOpen(!askOpen)}
        >
          {askOpen ? <X className="i" /> : <Search className="i" />}
        </IconButton>
        )}
        <IconButton label={sound ? t('hud.soundOn') : t('hud.soundOff')} pressed={!sound} onClick={toggleSound}>
          {sound ? <Volume2 className="i" /> : <VolumeX className="i" />}
        </IconButton>
        {scene === 'hub' && <SettingsMenu />}
      </div>
    </nav>
  );
}

