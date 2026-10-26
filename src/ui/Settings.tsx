import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, X } from 'lucide-react';
import { LANGS, type Lang } from '../types/content';
import { useApp } from '../state/store';
import { useQuality, type Mode } from '../three/quality';
import { sfx } from '../audio/sfx';
import { IconButton } from './Parts';
import { CreditsPanel } from './Credits';

const LANG_SHORT: Record<Lang, string> = { en: 'EN', fr: 'FR', ar: 'ع' };

/** Language toggle: compact segmented control, lives inside the settings menu. */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  return (
    <div className="seg" role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          title={t(`lang.${l}`)}
          onClick={() => {
            sfx('click');
            setLang(l);
          }}
        >
          {LANG_SHORT[l]}
        </button>
      ))}
    </div>
  );
}

const GFX: { id: Mode; key: string }[] = [
  { id: 'auto', key: 'gfxAuto' },
  { id: 'smooth', key: 'gfxSmooth' },
];

/** Picture quality. "Smooth" trades the decorations for frame rate. */
function GraphicsSwitch() {
  const { t } = useTranslation();
  const mode = useQuality((s) => s.mode);
  const setMode = useQuality((s) => s.setMode);
  return (
    <div className="seg" role="group" aria-label={t('settings.graphics')}>
      {GFX.map((g) => (
        <button
          key={g.id}
          type="button"
          aria-pressed={g.id === mode}
          onClick={() => {
            sfx('click');
            setMode(g.id);
          }}
        >
          {t(`settings.${g.key}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * Grown-up corner: language, picture quality and credits. Kids get a quiet little cog rather
 * than choices they don't need, and the panel closes on Escape or a click
 * outside it.
 */
export function SettingsMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setCredits(false);
  };

  useEffect(() => {
    if (!open && !credits) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', away);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', away);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, credits]);

  return (
    <div ref={wrap} className="settings">
      <IconButton
        small
        label={t('settings.open')}
        pressed={open}
        onClick={() => {
          sfx('click');
          setOpen((v) => !v);
        }}
      >
        <Settings2 className="i" />
      </IconButton>

      {open && !credits && (
        <section className="slab popover settings-menu" role="dialog" aria-label={t('settings.open')}>
          <header className="slab-head">
            <h2>{t('settings.open')}</h2>
            <IconButton small label={t('card2.close')} onClick={close}>
              <X className="i" />
            </IconButton>
          </header>
          <div className="slab-body">
            <div className="row">
              <span>{t('lang.label')}</span>
              <LanguageSwitcher />
            </div>
            <div className="row">
              <span>{t('settings.graphics')}</span>
              <GraphicsSwitch />
            </div>
            <div className="row">
              <span>{t('premium.title')}</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  close();
                  useApp.getState().setPremiumOpen(true);
                }}
              >
                {t('premium.learn')}
              </button>
            </div>
            <div className="row">
              <span>{t('settings.tour')}</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  close();
                  useApp.getState().setTourDone(false);
                }}
              >
                {t('welcome.again')}
              </button>
            </div>
            <div className="row">
              <span>{t('settings.progress')}</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (!window.confirm(t('settings.resetConfirm'))) return;
                  close();
                  useApp.getState().resetProgress();
                }}
              >
                {t('settings.reset')}
              </button>
            </div>
            <div className="row">
              <span>{t('credits.title')}</span>
              <button type="button" className="btn" onClick={() => setCredits(true)}>
                {t('settings.viewCredits')}
              </button>
            </div>
            <p className="muted" style={{ marginBlockEnd: 0, fontSize: 12 }}>{t('settings.note')}</p>
          </div>
        </section>
      )}

      {credits && (
        <CreditsPanel onClose={close} />
      )}
    </div>
  );
}
