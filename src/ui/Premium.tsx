import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import { useApp } from '../state/store';
import { IconButton, WondooAvatar } from './Parts';

/** A small gold tag that marks AI-written words as part of Premium. */
export function PremiumTag() {
  const { t } = useTranslation();
  return (
    <span className="premium-tag">
      <Sparkles className="i" /> {t('premium.tag')}
    </span>
  );
}

/** "Get Premium" button: opens the Premium card. */
export function PremiumButton({ label }: { label?: string }) {
  const { t } = useTranslation();
  const setOpen = useApp((s) => s.setPremiumOpen);
  return (
    <button type="button" className="btn premium-btn" onClick={() => setOpen(true)}>
      <Sparkles className="i" /> {label ?? t('premium.learn')}
    </button>
  );
}

/**
 * What Premium adds, for children and the grown-ups reading over their
 * shoulder. Nothing is sold here yet: the card says so plainly.
 */
export function PremiumPanel() {
  const { t } = useTranslation();
  const setOpen = useApp((s) => s.setPremiumOpen);
  const perks = ['ask', 'chat', 'worlds', 'voices'] as const;
  return (
    <section className="slab premium-panel" role="dialog" aria-labelledby="premium-title">
      <header className="slab-head">
        <h2 id="premium-title">
          <Sparkles className="i" /> {t('premium.title')}
        </h2>
        <IconButton small label={t('card2.close')} onClick={() => setOpen(false)}>
          <X className="i" />
        </IconButton>
      </header>
      <div className="slab-body">
        <div className="premium-hero">
          <WondooAvatar size={64} />
          <p>{t('premium.intro')}</p>
        </div>
        <ul className="premium-perks">
          {perks.map((k) => (
            <li key={k}>
              <Sparkles className="i" /> {t(`premium.perk.${k}`)}
            </li>
          ))}
        </ul>
        <p className="muted premium-free">{t('premium.free')}</p>
        <p className="premium-soon">{t('premium.soon')}</p>
      </div>
    </section>
  );
}
