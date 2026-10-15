import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Texture,
} from 'three';

/**
 * Tiny modelling kit for Wondarta's procedural "toy" models.
 * Geometry and materials are cached and shared, so a scene full of animals
 * costs a handful of GPU buffers, and nothing is ever downloaded.
 */

type V3 = [number, number, number];

// ---------------------------------------------------------------- geometry cache

const geo = new Map<string, BufferGeometry>();
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geo.get(key) as T | undefined;
  if (!g) {
    g = make();
    geo.set(key, g);
  }
  return g;
}

export const G = {
  sphere: () => cached('sphere', () => new SphereGeometry(1, 28, 20)),
  lowSphere: () => cached('lowSphere', () => new SphereGeometry(1, 14, 10)),
  cyl: () => cached('cyl', () => new CylinderGeometry(1, 1, 1, 20)),
  taper: (top: number) => cached(`taper${top}`, () => new CylinderGeometry(top, 1, 1, 18)),
  cone: () => cached('cone', () => new ConeGeometry(1, 1, 20)),
  capsule: () => cached('capsule', () => new CapsuleGeometry(0.5, 1, 8, 16)),
  torus: (tube: number, arc = Math.PI * 2) => cached(`torus${tube}${arc}`, () => new TorusGeometry(1, tube, 12, 40, arc)),
  box: () => cached('box', () => new BoxGeometry(1, 1, 1)),
  halfSphere: () => cached('halfSphere', () => new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)),
};

// ---------------------------------------------------------------- material cache

const mats = new Map<string, Material>();

interface MatOpts {
  rough?: number;
  metal?: number;
  coat?: number;
  map?: Texture;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  side?: 0 | 1 | 2;
}

/** Soft "toy" material. Pass `coat` for a glossy lacquered look (eyes, shells, gear). */
export function M(color: string, o: MatOpts = {}): Material {
  const key = `${color}|${o.rough ?? ''}|${o.metal ?? ''}|${o.coat ?? ''}|${o.map?.uuid ?? ''}|${o.emissive ?? ''}|${o.opacity ?? ''}|${o.side ?? ''}`;
  let m = mats.get(key);
  if (!m) {
    const base = {
      color,
      roughness: o.rough ?? 0.55,
      metalness: o.metal ?? 0,
      map: o.map ?? null,
      emissive: o.emissive ?? '#000000',
      emissiveIntensity: o.emissiveIntensity ?? 1,
      transparent: o.opacity !== undefined,
      opacity: o.opacity ?? 1,
      side: o.side ?? 0,
    };
    m = o.coat ? new MeshPhysicalMaterial({ ...base, clearcoat: o.coat, clearcoatRoughness: 0.12 }) : new MeshStandardMaterial(base);
    mats.set(key, m);
  }
  return m;
}

// ---------------------------------------------------------------- mesh helpers

export function mesh(g: BufferGeometry, m: Material, pos: V3 = [0, 0, 0], scale: V3 | number = 1, rot: V3 = [0, 0, 0]) {
  const x = new Mesh(g, m);
  x.position.set(...pos);
  if (typeof scale === 'number') x.scale.setScalar(scale);
  else x.scale.set(...scale);
  x.rotation.set(...rot);
  return x;
}

export const ball = (m: Material, pos: V3, r: V3 | number) => mesh(G.sphere(), m, pos, r);

/** Cylinder between two points (limbs, necks, antlers). */
export function limb(m: Material, a: V3, b: V3, r: number, taper = 1) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const len = A.distanceTo(B);
  const x = new Mesh(taper === 1 ? G.cyl() : G.taper(taper), m);
  x.scale.set(r, len, r);
  x.position.copy(A).add(B).multiplyScalar(0.5);
  x.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return x;
}

/** Smooth tube along points (trunks, tails, snakes). */
export function tube(m: Material, pts: V3[], r: number, segs = 32) {
  const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
  return new Mesh(new TubeGeometry(curve, segs, r, 10, false), m);
}

/** Glossy toy eyes with a highlight, mirrored at ±x. */
export function eyes(parent: Group, x: number, y: number, z: number, r: number, iris?: string) {
  const black = M('#141b22', { rough: 0.15, coat: 1 });
  const white = M('#ffffff', { rough: 0.2 });
  for (const s of [-1, 1]) {
    if (iris) parent.add(ball(M(iris, { rough: 0.2, coat: 1 }), [s * x, y, z], r * 1.35));
    parent.add(ball(black, [s * x, y, z + (iris ? r * 0.45 : 0)], r));
    parent.add(ball(white, [s * x + r * 0.35, y + r * 0.35, z + r * (iris ? 1.25 : 0.8)], r * 0.28));
  }
}

export function flatShape(points: [number, number][], m: Material) {
  const s = new Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return new Mesh(new ShapeGeometry(s, 8), m);
}

export function group(...children: (Mesh | Group)[]) {
  const g = new Group();
  children.forEach((c) => g.add(c));
  return g;
}

// ---------------------------------------------------------------- canvas textures (patterns)

const tex = new Map<string, CanvasTexture>();
export function pattern(key: string, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]) {
  let t = tex.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    draw(c.getContext('2d')!, 256);
    t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
    tex.set(key, t);
  }
  return t;
}

let seed = 7;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
