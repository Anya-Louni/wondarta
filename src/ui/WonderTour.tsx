import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Home, Search } from 'lucide-react';
import { Vector3 } from 'three';
import { useApp } from '../state/store';
import { WONDERS } from '../content/wonders';
import { tx } from '../content/loader';
import { speak, stopSpeaking } from '../audio/tts';
import { sfx } from '../audio/sfx';
import { commonsVideo } from '../wiki/wikipedia';
import { stopPoints, wonderFocus } from '../scenes/Wonder';
import { WondooAvatar } from './Parts';

/**
 * Wondoo's guided tour of a Wonder world: one stop at a time, read aloud,
 * with Wondoo flying to the part it is talking about. The last page shows a
 * real video from Wikimedia Commons when there is one.
 */
export function WonderTour() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const visit = useApp((s) => s.wonder);
  const goTo = useApp((s) => s.goTo);
  const setAskOpen = useApp((s) => s.setAskOpen);
  const [i, setI] = useState(-1);
  const [video, setVideo] = useState<{ src: string; page: string; file: string } | null>(null);

  const built = visit?.kind === 'built' ? WONDERS.find((w) => w.id === visit.id) : undefined;
  const points = useMemo(() => stopPoints(visit), [visit]);
  const stops = useMemo(() => {
    if (built) return built.stops.map((s) => ({ title: tx(s.title, lang), text: tx(s.text, lang) }));
    if (visit?.kind === 'wiki') return visit.parts.map((text, k) => ({ title: t('wonder.step', { n: k + 1 }), text }));
    return [];
  }, [built, visit, lang, t]);
  const intro = built ? tx(built.intro, lang) : t('wonder.introWiki');
  const atEnd = i >= stops.length;

  // look for a real video while the tour runs
  useEffect(() => {
    let live = true;
    const want = built?.video ? commonsVideo(built.video) : visit?.kind === 'wiki' && visit.videoTitle ? commonsVideo(visit.videoTitle, true) : Promise.resolve(null);
    want.then((v) => live && setVideo(v)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [built, visit]);

  useEffect(() => {
    const p = i >= 0 && i < stops.length ? points[i] : null;
    wonderFocus.index = p ? i : -1;
    wonderFocus.at = p ? new Vector3(p[0] + 0.9, p[1] + 0.4, p[2] + 0.9) : null;
    speak(i < 0 ? intro : i < stops.length ? stops[i].text : t('wonder.end'), lang);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  useEffect(
    () => () => {
      wonderFocus.at = null;
      wonderFocus.index = -1;
    },
    [],
  );

  if (!visit) return null;
  const step = (d: number) => {
    sfx('click');
    setI((k) => Math.max(-1, Math.min(stops.length, k + d)));
  };

  return (
    <section className="slab wonder-tour" role="dialog" aria-label={built ? tx(built.title, lang) : visit.kind === 'wiki' ? (visit.question ?? visit.title) : ''}>
      <div className="wonder-head">
        <WondooAvatar />
        <div>
          <div className="who">{built ? tx(built.title, lang) : visit.kind === 'wiki' ? (visit.question ?? visit.title) : ''}</div>
          <strong>{i < 0 ? t('wonder.follow') : atEnd ? t(video ? 'wonder.endTitle' : 'wonder.doneTitle') : stops[i].title}</strong>
        </div>
        <span className="muted wonder-count" dir="ltr">
          {Math.min(Math.max(i + 1, 0), stops.length)} / {stops.length}
        </span>
      </div>

      {!atEnd && <p className="wonder-text">{i < 0 ? intro : stops[i].text}</p>}

      {atEnd && (
        <div className="wonder-end">
          {video ? (
            <figure>
              <video src={video.src} controls playsInline preload="metadata" />
              <figcaption>
                {t('wonder.videoCredit')}{' '}
                <a href={video.page} target="_blank" rel="noreferrer noopener">
                  {video.file}
                </a>
              </figcaption>
            </figure>
          ) : (
            <p className="wonder-text">{t('wonder.end')}</p>
          )}
          {visit.kind === 'wiki' && (
            <p className="muted" style={{ fontSize: 12 }}>
              {t('wonder.fromWiki')}{' '}
              <a href={visit.url} target="_blank" rel="noreferrer noopener">
                {visit.title}
              </a>
            </p>
          )}
          {built && (
            <p className="muted" style={{ fontSize: 12 }}>
              {t('wonder.checked')}{' '}
              {built.sources.map((s, k) => (
                <a key={s} href={s} target="_blank" rel="noreferrer noopener" style={{ marginInlineEnd: 6 }}>
                  [{k + 1}]
                </a>
              ))}
            </p>
          )}
        </div>
      )}

      <div className="wonder-actions">
        {i >= 0 && (
          <button type="button" className="btn" onClick={() => step(-1)}>
            <ArrowLeft className="i flip" /> {t('welcome.back')}
          </button>
        )}
        {!atEnd ? (
          <button type="button" className="btn go" onClick={() => step(1)}>
            {i < 0 ? t('wonder.go') : t('welcome.next')} <ArrowRight className="i flip" />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn go"
              onClick={() => {
                sfx('click');
                setAskOpen(true);
              }}
            >
              <Search className="i" /> {t('wonder.askAgain')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                sfx('portal');
                goTo('hub');
              }}
            >
              <Home className="i" /> {t('hud.backToHall')}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
