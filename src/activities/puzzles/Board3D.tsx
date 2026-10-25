import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeElements, type ThreeEvent } from '@react-three/fiber';
import {
  BufferGeometry,
  CanvasTexture,
  InstancedMesh,
  Object3D,
  Color as ThreeColor,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  type PerspectiveCamera,
} from 'three';
import { create } from 'zustand';
import { Model, isToy, type ModelId } from '../../models';
import { Real, hasReal } from '../../models/real';

/**
 * The games' 3D stage. Each game keeps its 400 x 240 board maths; this file
 * turns board points into places in a small lit 3D world, and pointer hits
 * back into board points.
 */
export const W = 400;
export const H = 240;
const U = 20; // board pixels per metre
type V3 = [number, number, number];

/** Top view: the board lies on the ground. Board y grows towards the camera. */
export const top = (x: number, y: number, h = 0): V3 => [(x - W / 2) / U, h, (y - H / 2) / U];
/** Side view: the board stands up like a stage. Board y grows downwards. */
export const side = (x: number, y: number, z = 0): V3 => [(x - W / 2) / U, (H / 2 - y) / U, z];
/** Board pixels to metres. */
export const m = (px: number) => px / U;

/** How many game boards are open. The world behind them pauses while one is. */
export const useGameOn = create<number>(() => 0);

const CAM = {
  top: { position: [0, 11.5, 11.8] as V3, fov: 44, look: [0, 0, 0.9] as V3 },
  side: { position: [0, 0, 17] as V3, fov: 42, look: [0, 0, 0] as V3 },
};

/**
 * Aims the camera, and keeps the whole board in view sideways whatever the shape
 * of the screen: on a tall phone the board area is squarer, so the camera opens up
 * vertically instead of cutting off the sides.
 */
function Look({ at, fov }: { at: V3; fov: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { width, height } = useThree((s) => s.size);
  useEffect(() => {
    const wide = Math.tan((fov * Math.PI) / 360) * (W / H);
    camera.fov = (Math.atan(wide / (width / height || W / H)) * 360) / Math.PI;
    camera.updateProjectionMatrix();
    camera.lookAt(...at);
  }, [camera, at, fov, width, height]);
  return null;
}

interface BoardProps {
  view?: 'top' | 'side';
  /** CSS class for the background behind the 3D world (sky, sea, night). */
  className?: string;
  onPoint?: (p: { x: number; y: number }) => void;
  onDown?: (p: { x: number; y: number }) => void;
  onUp?: () => void;
  /** Soft shadows under everything, cast straight down onto the ground (top view). */
  shadows?: boolean;
  /** Height of the pointer plane in the top view (for things that fly). */
  lift?: number;
  children: ReactNode;
}

export function Board3D({ view = 'top', className = '', onPoint, onDown, onUp, shadows = view === 'top', lift = 0, children }: BoardProps) {
  useEffect(() => {
    useGameOn.setState((n) => n + 1);
    return () => useGameOn.setState((n) => n - 1);
  }, []);
  const toBoard = (e: ThreeEvent<PointerEvent>) => (view === 'top' ? { x: e.point.x * U + W / 2, y: e.point.z * U + H / 2 } : { x: e.point.x * U + W / 2, y: H / 2 - e.point.y * U });
  const cam = CAM[view];
  return (
    <div className={`arcade-board three ${className}`} onPointerUp={onUp} onPointerLeave={onUp} onPointerCancel={onUp}>
      <Canvas shadows={shadows ? 'percentage' : false} dpr={[1, 1.75]} camera={{ position: cam.position, fov: cam.fov }} gl={{ antialias: true, alpha: true }}>
        <Look at={cam.look} fov={cam.fov} />
        <hemisphereLight args={['#f2f9ff', '#8a9a6a', 1.05]} />
        <directionalLight
          position={view === 'top' ? [-9, 11, -4] : [5, 12, 9]}
          intensity={1.9}
          color="#fff4df"
          castShadow={shadows}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-6, 4, 6]} intensity={0.45} color="#cfe6ff" />
        {/* catches every pointer, wherever the objects are */}
        <mesh
          userData={{ ground: true }}
          position={[0, view === 'top' ? lift : 0, 0]}
          rotation={view === 'top' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
          onPointerMove={onPoint && ((e) => onPoint(toBoard(e)))}
          onPointerDown={(e) => {
            const p = toBoard(e);
            onDown?.(p);
            onPoint?.(p);
          }}
        >
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {shadows && <CastAll />}
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}

/** Everything casts a shadow onto the ground (models load late, so this keeps checking). */
function CastAll() {
  const scene = useThree((s) => s.scene);
  const n = useRef(0);
  useFrame(() => {
    if (n.current++ % 30) return;
    scene.traverse((o) => {
      if (o instanceof Mesh && !(o instanceof InstancedMesh)) {
        o.castShadow = !o.userData.ground;
      }
    });
  });
  return null;
}

/** Any model by id: the downloaded one when there is one, the procedural one otherwise (and while it loads). */
export function Thing({ id, fit, ...rest }: { id: string; fit: number } & Omit<ThreeElements['group'], 'id' | 'ref'>) {
  const toy = isToy(id) ? <Model id={id as ModelId} fit={fit} {...rest} /> : null;
  if (!hasReal(id)) return toy;
  return (
    <Suspense fallback={toy}>
      <Real id={id} fit={fit} {...rest} />
    </Suspense>
  );
}

/** Repaints everything inside in one colour, on its own materials (the shared ones stay as they are). */
export function Tint({ color, opacity = 1, children }: { color: string; opacity?: number; children: ReactNode }) {
  const g = useRef<Group>(null);
  const mat = useMemo(() => new MeshStandardMaterial({ roughness: 0.6, transparent: true }), []);
  useFrame(() => {
    mat.color.set(color);
    mat.opacity = opacity;
    g.current?.traverse((o) => {
      if (o instanceof Mesh && o.material !== mat) o.material = mat;
    });
  });
  useEffect(() => () => mat.dispose(), [mat]);
  return <group ref={g}>{children}</group>;
}

// ---------------------------------------------------------------- grounds

const meadowArea = (i: number): [number, number] => [((i * 0.6180339) % 1) * 30 - 15, ((i * 0.7548776) % 1) * 20 - 9];

/** Grass, a soft ground colour and a few flowers at the edges. */
export function Meadow({ grass = 900, color = '#7cc455', short = 0.75, keep }: { grass?: number; color?: string; short?: number; keep?: (x: number, z: number) => boolean }) {
  const map = useMottled(color);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} userData={{ ground: true }} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial map={map} roughness={1} />
      </mesh>
      <Blades count={grass} height={short} keep={keep} />
    </>
  );
}

/** Soft blotches of lighter and darker shades, so a floor never looks like flat paint. */
function useMottled(color: string, spots = 260) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const base = new ThreeColor(color);
    x.fillStyle = `#${base.getHexString()}`;
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < spots; i++) {
      const k = Math.abs(Math.sin(i * 91.7) * 4375.85) % 1;
      x.fillStyle = `#${base
        .clone()
        .offsetHSL(0, 0, (k - 0.5) * 0.06)
        .getHexString()}`;
      x.globalAlpha = 0.5;
      x.beginPath();
      x.arc(((i * 0.618) % 1) * 256, ((i * 0.7549) % 1) * 256, 6 + k * 22, 0, Math.PI * 2);
      x.fill();
    }
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(5, 3.4);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [color, spots]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Grass blades: thin lit cones in clumps of three, all in one draw call. */
export function Blades({
  count = 900,
  height = 0.75,
  color = '#7fcf4c',
  area = meadowArea,
  keep,
}: {
  count?: number;
  height?: number;
  color?: string;
  area?: (i: number) => [number, number];
  keep?: (x: number, z: number) => boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const n = count * 3;
  useEffect(() => {
    const mesh = ref.current!;
    const d = new Object3D();
    const base = new ThreeColor(color);
    for (let i = 0; i < n; i++) {
      const [cx, cz] = area(Math.floor(i / 3));
      const k = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const h = height * (0.55 + k * 0.6);
      d.position.set(cx + Math.cos(i * 2.1) * 0.12, h / 2, cz + Math.sin(i * 2.1) * 0.12);
      d.rotation.set(Math.cos(i * 2.1) * 0.35, k * 6, Math.sin(i * 2.1) * 0.35);
      d.scale.set(1, keep && !keep(cx, cz) ? 0 : h, 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, base.clone().offsetHSL((k - 0.5) * 0.06, 0, (k - 0.5) * 0.18));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [n, height, color, area, keep]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <coneGeometry args={[0.045, 1, 4]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}

/** A flat floor for the top view. */
export function Floor({ color, roughness = 0.9 }: { color: string; roughness?: number }) {
  const map = useMottled(color);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} userData={{ ground: true }} receiveShadow>
      <planeGeometry args={[60, 40]} />
      <meshStandardMaterial map={map} roughness={roughness} />
    </mesh>
  );
}

/** A strip of ground along the bottom of a side view. */
export function GroundStrip({ y = -6, color = '#c9a94f', depth = 8 }: { y?: number; color?: string; depth?: number }) {
  return (
    <mesh position={[0, y - 6, 0]} userData={{ ground: true }} receiveShadow>
      <boxGeometry args={[40, 12, depth]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

// ---------------------------------------------------------------- small props

/** A milkweed leaf, the only plant monarch caterpillars eat. */
export function Leaf({ position, spin = 0 }: { position: V3; spin?: number }) {
  return (
    <group position={position} rotation={[0.25, spin, 0]} scale={1.35}>
      <mesh scale={[0.42, 0.07, 0.8]} position={[0, 0.12, 0]}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshStandardMaterial color="#58b33a" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 6]} />
        <meshStandardMaterial color="#cfe8a8" />
      </mesh>
    </group>
  );
}

/** Jade green with a row of gold dots, like a real monarch chrysalis. */
export function Chrysalis({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh scale={[0.42, 0.62, 0.42]} position={[0, 0.62, 0]}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color="#5fc28a" roughness={0.35} />
      </mesh>
      {[-0.22, -0.07, 0.07, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.92, 0.34]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshStandardMaterial color="#e2b23a" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** A germ: a round body covered in little spikes. */
export function Germ({ position, hue, scale = 1 }: { position: V3; hue: number; scale?: number }) {
  const spikes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, k) => {
        const a = k * 2.4;
        const y = 1 - (2 * (k + 0.5)) / 10;
        const r = Math.sqrt(1 - y * y);
        return [Math.cos(a) * r, y, Math.sin(a) * r] as V3;
      }),
    [],
  );
  const body = `hsl(${hue}, 62%, 52%)`;
  const g = useRef<Group>(null);
  useFrame((st) => {
    if (g.current) g.current.rotation.y = st.clock.elapsedTime * 0.8 + hue;
  });
  return (
    <group ref={g} position={position} scale={scale}>
      <mesh>
        <icosahedronGeometry args={[0.42, 2]} />
        <meshStandardMaterial color={body} roughness={0.45} />
      </mesh>
      {spikes.map((p, k) => (
        <mesh key={k} position={[p[0] * 0.48, p[1] * 0.48, p[2] * 0.48]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color={`hsl(${hue}, 62%, 36%)`} />
        </mesh>
      ))}
    </group>
  );
}

/** A white blood cell: soft, pale, with a lobed purple nucleus inside. */
export function WhiteCell({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh scale={[2, 0.55, 0.7]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshStandardMaterial color="#f6f8ff" roughness={0.3} transparent opacity={0.82} />
      </mesh>
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]} scale={[0.42, 0.28, 0.32]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#8d6cc9" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** A red blood cell: a disc that dips in the middle. */
export function RedCell({ position, rot = 0 }: { position: V3; rot?: number }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2 + rot, rot, 0]}>
      <torusGeometry args={[0.42, 0.22, 12, 24]} />
      <meshStandardMaterial color="#d93838" roughness={0.45} />
    </mesh>
  );
}

const wingGeo = (() => {
  // one membrane wing, from the body out to the tip, along +x
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([0, 0, 0.35, 0, 0, -0.45, 2.3, 0, -0.1, 0, 0, 0.35, 2.3, 0, -0.1, 1.2, 0, 0.45], 3));
  g.computeVertexNormals();
  return g;
})();

/** A pterosaur: furry body, long beak, head crest, and skin wings that flap. */
export function Pterosaur({ flap }: { flap: number }) {
  const skin = '#b47a4a';
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.28, 0.9, 6, 12]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <group position={[0.85, 0.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.26, 14, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0.62, -0.06, 0]} rotation={[0, 0, -Math.PI / 2 - 0.1]}>
          <coneGeometry args={[0.12, 1.1, 10]} />
          <meshStandardMaterial color="#e8c27a" />
        </mesh>
        <mesh position={[-0.42, 0.18, 0]} rotation={[0, 0, Math.PI / 2 + 0.5]}>
          <coneGeometry args={[0.1, 0.8, 4]} />
          <meshStandardMaterial color="#c94f2f" />
        </mesh>
        <mesh position={[0.12, 0.08, 0.2]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial color="#12283d" />
        </mesh>
      </group>
      {[1, -1].map((s) => (
        <mesh key={s} geometry={wingGeo} position={[0, 0.05, 0]} rotation={[s * flap, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} scale={[1, 1, s]}>
          <meshStandardMaterial color="#d9a273" side={DoubleSide} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** A stack of rocks, for the pterosaur to fly between. */
export function RockColumn({ x, y0, y1 }: { x: number; y0: number; y1: number }) {
  const n = Math.max(1, Math.round((y1 - y0) / 1.1));
  const h = (y1 - y0) / n;
  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[((i * 37) % 5) * 0.05 - 0.1, y0 + h * (i + 0.5), 0]} rotation={[i, i * 1.7, i * 0.5]} scale={[0.95 + (i % 3) * 0.08, h * 0.72, 0.95]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 2 ? '#8a6a48' : '#9b7a55'} flatShading roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** A candle with a glowing flame. `ghost` draws only a faint outline of one. */
export function Candle({ position, flip, ghost, dim }: { position: V3; flip?: boolean; ghost?: boolean; dim?: boolean }) {
  const wax = ghost ? { color: '#ffffff', wireframe: true, transparent: true, opacity: 0.45 } : { color: '#f6efe0', roughness: 0.6 };
  return (
    <group position={position} scale={[1, flip ? -1 : 1, 1]}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.75, 16]} />
        <meshStandardMaterial {...wax} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        {ghost ? <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.45} /> : <meshBasicMaterial color={dim ? '#e0a21c' : '#ffc23a'} toneMapped={false} />}
      </mesh>
      {!ghost && (
        <mesh position={[0, 1.02, 0]}>
          <coneGeometry args={[0.13, 0.4, 12]} />
          <meshBasicMaterial color="#fff2a8" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** A straw beehive (a skep) with its little door. */
export function Hive({ position, glow }: { position: V3; glow?: boolean }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.2 + i * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.85 - i * 0.15, 0.17, 10, 24]} />
          <meshStandardMaterial color={i % 2 ? '#d99a35' : '#e9b04a'} roughness={0.9} emissive={glow ? '#ffb000' : '#000000'} emissiveIntensity={glow ? 0.35 : 0} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0.72]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#3a2410" />
      </mesh>
    </group>
  );
}

/** A treasure chest, open, with gold inside. */
export function Chest({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.3, 0.7, 0.85]} />
        <meshStandardMaterial color="#9a6328" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.72, 0.05]}>
        <boxGeometry args={[1.18, 0.14, 0.72]} />
        <meshStandardMaterial color="#ffd24a" metalness={0.9} roughness={0.25} emissive="#a06c00" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 1.0, -0.45]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[1.3, 0.62, 0.12]} />
        <meshStandardMaterial color="#7d4e1f" />
      </mesh>
    </group>
  );
}

/** A map pin, for "you are here". */
export function Pin({ position, color = '#2f7fd0' }: { position: V3; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.25, 0.9, 16]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.38, 18, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.15, 0.3]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** A badminton racket, strings facing up. */
export function Racket({ position }: { position: V3 }) {
  return (
    <group position={position} rotation={[-1.15, 0, 0]}>
      <mesh scale={[1, 0.62, 1]}>
        <torusGeometry args={[1.5, 0.09, 8, 36]} />
        <meshStandardMaterial color="#e5533d" roughness={0.4} />
      </mesh>
      <mesh scale={[1.45, 0.88, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} side={DoubleSide} />
      </mesh>
      <mesh position={[2.3, -0.35, 0]} rotation={[0, 0, Math.PI / 2 + 0.25]}>
        <cylinderGeometry args={[0.1, 0.12, 1.8, 10]} />
        <meshStandardMaterial color="#3a2a10" />
      </mesh>
    </group>
  );
}

/** Sand, kelp and coral along the bottom of the sea. */
export function SeaFloor() {
  return (
    <>
      <GroundStrip y={-6.2} color="#e3cf96" depth={10} />
      {[-9, -5.5, 4, 8.5].map((x, i) => (
        <Model key={x} id="kelp" fit={3 + (i % 2)} position={[x, -6.2, -2]} />
      ))}
      <Model id="coral" fit={1.8} position={[-2, -6.2, -1]} />
      <Model id="coral" fit={1.4} position={[6, -6.2, -1.5]} />
    </>
  );
}

/** Mud and reeds at the bottom of the pond. */
export function PondFloor() {
  return (
    <>
      <GroundStrip y={-6.2} color="#6b5a3a" depth={10} />
      <group position={[0, -6.2, -2]}>
        <Blades count={160} height={3.2} color="#5e8f3a" area={(i) => [((i * 0.618) % 1) * 26 - 13, ((i * 0.7549) % 1) * 1.5]} />
      </group>
    </>
  );
}

/** A winding blue stream across the treasure map. */
export function River() {
  const pts: [number, number][] = [
    [50, 150],
    [80, 130],
    [100, 150],
    [120, 170],
    [150, 150],
  ];
  return (
    <>
      {pts.slice(1).map(([x, y], i) => {
        const [px, py] = pts[i];
        return (
          <mesh key={i} position={top((x + px) / 2, (y + py) / 2, 0.02)} rotation={[-Math.PI / 2, 0, -Math.atan2(y - py, x - px)]}>
            <planeGeometry args={[m(Math.hypot(x - px, y - py)) + 0.3, 0.5]} />
            <meshStandardMaterial color="#5fa8d9" roughness={0.2} />
          </mesh>
        );
      })}
    </>
  );
}

/** A moth seen from above: furry body, two pairs of dusty wings that flutter. Faces +Z. */
export function Moth({ flap = 0 }: { flap?: number }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 4, 10]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s} rotation={[0, 0, s * flap]}>
          <mesh position={[s * 0.38, 0.02, 0.12]} rotation={[-Math.PI / 2, 0, s * 0.5]} scale={[0.42, 0.28, 1]}>
            <circleGeometry args={[1, 20]} />
            <meshStandardMaterial color="#9a8462" roughness={0.95} side={DoubleSide} />
          </mesh>
          <mesh position={[s * 0.3, 0.01, -0.22]} rotation={[-Math.PI / 2, 0, -s * 0.4]} scale={[0.3, 0.2, 1]}>
            <circleGeometry args={[1, 16]} />
            <meshStandardMaterial color="#7d6a4c" roughness={0.95} side={DoubleSide} />
          </mesh>
        </group>
      ))}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.03, 0.42]} rotation={[Math.PI / 2 - 0.5, 0, s * 0.5]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <meshStandardMaterial color="#3a2a1a" />
        </mesh>
      ))}
    </group>
  );
}
