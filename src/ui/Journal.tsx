import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked, ChevronLeft, ChevronRight, Fish, X } from 'lucide-react';
import { useApp, type SavedWord } from '../state/store';
import { FISH, RARITY, type FishKind } from '../content/fish';
import { tx } from '../content/loader';
import { sfx } from '../audio/sfx';
import { IconButton } from './Parts';

/**
 * The explorer's journal, as a real book: a leather cover, yellowed lined
 * pages, ribbon bookmarks and pages that turn. Words they kept go first, then
 * the fountain fish (unfound ones stay grey mysteries). On a narrow screen the
 * book shows one page at a time.
 */
const WORDS_PER_PAGE = 4;
const FISH_PER_PAGE = 3;
type Page = { kind: 'cover' } | { kind: 'words'; items: SavedWord[]; first: boolean } | { kind: 'fish'; items: FishKind[]; first: boolean } | { kind: 'blank' };

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 700);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return narrow;
}

export function JournalPanel() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const name = useApp((s) => s.name);
  const words = useApp((s) => s.words);
  const fish = useApp((s) => s.fish);
  const removeWord = useApp((s) => s.removeWord);
  const setOpen = useApp((s) => s.setJournalOpen);
  const narrow = useNarrow();
  const found = FISH.filter((f) => fish[f.id]).length;

  // lay the whole book out as pages, then show them one spread (or one page) at a time
  const pages = useMemo(() => {
    const out: Page[] = [{ kind: 'cover' }];
    const chunk = <T,>(xs: T[], n: number) => (xs.length ? Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n)) : [[]]);
    chunk(words, WORDS_PER_PAGE).forEach((items, i) => out.push({ kind: 'words', items, first: i === 0 }));
    if (!narrow && out.length % 2 === 1) out.push({ kind: 'blank' }); // fish always start on a left page
    chunk(FISH, FISH_PER_PAGE).forEach((items, i) => out.push({ kind: 'fish', items, first: i === 0 }));
    if (!narrow && out.length % 2 === 1) out.push({ kind: 'blank' });
    return out;
  }, [words, narrow]);
  const per = narrow ? 1 : 2;
  const last = Math.ceil(pages.length / per) - 1;
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<null | { dir: 'next' | 'prev'; to: number }>(null);
  const at = Math.min(spread, last);
  const fishStart = Math.floor(pages.findIndex((p) => p.kind === 'fish') / per);

  const go = (to: number) => {
    if (to === at || to < 0 || to > last || turn) return;
    sfx('click');
    setTurn({ dir: to > at ? 'next' : 'prev', to });
    window.setTimeout(() => {
      setSpread(to);
      setTurn(null);
    }, 700);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowRight') go(at + (rtl ? -1 : 1));
      if (e.key === 'ArrowLeft') go(at + (rtl ? 1 : -1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const render = (p: Page | undefined, n: number) => {
    if (!p) return null;
    let body: ReactNode = null;
    if (p.kind === 'cover')
      body = (
        <div className="page-cover">
          <BookMarked className="i" />
          <h2 id="journal-title">{name ? t('journal.titleNamed', { name }) : t('journal.title')}</h2>
          <p>{t('journal.intro')}</p>
          <p className="page-tally">
            {t('journal.words', { count: words.length })} · {t('journal.fish', { found, total: FISH.length })}
          </p>
        </div>
      );
    if (p.kind === 'words')
      body = (
        <>
          {p.first && <h3>{t('journal.wordsTitle')}</h3>}
          {p.items.length ? (
            <ul className="page-words">
              {p.items.map((w) => (
                <li key={`${w.lang}-${w.word}`} lang={w.lang} dir={w.lang === 'ar' ? 'rtl' : 'ltr'}>
                  <strong>{w.word}</strong>
                  <span>{w.meaning}</span>
                  <button type="button" className="page-x" aria-label={t('journal.remove')} onClick={() => removeWord(w.word, w.lang)}>
                    <X className="i" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="page-hint">{t('journal.noWords')}</p>
          )}
        </>
      );
    if (p.kind === 'fish')
      body = (
        <>
          {p.first && (
            <>
              <h3>{t('journal.fishTitle')}</h3>
              <p className="page-hint">{t('journal.fishHint')}</p>
            </>
          )}
          <ul className="page-fish">
            {p.items.map((f) => {
              const c = fish[f.id] ?? 0;
              const r = RARITY[f.rarity];
              return (
                <li key={f.id} className={c ? '' : 'unknown'} style={{ '--rar': r.color } as CSSProperties}>
                  <FishIcon look={c ? f.look : undefined} />
                  <div>
                    <strong>{c ? tx(f.name, lang) : '?'}</strong>
                    <span className="rarity">{tx(r.name, lang)}</span>
                    {c > 1 && <span className="page-count">× {c}</span>}
                    {c > 0 && <p>{tx(f.fact, lang)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      );
    return (
      <>
        {body}
        {p.kind !== 'cover' && <span className="page-no">{n}</span>}
      </>
    );
  };

  // A turn is a two-sided sheet. Under it the book already shows where it is going:
  // turning forward, the new right page waits underneath while the old left page stays put;
  // the sheet's front is the old right page and its back is the new left page.
  const to = turn?.to ?? at;
  const fwd = turn?.dir === 'next';
  const base =
    per === 1
      ? [pages[to]]
      : turn
        ? fwd
          ? [pages[at * 2], pages[to * 2 + 1]]
          : [pages[to * 2], pages[at * 2 + 1]]
        : [pages[at * 2], pages[at * 2 + 1]];
  const baseNo = per === 1 ? [to] : turn ? (fwd ? [at * 2, to * 2 + 1] : [to * 2, at * 2 + 1]) : [at * 2, at * 2 + 1];
  const sheet = turn && (per === 1 ? { front: at, back: -1 } : fwd ? { front: at * 2 + 1, back: to * 2 } : { front: at * 2, back: to * 2 + 1 });

  return (
    <div className="book-wrap" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <section className={`book${narrow ? ' single' : ''}`} role="dialog" aria-modal="true" aria-labelledby="journal-title">
        <div className="book-ribbons">
          <button type="button" className="ribbon r-words" onClick={() => go(0)}>
            <BookMarked className="i" /> {t('journal.wordsTab')}
          </button>
          <button type="button" className="ribbon r-fish" onClick={() => go(fishStart)}>
            <Fish className="i" /> {t('journal.fishTab')}
          </button>
        </div>
        <div className="book-cover">
          <div className="book-pages">
            {base.map((p, i) => (
              <article key={baseNo[i]} className={`page ${per === 1 ? 'only' : i === 0 ? 'left' : 'right'}`}>
                {render(p, baseNo[i])}
              </article>
            ))}
            {sheet && turn && (
              <div className={`sheet ${turn.dir}${per === 1 ? ' only' : ''}`}>
                <article className={`page face front ${per === 1 ? 'only' : fwd ? 'right' : 'left'}`}>{render(pages[sheet.front], sheet.front)}</article>
                {sheet.back >= 0 && <article className={`page face back ${fwd ? 'left' : 'right'}`}>{render(pages[sheet.back], sheet.back)}</article>}
              </div>
            )}
          </div>
        </div>
        <div className="book-nav">
          <button type="button" className="ibtn" aria-label={t('journal.prev')} disabled={at === 0} onClick={() => go(at - 1)}>
            <ChevronLeft className="i flip" />
          </button>
          <button type="button" className="ibtn" aria-label={t('journal.next')} disabled={at === last} onClick={() => go(at + 1)}>
            <ChevronRight className="i flip" />
          </button>
          <button type="button" className="ibtn book-close" aria-label={t('card2.close')} onClick={() => setOpen(false)}>
            <X className="i" />
          </button>
        </div>
      </section>
    </div>
  );
}

/** A little side-on drawing of a fish in its own colours (a grey shadow until found). */
export function FishIcon({ look }: { look?: (typeof FISH)[number]['look'] }) {
  const body = look?.body ?? '#c3ccd4';
  const k = look ? look.long : 1;
  const h = look ? look.tall : 0.55;
  return (
    <svg viewBox="-34 -20 68 40" className="fish-icon" aria-hidden>
      <path d={`M${-22 * k} 0 L${-32 * k} ${-11 * h * 1.6} L${-32 * k} ${11 * h * 1.6} Z`} fill={look?.fin ?? '#b3bcc4'} />
      <ellipse rx={22 * k} ry={20 * h} fill={body} />
      {look && <ellipse cx={-4 * k} cy={4 * h} rx={12 * k} ry={8 * h} fill={look.mark} opacity="0.85" />}
      <circle cx={13 * k} cy={-4 * h} r="2.6" fill={look ? '#12283d' : '#9aa5ae'} />
    </svg>
  );
}

/** Pops up for a moment when a leaping fish is caught. */
export function FishToast() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const caught = useApp((s) => s.caught);
  const [shown, setShown] = useState<typeof caught>(null);
  useEffect(() => {
    if (!caught) return;
    setShown(caught);
    const id = window.setTimeout(() => setShown(null), 6500);
    return () => window.clearTimeout(id);
  }, [caught]);
  if (!shown) return null;
  const f = FISH.find((x) => x.id === shown.id)!;
  const r = RARITY[f.rarity];
  return (
    <div className="slab fish-toast" role="status" style={{ '--rar': r.color } as CSSProperties}>
      <FishIcon look={f.look} />
      <div>
        <div className="fish-toast-head">
          <strong>{shown.isNew ? t('journal.newFish', { fish: tx(f.name, lang) }) : t('journal.againFish', { fish: tx(f.name, lang) })}</strong>
          <span className="rarity">{tx(r.name, lang)}</span>
        </div>
        <p>{tx(f.fact, lang)}</p>
      </div>
      <IconButton small label={t('card2.close')} onClick={() => setShown(null)}>
        <X className="i" />
      </IconButton>
    </div>
  );
}
