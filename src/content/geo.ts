/**
 * The atlas layer.
 *
 * Children's atlases put the animal on the map: a little icon where it lives,
 * a continent to point at, one line of "where in the world". That is all this
 * file is — a projection, a list of continents and the boxes that stand for
 * them on the map.
 *
 * `public/images/map/world.png` is a cropped, recoloured version of Wikimedia
 * Commons' public-domain BlankMap-World-Equirectangular, trimmed so the image
 * is exactly the -180..180 / -90..90 frame. That means longitude and latitude
 * turn into percentages with nothing but arithmetic, and a pin lands where the
 * place really is.
 */

export type ContinentId = 'africa' | 'europe' | 'asia' | 'north-america' | 'south-america' | 'oceania' | 'antarctica';

export interface LatLon {
  lat: number;
  lon: number;
}

/** Position on the map image, as percentages from its top-left corner. */
export function project({ lat, lon }: LatLon): { x: number; y: number } {
  return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

interface ContinentBox {
  /** south, west, north, east — the tappable box drawn over the map. */
  box: [number, number, number, number];
}

/**
 * Rough boxes, deliberately: they are targets to tap, not borders to learn.
 * Africa is checked before Europe so the Mediterranean overlap goes to Africa.
 */
export const CONTINENTS: Record<ContinentId, ContinentBox> = {
  africa: { box: [-35, -18, 37, 52] },
  europe: { box: [37, -11, 71, 42] },
  asia: { box: [2, 42, 76, 146] },
  'north-america': { box: [8, -168, 72, -54] },
  'south-america': { box: [-56, -82, 13, -34] },
  oceania: { box: [-47, 112, -9, 179] },
  antarctica: { box: [-90, -180, -62, 180] },
};

export const CONTINENT_IDS = Object.keys(CONTINENTS) as ContinentId[];

/** The box as CSS percentages, ready to drop on the map image. */
export function continentRect(id: ContinentId) {
  const [s, w, n, e] = CONTINENTS[id].box;
  const tl = project({ lat: n, lon: w });
  const br = project({ lat: s, lon: e });
  return { left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y };
}
