import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, cleanName } from '../state/store';
import { player } from '../three/playerState';
import { sfx } from '../audio/sfx';
import { LanguageSwitcher } from './Settings';
import { WondooAvatar } from './Parts';

/**
 * First visit: Wondoo says hello, asks the explorer's name and shows how the
 * place works, one short step at a time. Can be skipped, and replayed from settings.
 * Each step lights up the part of the screen it talks about.
 */
const ALL = ['hi', 'askName', 'walk', 'doors', 'cards', 'stars', 'ask', 'home'] as const;
type Step = (typeof ALL)[number];

export function Welcome() {
  const { t } = useTranslation();
  const name = useApp((s) => s.name);
  const setName = useApp((s) => s.setName);
  const setTourDone = useApp((s) => s.setTourDone);
  // the ask step only makes sense when this deployment has the AI turned on
  const canAsk = useApp((s) => s.providers.gemini !== 'unconfigured');
  const STEPS = canAsk ? ALL : ALL.filter((s) => s !== 'ask');
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState(name);
  const step: Step = STEPS[i];

  // no wandering off through a doorway in the middle of the tour
  useEffect(() => {
    player.frozen = true;
    return () => {
      player.frozen = false;
      delete document.body.dataset.tour;
    };
  }, []);
  useEffect(() => {
    document.body.dataset.tour = step;
  }, [step]);

  const finish = () => {
    sfx('portal');
    setTourDone(true);
  };
  const next = () => {
    sfx('click');
    if (step === 'askName') setName(draft);
    if (i === STEPS.length - 1) return finish();
    setI(i + 1);
  };

  const named = (key: string) => (name ? t(`welcome.${key}`, { name }) : t(`welcome.${key}NoName`));
  const text = step === 'walk' || step === 'home' ? named(step) : t(`welcome.${step}`);

  return (
    <section className="slab welcome" role="dialog" aria-modal="false" aria-label={t('welcome.label')}>
      <div className="welcome-mascot">
        <WondooAvatar />
      </div>
      <div className="welcome-body">
        <div className="who">{t('mascot.name')}</div>
        <p className="welcome-say" aria-live="polite">
          {text}
        </p>

        {step === 'hi' && <LanguageSwitcher />}
        {step === 'askName' && (
          <form
            className="welcome-name"
            onSubmit={(e) => {
              e.preventDefault();
              if (cleanName(draft)) next();
            }}
          >
            <input
              autoFocus
              value={draft}
              maxLength={16}
              placeholder={t('welcome.namePlaceholder')}
              aria-label={t('welcome.askName')}
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="muted">{t('welcome.nameNote')}</span>
          </form>
        )}

        <div className="welcome-actions">
          {i > 0 && (
            <button type="button" className="btn" onClick={() => setI(i - 1)}>
              {t('welcome.back')}
            </button>
          )}
          <button type="button" className="btn go" onClick={next} disabled={step === 'askName' && !cleanName(draft)}>
            {i === STEPS.length - 1 ? t('welcome.go') : t('welcome.next')}
          </button>
          {i < STEPS.length - 1 && (
            <button type="button" className="link welcome-skip" onClick={finish}>
              {t('welcome.skip')}
            </button>
          )}
          <span className="welcome-dots" aria-hidden>
            {STEPS.map((s, k) => (
              <i key={s} className={k === i ? 'on' : ''} />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
