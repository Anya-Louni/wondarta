import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { CONTINENT_IDS, continentRect, project, type ContinentId, type LatLon } from '../content/geo';

/**
 * A range map, the way a children's atlas does it: the world, a pin (or a few)
 * where the animal lives, and optionally the continents as tappable areas.
 *
 * The map image is an exact -180..180 / -90..90 frame, so every pin is placed
 * by real latitude and longitude rather than by eye.
 */
export function WorldMap({
  pins = [],
  highlight,
  options,
  picked,
  wrong,
  onPick,
  caption,
}: {
  pins?: LatLon[];
  /** Continent tinted to show the answer. */
  highlight?: ContinentId;
  /** When given, these continents become buttons. */
  options?: ContinentId[];
  picked?: ContinentId | null;
  wrong?: ContinentId | null;
  onPick?: (id: ContinentId) => void;
  caption?: string;
}) {
  const { t } = useTranslation();
  return (
    <figure className="worldmap">
      <div className="worldmap-frame">
        <img src="./images/map/world.png" alt={t('geo.mapAlt')} />
        {highlight && (
          <div className="continent-glow" style={rectStyle(highlight)} aria-hidden />
        )}
        {options?.map((id) => {
          const state = picked === id ? ' picked' : wrong === id ? ' wrong shake' : '';
          return (
            <button key={id} type="button" className={`continent-hit${state}`} style={rectStyle(id)} onClick={() => onPick?.(id)}>
              <span>{t(`geo.${id}`)}</span>
            </button>
          );
        })}
        {!options &&
          CONTINENT_IDS.filter((id) => id === highlight).map((id) => (
            <span key={id} className="continent-name" style={rectStyle(id)} aria-hidden>
              {t(`geo.${id}`)}
            </span>
          ))}
        {pins.map((p, i) => {
          const { x, y } = project(p);
          return (
            <span key={i} className="map-pin" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden>
              <MapPin className="i" />
            </span>
          );
        })}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function rectStyle(id: ContinentId) {
  const r = continentRect(id);
  return { left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` };
}
