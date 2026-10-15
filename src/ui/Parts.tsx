import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import type { SourceMeta, SourceType } from '../types/content';

/** Small round glossy icon button. Label is required (tooltip + screen readers). */
export function IconButton({
  label,
  onClick,
  children,
  pressed,
  small,
  count,
  disabled,
  type = 'button',
}: {
  type?: 'button' | 'submit';
  label: string;
  onClick?: () => void;
  children: ReactNode;
  pressed?: boolean;
  small?: boolean;
  count?: number | string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      className={`ibtn${small ? ' sm' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  );
}

const TAG_ICON: Record<SourceType, ReactNode> = {
  curated: <ShieldCheck className="i" />,
  'ai-grounded': <BookMarked className="i" />,
  'ai-generated': <MessageCircle className="i" />,
};
const TAG_KEY: Record<SourceType, string> = { curated: 'curated', 'ai-grounded': 'aiGrounded', 'ai-generated': 'aiGenerated' };

/** Provenance marker: reviewed content vs AI content, readable at a glance. */
export function SourceTag({ type }: { type: SourceType }) {
  const { t } = useTranslation();
  const tip = t(`source.${TAG_KEY[type]}Tip`);
  return (
    <span className={`tag ${type}`} title={tip} aria-label={tip}>
      {TAG_ICON[type]}
      {t(`source.${TAG_KEY[type]}`)}
    </span>
  );
}

const WIKI_NAME: Record<string, string> = { en: 'en.wikipedia.org', simple: 'simple.wikipedia.org', fr: 'fr.wikipedia.org', ar: 'ar.wikipedia.org' };

export function Citation({ meta }: { meta: SourceMeta }) {
  const { t } = useTranslation();
  if (!meta.url || !meta.title) return null;
  return (
    <div className="cite">
      <a href={meta.url} target="_blank" rel="noreferrer noopener">
        {t('source.from', { title: meta.title, wiki: WIKI_NAME[meta.wikiLang ?? 'en'] })}
      </a>
      {meta.translatedFrom && <div>{t('source.translated')}</div>}
    </div>
  );
}

/** Wondoo as a tiny SVG portrait (glossy droplet with a cloud tuft). */
export function WondooAvatar({ size = 34, sleeping = false }: { size?: number; sleeping?: boolean }) {
  return (
    <svg className="avatar" viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id="nb" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e9f8ff" />
          <stop offset="0.45" stopColor="#8fd6fb" />
          <stop offset="1" stopColor="#2f9fdf" />
        </radialGradient>
      </defs>
      {/* rabbit ears and hood, then the blue octopus face inside */}
      <ellipse cx="13.5" cy="8" rx="3.4" ry="7.5" fill="#fff" stroke="#d7e6f0" strokeWidth="0.6" transform="rotate(-10 13.5 8)" />
      <ellipse cx="26.5" cy="8" rx="3.4" ry="7.5" fill="#fff" stroke="#d7e6f0" strokeWidth="0.6" transform="rotate(10 26.5 8)" />
      <ellipse cx="13.5" cy="8.5" rx="1.5" ry="5" fill="#ffc2d6" transform="rotate(-10 13.5 8.5)" />
      <ellipse cx="26.5" cy="8.5" rx="1.5" ry="5" fill="#ffc2d6" transform="rotate(10 26.5 8.5)" />
      <circle cx="20" cy="25" r="14" fill="#fff" stroke="#d7e6f0" strokeWidth="0.6" />
      <circle cx="20" cy="26" r="10.5" fill="url(#nb)" />
      <ellipse cx="15.5" cy="21.5" rx="3" ry="1.8" fill="#fff" opacity="0.8" />
      {sleeping ? (
        <>
          <path d="M13.5 26 q2.2 1.8 4.4 0" stroke="#10283c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M22 26 q2.2 1.8 4.4 0" stroke="#10283c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="15.5" cy="26" rx="1.8" ry="2.4" fill="#10283c" />
          <ellipse cx="24.5" cy="26" rx="1.8" ry="2.4" fill="#10283c" />
          <circle cx="16.2" cy="23" r="0.7" fill="#fff" />
          <circle cx="25.2" cy="23" r="0.7" fill="#fff" />
        </>
      )}
      <ellipse cx="11" cy="28" rx="2.2" ry="1.3" fill="#ff9fb8" opacity="0.8" />
      <ellipse cx="29" cy="28" rx="2.2" ry="1.3" fill="#ff9fb8" opacity="0.8" />
    </svg>
  );
}

/** Wondoo speaking inside a panel. */
export function WondooLine({ children, sleeping }: { children: ReactNode; sleeping?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="nimbo-line">
      <WondooAvatar sleeping={sleeping} />
      <div>
        <div className="who">{t('mascot.name')}</div>
        <div className="say">{children}</div>
      </div>
    </div>
  );
}

export function Wordmark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id="wm" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#8fd6fb" />
          <stop offset="1" stopColor="#1f9be0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#wm)" />
      <ellipse cx="8.5" cy="8" rx="3.5" ry="2" fill="#fff" opacity="0.85" />
      <circle cx="16.5" cy="15" r="3" fill="#62cf4c" opacity="0.9" />
    </svg>
  );
}

export function ProgressRing({ done, total }: { done: number; total: number }) {
  const c = 2 * Math.PI * 10;
  return (
    <svg viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="10" fill="none" stroke="rgba(16,78,125,0.14)" strokeWidth="4" />
      <circle
        cx="13"
        cy="13"
        r="10"
        fill="none"
        stroke="#62cf4c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${(done / Math.max(1, total)) * c} ${c}`}
        transform="rotate(-90 13 13)"
      />
    </svg>
  );
}

export function StarRow({ n, max }: { n: number; max: number }) {
  return (
    <div className="big-stars" aria-label={`${n} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={i < n ? '' : 'off'} />
      ))}
    </div>
  );
}
