import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import { useApp } from '../state/store';
import type { Lang } from '../types/content';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr }, ar: { translation: ar } },
  lng: useApp.getState().lang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export const DIR: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', fr: 'ltr', ar: 'rtl' };

/** Keep i18next, <html lang> and <html dir> in sync with the store. */
function apply(lang: Lang) {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = DIR[lang];
}
apply(useApp.getState().lang);
useApp.subscribe((s, prev) => {
  if (s.lang !== prev.lang) apply(s.lang);
});

const NO_NAME = '\u0000';

/**
 * Pick a random line from a string-array translation key. Lines may call the
 * explorer by {{name}}; until Wondoo knows the name, those lines are skipped.
 */
export function useLines() {
  const { t } = useTranslation();
  const name = useApp((s) => s.name);
  return (key: string, vars: Record<string, string> = {}): string => {
    const v = t(key, { returnObjects: true, ...vars, name: name || NO_NAME }) as unknown;
    const all = (Array.isArray(v) ? v : [v]).map(String);
    const ok = all.filter((x) => !x.includes(NO_NAME));
    const pool = ok.length ? ok : all.map((x) => x.replace(/,?\s*\u0000/g, ''));
    return pool[Math.floor(Math.random() * pool.length)];
  };
}

export default i18n;
