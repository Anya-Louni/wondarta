import { useEffect, useState } from 'react';
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3, type PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildModel, renderThumb } from '../../models';
import { REAL, hasReal } from '../../models/real';

/**
 * Pictures for the 2D games, photographed from the same 3D models the worlds
 * use, so a game's lion is the lion you just walked past.
 */
const loader = new GLTFLoader();
const files = new Map<string, Promise<Group>>();
const load = (url: string) => {
  let p = files.get(url);
  if (!p) files.set(url, (p = loader.loadAsync(url).then((g) => g.scene)));
  return p;
};

export type Face = 'right' | 'left' | 'front' | 'top';
const POSE: Record<Face, { yaw: number; pitch?: number }> = { right: { yaw: 1.25 }, left: { yaw: -1.25 }, front: { yaw: 0 }, top: { yaw: 0, pitch: 1.2 } };
const shots = new Map<string, Promise<string>>();

function shoot(id: string, face: Face, size: number): Promise<string> {
  const key = `${id}/${face}/${size}`;
  let p = shots.get(key);
  if (!p) {
    p = hasReal(id)
      ? load(`./models/real/${id}.glb`).then((scene) => {
          const turned = cloneSkinned(scene) as Group;
          turned.rotation.y = REAL[id].yaw;
          const holder = new Group();
          holder.add(turned);
          return renderThumb(holder, size, POSE[face]);
        })
      : Promise.resolve().then(() => renderThumb(buildModel(id), size, POSE[face]));
    shots.set(key, p);
  }
  return p;
}

export function useSprite(id: string, face: Face = 'right', size = 256) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let live = true;
    shoot(id, face, size).then((u) => live && setUrl(u), () => undefined);
    return () => {
      live = false;
    };
  }, [id, face, size]);
  return url;
}

// ---------- the scanned body, as two matching pictures: skin, and what is inside ----------
export const BODY_PARTS = ['heart', 'liver', 'stomach', 'kidneys'] as const;
export type BodyPart = (typeof BODY_PARTS)[number];
export interface BodyShots {
  skin: string;
  inside: string;
  /** Where each part is in the picture, 0..1 from the top-left corner. */
  at: Record<BodyPart, [number, number]>;
  icon: Record<BodyPart, string>;
}
let body: Promise<BodyShots> | null = null;

function shootBody(): Promise<BodyShots> {
  const names = ['torso', 'lungs', ...BODY_PARTS];
  return Promise.all(names.map((n) => load(`./models/body/${n}.glb`))).then((scenes) => {
    const [torso, ...organs] = scenes.map((s) => s.clone(true));
    const paint = (g: Group, color: string) => {
      const m = new MeshStandardMaterial({ color, roughness: 0.75 });
      g.traverse((o) => {
        if (o instanceof Mesh) o.material = m;
      });
    };
    // the bright photo lights wash the scans out, so each part gets a strong textbook colour
    paint(torso, '#cf9670');
    ['#d98f8c', '#a8262b', '#6e2f22', '#c9756a', '#7d3f33'].forEach((c, i) => paint(organs[i], c));
    const inner = new Group();
    organs.forEach((o) => inner.add(o));
    const holder = new Group();
    holder.add(torso, inner);
    // both pictures frame the same box (hidden parts still count), so they line up exactly
    let cam!: PerspectiveCamera;
    inner.visible = false;
    const skinUrl = renderThumb(holder, 640, { yaw: 0, onCamera: (c) => (cam = c.clone()) });
    inner.visible = true;
    torso.visible = false;
    const insideUrl = renderThumb(holder, 640, { yaw: 0 });
    const at = {} as BodyShots['at'];
    const icon = {} as BodyShots['icon'];
    BODY_PARTS.forEach((part, i) => {
      const organ = organs[i + 1];
      organ.updateMatrixWorld(true);
      const p = new Box3().setFromObject(organ).getCenter(new Vector3()).project(cam);
      at[part] = [(p.x + 1) / 2, (1 - p.y) / 2];
    });
    BODY_PARTS.forEach((part, i) => {
      icon[part] = renderThumb(organs[i + 1], 160, { yaw: 0 });
    });
    return { skin: skinUrl, inside: insideUrl, at, icon };
  });
}

export function useBodyShots() {
  const [shots, setShots] = useState<BodyShots>();
  useEffect(() => {
    let live = true;
    (body ??= shootBody()).then((s) => live && setShots(s), () => (body = null));
    return () => {
      live = false;
    };
  }, []);
  return shots;
}
