import { forwardRef, useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import {
  Box3,
  Group,
  HemisphereLight,
  DirectionalLight,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BufferGeometry, Material, Mesh } from 'three';
import * as A from './animals';
import * as O from './objects';
import IDS from './modelIds.json';

/**
 * Single source of truth for every 3D model. Content (facts.json) references
 * models by id; the build validator checks ids against modelIds.json.
 */
const BUILDERS = {
  elephant: () => A.elephant(),
  mammoth: A.mammoth,
  lion: A.lion,
  zebra: A.zebra,
  giraffe: A.giraffe,
  rhino: A.rhino,
  hippo: A.hippo,
  fox: A.fox,
  deer: A.deer,
  rabbit: () => A.rabbit(),
  bat: A.bat,
  owl: A.owl,
  eagle: A.eagle,
  parrot: A.parrot,
  penguin: A.penguin,
  feather: A.feather,
  snake: A.snake,
  turtle: () => A.turtle(),
  tortoise: () => A.turtle({ tortoise: true }),
  lizard: A.lizard,
  fish: A.fish,
  frog: () => A.frog(),
  froglet: () => A.frog({ scale: 0.7, tail: true }),
  tadpole: A.tadpole,
  frogspawn: A.frogspawn,
  butterfly: A.butterfly,
  cricket: A.cricket,
  panda: A.panda,
  kangaroo: A.kangaroo,
  whale: A.whale,
  octopus: A.octopus,
  jellyfish: A.jellyfish,
  clownfish: A.clownfish,
  starfish: A.starfish,
  crab: A.crab,
  coral: A.coral,
  anemone: A.anemone,
  kelp: A.kelp,
  trex: A.trex,
  diplodocus: A.diplodocus,
  triceratops: A.triceratops,
  moon: O.moon,
  shuttlecock: O.shuttlecock,
  paddle: O.paddle,
  'curling-stone': O.curlingStone,
  'cricket-bat': O.cricketBat,
  'soccer-ball': O.soccerBall,
  'heart-organ': O.heartOrgan,
  brain: O.brain,
  lungs: O.lungs,
  book: () => O.book(),
  'open-book': () => O.book('#b46cff', true),
  robot: O.robot,
  palette: O.palette,
  compass: O.compass,
  scroll: O.scroll,
  lock: O.lock,
  'finish-flag': O.finishFlag,
  acorn: O.acorn,
  sunflower: O.sunflower,
  speaker: O.speaker,
  flask: O.flask,
  lens: O.lens,
  atom: O.atom,
  bust: O.bust,
  globe: O.globe,
  star: () => O.star(),
  nest: O.nest,
} satisfies Record<string, () => Group>;

export type ModelId = keyof typeof BUILDERS;
/** Is there a procedural (toy) version of this id? Downloaded-only models have none. */
export const isToy = (id: string): id is ModelId => id in BUILDERS;

// Keep the JSON list (used by the Node content validator) in sync at dev time.
if (import.meta.env.DEV) {
  const missing = Object.keys(BUILDERS).filter((k) => !(IDS as string[]).includes(k));
  if (missing.length) console.warn('modelIds.json is missing:', missing.join(', '));
}

/**
 * Bake a freshly built model into one mesh per material (world transforms
 * applied). A 50-part animal becomes ~5 draw calls; the result is cached and
 * every instance is a cheap clone sharing geometry and materials.
 */
function bake(src: Group): Group {
  src.updateMatrixWorld(true);
  const byMat = new Map<Material, BufferGeometry[]>();
  src.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    let g = (o.geometry as BufferGeometry).clone();
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    // mirrored parts (negative scale) would flip triangle winding once baked
    if (o.matrixWorld.determinant() < 0) {
      for (const attr of Object.values(g.attributes)) {
        const a = attr.array as Float32Array;
        const n = attr.itemSize;
        for (let t = 0; t < attr.count; t += 3)
          for (let k = 0; k < n; k++) {
            const i1 = (t + 1) * n + k;
            const i2 = (t + 2) * n + k;
            [a[i1], a[i2]] = [a[i2], a[i1]];
          }
      }
    }
    const m = o.material as Material;
    if (!byMat.has(m)) byMat.set(m, []);
    byMat.get(m)!.push(g);
  });
  const out = new Group();
  for (const [m, list] of byMat) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (merged) {
      merged.computeBoundingSphere();
      out.add(new Mesh(merged, m));
    }
  }
  return out;
}

const baked = new Map<string, Group>();

export function buildModel(id: ModelId | string): Group {
  let proto = baked.get(id);
  if (!proto) {
    const make = (BUILDERS as Record<string, () => Group>)[id];
    if (!make) throw new Error(`Unknown model "${id}"`);
    proto = bake(make());
    baked.set(id, proto);
  }
  const g = proto.clone();
  g.name = `model:${id}`;
  return g;
}

/** Size of a model's bounding box (cached). */
const sizes = new Map<string, { size: Vector3; min: Vector3; center: Vector3 }>();
export function modelBounds(id: ModelId) {
  let b = sizes.get(id);
  if (!b) {
    const box = new Box3().setFromObject(buildModel(id));
    b = { size: box.getSize(new Vector3()), min: box.min.clone(), center: box.getCenter(new Vector3()) };
    sizes.set(id, b);
  }
  return b;
}

// ---------------------------------------------------------------- R3F component

type ModelProps = Omit<ThreeElements['group'], 'id' | 'ref'> & {
  id: ModelId;
  /** Scale so the model's largest dimension equals this many metres. */
  fit?: number;
  /** 'base' (default): origin at the model's feet. 'center': origin at its middle (emblems). */
  anchor?: 'base' | 'center';
};

/** Drop-in 3D model. Geometry/materials are shared across instances. */
export const Model = forwardRef<Group, ModelProps>(function Model({ id, fit, anchor = 'base', ...rest }, ref) {
  const obj = useMemo(() => buildModel(id), [id]);
  const { size, min, center } = modelBounds(id);
  const k = fit ? fit / Math.max(size.x, size.y, size.z) : 1;
  const offset: [number, number, number] = anchor === 'center' ? [-center.x * k, -center.y * k, -center.z * k] : [-center.x * k, -min.y * k, -center.z * k];
  return (
    <group ref={ref} {...rest}>
      <group position={offset} scale={k}>
        <primitive object={obj} />
      </group>
    </group>
  );
});

// ---------------------------------------------------------------- thumbnails

/** Best viewing angle per model for 2D thumbnails (default: 3/4 front). */
const THUMB_POSE: Partial<Record<ModelId, { yaw?: number; pitch?: number }>> = {
  fish: { yaw: -1.25 },
  snake: { yaw: -1.0, pitch: 0.35 },
  lizard: { yaw: -1.2, pitch: 0.35 },
  butterfly: { yaw: 0, pitch: 1.1 },
  feather: { yaw: 0 },
  palette: { yaw: 0 },
  tadpole: { yaw: -1.2 },
  diplodocus: { yaw: -1.0 },
  bat: { yaw: 0 },
};

let thumbRenderer: WebGLRenderer | null = null;
let thumbScene: Scene | null = null;
const thumbs = new Map<string, string>();

/**
 * Renders a model once to a transparent PNG data URL (used in puzzle tiles
 * when no Wikimedia photo is available, e.g. offline). One small shared
 * WebGL context; results are cached for the session.
 */
function ensureThumbRig() {
  if (!thumbRenderer) {
    thumbRenderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.outputColorSpace = SRGBColorSpace;
    thumbRenderer.toneMapping = ACESFilmicToneMapping;
    thumbScene = new Scene();
    thumbScene.environment = new PMREMGenerator(thumbRenderer).fromScene(new RoomEnvironment(), 0.04).texture;
    thumbScene.add(new HemisphereLight('#ffffff', '#b9d9ff', 1.2));
    const key = new DirectionalLight('#ffffff', 1.6);
    key.position.set(2, 4, 3);
    thumbScene.add(key);
  }
  return { renderer: thumbRenderer, scene: thumbScene! };
}

/**
 * Photograph any object for a 2D card: framed to fit, three-quarter view.
 * Shared by the procedural toys and the downloaded models.
 */
export function renderThumb(model: Group, size: number, pose: { yaw?: number; pitch?: number; onCamera?: (cam: PerspectiveCamera) => void } = {}): string {
  const { renderer, scene } = ensureThumbRig();
  renderer.setSize(size, size, false);
  model.rotation.set(pose.pitch ?? 0, pose.yaw ?? -0.55, 0, 'YXZ');
  const holder = new Group();
  holder.add(model);
  scene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new Box3().setFromObject(holder);
  const center = box.getCenter(new Vector3());
  const dims = box.getSize(new Vector3());
  const fov = 26;
  const cam = new PerspectiveCamera(fov, 1, 0.001, 1000);
  // fit the larger of width/height, then back off by the depth so nothing clips
  const fit = Math.max(dims.x, dims.y) / 2 / Math.tan((fov * Math.PI) / 360);
  const dist = fit * 1.12 + dims.z / 2;
  cam.position.set(center.x, center.y + dist * 0.12, center.z + dist);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  pose.onCamera?.(cam);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(holder);
  return url;
}

export function modelThumb(id: ModelId | string, size = 192): string {
  const key = `${id}@${size}`;
  const hit = thumbs.get(key);
  if (hit) return hit;
  const url = renderThumb(buildModel(id), size, THUMB_POSE[id as ModelId] ?? {});
  thumbs.set(key, url);
  return url;
}
