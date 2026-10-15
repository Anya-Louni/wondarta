import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { Box3, Group, Mesh, Vector3, type Material, type MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { renderThumb } from './index';

/**
 * Downloaded models with real proportions (see CREDITS.md). They replace the
 * procedural toys wherever a matching id exists, and the toys stay as the
 * instant placeholder while a file streams in.
 *
 *   yaw     turns the file so the animal faces +Z, like the procedural models
 *   idle    animation clip to loop, when the file has one
 *   hop     animation clip to play when a kid taps it
 */
export const REAL = {
  elephant: { yaw: 0 },
  lion: { yaw: 0 },
  giraffe: { yaw: 0 },
  zebra: { yaw: 0 },
  rhino: { yaw: 0 },
  hippo: { yaw: 0 },
  fox: { yaw: 0 },
  deer: { yaw: 0 },
  rabbit: { yaw: 0 },
  owl: { yaw: 0 },
  frog: { yaw: 0, idle: 'FrogArmature|Frog_Idle', hop: 'FrogArmature|Frog_Jump' },
  panda: { yaw: 0 },
  kangaroo: { yaw: 0 },
  penguin: { yaw: 0 },
  sunflower: { yaw: 0 },
  tulip: { yaw: 0 },
  rose: { yaw: 0 },
  daisy: { yaw: 0 },
  bee: { yaw: Math.PI },
  monarch: { yaw: -Math.PI / 2 },
  whale: { yaw: 0 },
  octopus: { yaw: 0 },
} as Record<string, { yaw: number; idle?: string; hop?: string }>;

export type RealId = keyof typeof REAL;
export const hasReal = (id: string): id is RealId => id in REAL;
const url = (id: string) => `./models/real/${id}.glb`;

/** Poly models often come glossy-black-lit; matte them to sit with the rest of the world. */
function soften(m: Material) {
  const s = m as MeshStandardMaterial;
  if ('roughness' in s) s.roughness = Math.max(s.roughness ?? 0.8, 0.72);
  if ('metalness' in s) s.metalness = 0;
}

const sizes = new Map<string, { size: Vector3; min: Vector3; center: Vector3 }>();

type Props = Omit<ThreeElements['group'], 'id' | 'ref'> & {
  id: RealId;
  /** Largest dimension in metres. */
  fit: number;
  /** Name of a clip to play instead of idle (e.g. the hop clip). */
  action?: string | null;
};

export function Real({ id, fit, action, ...rest }: Props) {
  const { scene, animations } = useGLTF(url(id));
  const spec = REAL[id];
  const obj = useMemo(() => {
    const c = cloneSkinned(scene) as Group;
    c.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = false;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(soften);
      }
    });
    c.rotation.y = spec.yaw;
    return c;
  }, [scene, spec.yaw]);

  let b = sizes.get(id);
  if (!b) {
    const holder = new Group();
    holder.add(obj);
    holder.updateMatrixWorld(true);
    const box = new Box3().setFromObject(holder);
    b = { size: box.getSize(new Vector3()), min: box.min.clone(), center: box.getCenter(new Vector3()) };
    sizes.set(id, b);
    holder.remove(obj);
  }
  const k = fit / Math.max(b.size.x, b.size.y, b.size.z);

  const root = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const name = action ?? spec.idle;
    const a = name ? actions[name] : undefined;
    a?.reset().fadeIn(0.2).play();
    return () => {
      a?.fadeOut(0.2);
    };
  }, [actions, action, spec.idle]);

  return (
    <group {...rest}>
      <group ref={root} position={[-b.center.x * k, -b.min.y * k, -b.center.z * k]} scale={k}>
        <primitive object={obj} />
      </group>
    </group>
  );
}

export function preloadReal(ids: RealId[]) {
  ids.forEach((id) => useGLTF.preload(url(id)));
}

// ---------------------------------------------------------------- thumbnails for cards

const loader = new GLTFLoader();
const pending = new Map<string, Promise<string>>();

/** A picture of the downloaded model, for 2D cards. Resolves once the file has loaded. */
export function realThumb(id: RealId, size = 192): Promise<string> {
  const key = `${id}@${size}`;
  let p = pending.get(key);
  if (!p) {
    p = loader.loadAsync(url(id)).then((g) => {
      const holder = new Group();
      const c = cloneSkinned(g.scene) as Group;
      c.rotation.y = REAL[id].yaw;
      holder.add(c);
      return renderThumb(holder, size);
    });
    pending.set(key, p);
  }
  return p;
}
