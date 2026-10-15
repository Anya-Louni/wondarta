import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3, type Material } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Kenney 3D assets (www.kenney.nl), CC0 1.0. Credited in CREDITS.md and on
 * the in-app Credits panel.
 *   - Nature Kit: trees, rocks, plants, logs  -> public/models/kenney/nature/
 *   - Cube Pets:  plush friends in Wondoo's Den -> public/models/kenney/pets/
 * Only the files the app uses are shipped (about 1.2 MB total), and each
 * scene loads just its own.
 */

const NATURE = [
  'tree_oak', 'tree_default', 'tree_detailed', 'tree_fat', 'tree_plateau', 'tree_pineRoundA', 'tree_pineRoundC',
  'tree_pineTallA_detailed', 'tree_pineDefaultA', 'tree_cone', 'rock_largeA', 'rock_largeC', 'rock_smallA', 'rock_smallC',
  'rock_tallA', 'stone_largeB', 'plant_bush', 'plant_bushLarge', 'plant_bushDetailed', 'grass', 'grass_large', 'grass_leafs',
  'flower_redA', 'flower_yellowA', 'flower_purpleA', 'mushroom_red', 'mushroom_tanGroup', 'lily_large', 'lily_small', 'log',
  'log_large', 'stump_round', 'stump_old', 'campfire_stones', 'statue_column', 'statue_head', 'sign', 'fence_simple', 'canoe',
] as const;
export type NatureId = (typeof NATURE)[number];

const PETS = ['elephant', 'lion', 'panda', 'bunny', 'penguin'] as const;
export type PetId = (typeof PETS)[number];

const url = (id: NatureId) => `./models/kenney/nature/${id}.glb`;
const petUrl = (id: PetId) => `./models/kenney/pets/animal-${id}.glb`;

/**
 * Nature Kit ships in Kenney's teal/orange palette. We remap its named
 * materials to Wondarta's sky-and-grass palette so it sits with everything
 * else (a recolour only, the geometry is Kenney's).
 */
const PALETTE: Record<string, string> = {
  leafsGreen: '#56b84a',
  leafsDark: '#3a9447',
  leafsFall: '#e6a03a',
  grass: '#6cc24f',
  woodBark: '#8a5a36',
  woodBarkDark: '#6e4529',
  wood: '#b07a4a',
  woodDark: '#8a5a36',
  woodInner: '#e8c99a',
  dirt: '#b98552',
  stone: '#b8c3cb',
  stoneDark: '#8f9ca6',
};

const tinted = new Map<Material, Material>();
function retint(m: Material): Material {
  let t = tinted.get(m);
  if (!t) {
    const src = m as MeshStandardMaterial;
    const hex = PALETTE[m.name];
    t = new MeshStandardMaterial({
      color: hex ? new Color(hex) : src.color?.clone() ?? new Color('#ffffff'),
      roughness: m.name.startsWith('stone') ? 0.55 : 0.75,
      metalness: 0,
      flatShading: false,
    });
    t.name = m.name;
    tinted.set(m, t);
  }
  return t;
}

const bounds = new Map<string, { size: Vector3; min: Vector3; center: Vector3 }>();
function measure(key: string, obj: Group) {
  let b = bounds.get(key);
  if (!b) {
    const box = new Box3().setFromObject(obj);
    b = { size: box.getSize(new Vector3()), min: box.min.clone(), center: box.getCenter(new Vector3()) };
    bounds.set(key, b);
  }
  return b;
}

type Props = Omit<ThreeElements['group'], 'id' | 'ref'> & {
  id: NatureId;
  /** Scale so the largest dimension equals this many metres. */
  fit?: number;
};

/** A Kenney Nature Kit model, recoloured to our palette, sitting on y = 0. */
export function Nature({ id, fit, ...rest }: Props) {
  const { scene } = useGLTF(url(id));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof Mesh) o.material = Array.isArray(o.material) ? o.material.map(retint) : retint(o.material);
    });
    return c;
  }, [scene]);
  const { size, min, center } = measure(`n:${id}`, obj);
  const k = fit ? fit / Math.max(size.x, size.y, size.z) : 1;
  return (
    <group {...rest}>
      <group position={[-center.x * k, -min.y * k, -center.z * k]} scale={k}>
        <primitive object={obj} />
      </group>
    </group>
  );
}

/**
 * A Kenney Cube Pet with its own animations (idle / dance / gesture). Used as
 * plush friends in Wondoo's Den: tap one and it dances.
 */
export function Pet({ id, fit = 0.9, action = 'idle', ...rest }: Omit<ThreeElements['group'], 'id' | 'ref'> & { id: PetId; fit?: number; action?: string }) {
  const { scene, animations } = useGLTF(petUrl(id));
  const obj = useMemo(() => cloneSkinned(scene) as Group, [scene]);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const a = actions[action] ?? actions.idle;
    a?.reset().fadeIn(0.25).play();
    return () => {
      a?.fadeOut(0.25);
    };
  }, [actions, action]);
  const { size, min, center } = measure(`p:${id}`, obj);
  const k = fit / Math.max(size.x, size.y, size.z);
  return (
    <group {...rest}>
      <group ref={root} position={[-center.x * k, -min.y * k, -center.z * k]} scale={k}>
        <primitive object={obj} />
      </group>
    </group>
  );
}

/** Warm the cache for a scene's models before it mounts. */
export function preloadNature(ids: NatureId[]) {
  ids.forEach((id) => useGLTF.preload(url(id)));
}
export function preloadPets(ids: PetId[] = [...PETS]) {
  ids.forEach((id) => useGLTF.preload(petUrl(id)));
}

export { NATURE, PETS };
