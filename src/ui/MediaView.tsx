import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Media } from '../types/content';
import { isToy, modelThumb } from '../models';
import { hasReal, realThumb } from '../models/real';
import { wikiThumb } from '../wiki/wikipedia';

/**
 * A picture for puzzles and quizzes. It always shows a rendered 3D model
 * (works offline, zero downloads). With `photos` on and a Wikipedia article
 * named, it upgrades to the real Wikimedia Commons photo, credited on hover.
 * Encarta's "Animal Control" matched real photos, so photo puzzles opt in.
 */
export function MediaView({ media, size = 'md', photos = false, label }: { media: Media; size?: 'md' | 'big' | 'xl'; photos?: boolean; label?: string }) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<string | null>(null);
  const px = size === 'md' ? 160 : 320;
  const toy = useMemo(() => (isToy(media.model) ? modelThumb(media.model, px) : ''), [media.model, px]);
  // the downloaded model, once it has loaded, replaces the toy placeholder
  const [real, setReal] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setReal(null);
    if (hasReal(media.model)) realThumb(media.model, px).then((u) => alive && setReal(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [media.model, px]);
  const thumb = real ?? toy;

  useEffect(() => {
    let alive = true;
    setPhoto(null);
    if (photos && media.wikiImage && navigator.onLine) wikiThumb(media.wikiImage).then((p) => alive && p && setPhoto(p.src));
    return () => {
      alive = false;
    };
  }, [photos, media.wikiImage]);

  return (
    <div className={`media ${size}`}>
      {photo ? (
        <img className="photo" src={photo} alt={label ?? ''} title={t('source.photo')} loading="lazy" draggable={false} onError={() => setPhoto(null)} />
      ) : (
        thumb ? <img src={thumb} alt={label ?? ''} draggable={false} /> : <span className="media-wait" aria-hidden />
      )}
    </div>
  );
}
