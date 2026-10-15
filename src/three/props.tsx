import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { Water } from './World';
import { useQuality } from './quality';

/**
 * Procedural low-poly props (flat-shaded primitives). They keep the web build
 * light: no model downloads. When Kenney CC0 packs are added under
 * public/models/kenney/, these can be swapped for GLTF versions.
 */

type V3 = [number, number, number];

const hash = (x: number, z: number) => Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;

/** Layered conifer with slight per-tree colour and lean variation. */
export function PineTree({ position, scale = 1 }: { position: V3; scale?: number }) {
  const h = hash(position[0], position[2]);
  const greens = ['#2f8f47', '#3aa152', '#4bb562'];
  return (
    <group position={position} scale={scale} rotation={[0, h * 6, (h - 0.5) * 0.06]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.1, 0.17, 1.1, 8]} />
        <meshStandardMaterial color="#7b5132" roughness={0.9} />
      </mesh>
      {[1.25, 1.9, 2.5, 3.0].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation-y={i * 0.7}>
          <coneGeometry args={[1.15 - i * 0.24, 1.1 - i * 0.08, 9]} />
          <meshStandardMaterial color={new Color(greens[i % 3]).offsetHSL((h - 0.5) * 0.03, 0, (h - 0.5) * 0.06)} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Broadleaf tree: several soft canopy blobs so the silhouette reads round and full. */
export function RoundTree({ position, scale = 1, color = '#4cbf55' }: { position: V3; scale?: number; color?: string }) {
  const h = hash(position[0], position[2]);
  const base = new Color(color);
  const blobs: [number, number, number, number][] = [
    [0, 2.3, 0, 1.25],
    [0.75, 2.05, 0.25, 0.85],
    [-0.7, 2.1, -0.2, 0.9],
    [0.15, 2.95, -0.1, 0.8],
    [-0.2, 2.2, 0.75, 0.75],
  ];
  return (
    <group position={position} scale={scale} rotation-y={h * 6}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.15, 0.26, 1.8, 9]} />
        <meshStandardMaterial color="#7b5132" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 1.55, 0]} rotation-z={-0.7}>
        <cylinderGeometry args={[0.06, 0.1, 0.8, 6]} />
        <meshStandardMaterial color="#7b5132" roughness={0.9} />
      </mesh>
      {blobs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} scale={r}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={base.clone().offsetHSL(0, 0, (i % 3) * 0.035 - 0.03)} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

/** Flat-topped savanna tree. */
export function AcaciaTree({ position, scale = 1 }: { position: V3; scale?: number }) {
  const h = hash(position[0], position[2]);
  return (
    <group position={position} scale={scale} rotation-y={h * 6}>
      <mesh position={[0, 1.2, 0]} rotation-z={0.12}>
        <cylinderGeometry args={[0.1, 0.18, 2.4, 8]} />
        <meshStandardMaterial color="#7d5230" roughness={0.9} />
      </mesh>
      <mesh position={[0.45, 2.1, 0]} rotation-z={-0.6}>
        <cylinderGeometry args={[0.05, 0.08, 1.0, 6]} />
        <meshStandardMaterial color="#7d5230" roughness={0.9} />
      </mesh>
      {[
        [0.2, 2.55, 0, 1.9, 1.5],
        [0.9, 2.35, 0.3, 1.0, 0.9],
        [-0.6, 2.45, -0.3, 1.1, 1.0],
      ].map(([x, y, z, sx, sz], i) => (
        <mesh key={i} position={[x, y, z]} scale={[sx, 0.32, sz]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={i ? '#9bc444' : '#8fbf3a'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function Rock({ position, scale = 1, color = '#9aa7b0' }: { position: V3; scale?: number; color?: string }) {
  const rot = useMemo(() => [Math.random(), Math.random() * 6, Math.random()] as V3, []);
  return (
    <mesh position={position} scale={scale} rotation={rot}>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
}

/**
 * One grass tuft: three curved, tapered blades that fan out from the same
 * root. Built once and instanced, so a whole meadow is still one draw call.
 * A vertical vertex-colour gradient darkens the roots and lightens the tips.
 */
function makeTuft() {
  const SEG = 4;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const blades = [
    { yaw: 0, bend: 0.28, w: 0.055, h: 1 },
    { yaw: 2.1, bend: 0.42, w: 0.048, h: 0.82 },
    { yaw: 4.3, bend: 0.2, w: 0.045, h: 0.66 },
  ];
  for (const b of blades) {
    const sin = Math.sin(b.yaw);
    const cos = Math.cos(b.yaw);
    const base = pos.length / 3;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const y = t * b.h;
      const lean = b.bend * t * t; // blades curve over, they don't stand straight
      const half = b.w * (1 - t) * (1 - t * 0.35);
      // blade local axis: x across the blade, z along the lean
      for (const side of [-1, 1]) {
        pos.push(cos * side * half + sin * lean, y, -sin * side * half + cos * lean);
        nor.push(sin, 0.35, cos);
        const shade = 0.62 + t * 0.55;
        col.push(shade, shade, shade);
      }
      if (i < SEG) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

const tuftGeo = makeTuft();

/** Shared clock for the wind; one uniform object for every grass patch. */
const windTime = { value: 0 };

/** Bends each blade with the wind, stronger toward the tip. Vertex-only, so it is nearly free. */
function windShader(m: MeshStandardMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windTime;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float uTime;\nvoid main() {')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 1.3;
        #else
          float ph = 0.0;
        #endif
        float gust = sin(uTime * 1.5 + ph) * 0.6 + sin(uTime * 2.9 + ph * 1.7) * 0.25;
        float up = clamp(transformed.y, 0.0, 1.0);
        transformed.x += gust * up * up * 0.17;
        transformed.z += gust * up * up * 0.1;`
      );
  };
}

/** Instanced grass tufts with per-tuft colour variation and wind (one draw call). */
export function Grass({ count = 200, area, color = '#5fc24a', keep }: { count?: number; area: (i: number) => [number, number]; color?: string; keep?: (x: number, z: number) => boolean }) {
  const low = useQuality((s) => s.tier === 'low');
  count = low ? Math.ceil(count * 0.45) : count;
  const { mats, colors } = useMemo(() => {
    const d = new Object3D();
    const base = new Color(color);
    const cols: Color[] = [];
    const out = Array.from({ length: count }, (_, i) => {
      const [x, z] = area(i);
      const k = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const k2 = (k * 7.13) % 1;
      d.position.set(x + (k - 0.5) * 0.6, 0, z + (k2 - 0.5) * 0.6);
      d.rotation.set((k - 0.5) * 0.12, k * 6.3, (k2 - 0.5) * 0.12);
      const culled = keep ? !keep(x, z) : false;
      const h = 0.3 + k * 0.4;
      if (culled) d.scale.setScalar(0);
      else d.scale.set(0.8 + k2 * 0.5, h, 0.8 + k2 * 0.5);
      d.updateMatrix();
      cols.push(base.clone().offsetHSL((k - 0.5) * 0.05, (k2 - 0.5) * 0.1, (k - 0.5) * 0.14));
      return d.matrix.clone();
    });
    return { mats: out, colors: cols };
  }, [count, area, color, keep]);
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide });
    windShader(m);
    return m;
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFrame((st) => {
    windTime.value = st.clock.elapsedTime;
  });
  return (
    <instancedMesh
      ref={(m: InstancedMesh | null) => {
        if (m) {
          mats.forEach((mx, i) => {
            m.setMatrixAt(i, mx);
            m.setColorAt(i, colors[i]);
          });
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }
      }}
      args={[tuftGeo, mat, count]}
      castShadow={false}
    />
  );
}

/** Glossy pond with expanding ripple rings. */
export function Pond({ position, radius = 5 }: { position: V3; radius?: number }) {
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame((st) => {
    rings.current.forEach((m, i) => {
      if (!m) return;
      const k = (st.clock.elapsedTime * 0.35 + i / 3) % 1;
      m.scale.setScalar(0.3 + k * radius * 0.8);
      (m.material as { opacity: number }).opacity = 0.5 * (1 - k);
    });
  });
  return (
    <group position={position}>
      <Water radius={radius} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[radius - 0.05, radius + 0.7, 64]} />
        <meshStandardMaterial color="#d9c894" roughness={0.95} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (rings.current[i] = m)} rotation-x={-Math.PI / 2} position={[1 - i, 0.05, i - 1]}>
          <ringGeometry args={[0.95, 1, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      {[
        [1.8, -1.2],
        [-2.2, 0.8],
        [0.4, 2.4],
      ].map(([x, z], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.06, z]}>
          <circleGeometry args={[0.45, 12, 0.3, Math.PI * 1.8]} />
          <meshStandardMaterial color="#3fae4a" side={2} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Cattails: thin leaning stems, a few with brown seed heads. */
export function Reeds({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.4;
        const r = 0.15 + (i % 3) * 0.12;
        const h = 0.7 + (i % 4) * 0.18;
        const lean = ((i % 5) - 2) * 0.06;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[lean, a, -lean]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.008, 0.016, h, 5]} />
              <meshStandardMaterial color="#5a9e3a" roughness={0.7} />
            </mesh>
            {i % 3 === 0 && (
              <mesh position={[0, h + 0.08, 0]}>
                <capsuleGeometry args={[0.028, 0.14, 4, 8]} />
                <meshStandardMaterial color="#7a4e2d" roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Round glossy floor disc. */
export function FloorDisc({ radius, color, rim, children }: { radius: number; color: string; rim?: string; children?: React.ReactNode }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color={color} roughness={0.35} envMapIntensity={1.5} />
      </mesh>
      {rim && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
          <ringGeometry args={[radius - 0.35, radius, 64]} />
          <meshStandardMaterial color={rim} />
        </mesh>
      )}
      {children}
    </group>
  );
}

/** Low translucent glass wall ring around a mini room. */
export function GlassWall({ radius, height = 1.4, color = '#dff6ff' }: { radius: number; height?: number; color?: string }) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[radius, radius, height, 48, 1, true]} />
      <meshStandardMaterial color={color} transparent opacity={0.28} roughness={0.05} side={2} depthWrite={false} envMapIntensity={1.5} />
    </mesh>
  );
}
