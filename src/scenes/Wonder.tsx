import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, Mesh, Shape, Vector3 } from 'three';
import { useApp } from '../state/store';
import { WONDERS } from '../content/wonders';
import { SceneShell } from '../three/SceneShell';
import { circleBounds } from '../three/Player';
import { Glow, Twinkles } from '../three/Environment';
import { FloorDisc, Grass, PineTree, Rock, RoundTree } from '../three/props';
import { Label3D } from '../three/Label3D';
import { Model } from '../models';
import { WikiPicture } from '../three/WikiPicture';

/**
 * A Wonder world: the little 3D world Wondoo builds to answer a question.
 * Wondoo flies from stop to stop (the tour panel drives `wonderFocus`) and
 * the stop it is at glows.
 */
export const wonderFocus = { at: null as Vector3 | null, index: -1 };
/** Where each built world stands; its stops are written relative to it. */
const PLACE: Record<string, [number, number, number]> = { volcano: [0, 2, -2], 'solar-system': [-6, 0, -3], 'water-cycle': [0, 0, 0] };
export function stopPoints(visit: { kind: 'built'; id: string } | { kind: 'wiki' } | null): [number, number, number][] {
  if (visit?.kind !== 'built') return GENERIC_STOPS;
  const w = WONDERS.find((x) => x.id === visit.id)!;
  const o = PLACE[w.id];
  return w.stops.map((p) => [p.at[0] + o[0], p.at[1] + o[1], p.at[2] + o[2]]);
}
export const GENERIC_STOPS: [number, number, number][] = [
  [-3.2, 1.6, 0],
  [0, 1.3, 0.4],
  [3.2, 1.6, 0],
];

function StopMarkers({ stops }: { stops: [number, number, number][] }) {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame((st) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const on = wonderFocus.index === i;
      const s = on ? 1 + Math.sin(st.clock.elapsedTime * 5) * 0.15 : 0.55;
      m.scale.setScalar(s);
      (m.material as { opacity: number }).opacity = on ? 0.9 : 0.35;
    });
  });
  return (
    <>
      {stops.map((p, i) => (
        <group key={i} position={p}>
          <mesh ref={(m) => void (refs.current[i] = m)} userData={{ noShadow: true }}>
            <torusGeometry args={[0.45, 0.05, 8, 32]} />
            <meshBasicMaterial color="#ffe27a" transparent opacity={0.4} toneMapped={false} />
          </mesh>
          <Label3D position={[0, 0.75, 0]} distanceFactor={10}>
            <div className="plaque" style={{ fontSize: 13, padding: '2px 8px' }}>
              {i + 1}
            </div>
          </Label3D>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- a volcano, cut open

function band(r0: number, r1: number, y0: number, y1: number) {
  // one stripe of the cut face: a trapezoid from the centre line out to the slope
  const s = new Shape();
  s.moveTo(0, y0);
  s.lineTo(r0, y0);
  s.lineTo(r1, y1);
  s.lineTo(0, y1);
  s.closePath();
  return s;
}

function Volcano() {
  const ash = useRef<Group>(null);
  const R = (y: number) => 4.5 - 3.7 * (y / 4); // slope radius at height y
  const OPEN = Math.PI / 4; // the slice faces you
  const layers = ['#6b4a3a', '#8a6248', '#5a3d30', '#7a5240', '#4d342a', '#8f6a4f'];
  const ground = useMemo(() => band(5.2, 5.2, -2, 0), []);
  const faces = useMemo(() => layers.map((_, i) => band(R((i * 4) / 6), R(((i + 1) * 4) / 6), (i * 4) / 6, ((i + 1) * 4) / 6)), []);
  useFrame((st) => {
    if (!ash.current) return;
    ash.current.children.forEach((c, i) => {
      const k = (st.clock.elapsedTime * 0.25 + i / 8) % 1;
      c.position.set(Math.sin(i * 2.3) * k * 1.6, 4.3 + k * 3, Math.cos(i * 1.7) * k * 1.2);
      c.scale.setScalar(0.4 + k * 1.4);
    });
  });
  return (
    <group position={[0, 2, -2]}>
      {/* the earth under the volcano, cut the same way, with the magma chamber inside */}
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[5.2, 5.2, 2, 48, 1, true, OPEN, Math.PI * 2 - OPEN * 2]} />
        <meshStandardMaterial color="#5b4636" side={DoubleSide} roughness={1} />
      </mesh>
      {[-OPEN, OPEN].map((a) => (
        <mesh key={a} rotation-y={a - Math.PI / 2}>
          <shapeGeometry args={[ground]} />
          <meshStandardMaterial color="#4a3729" side={DoubleSide} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, -1.4, 0]} scale={[1.6, 0.55, 1.6]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color="#ff6a1a" emissive="#ff4a00" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <Glow color="#ff7a2a" size={3.4} opacity={0.6} position={[0, -1.4, 0]} />
      {/* the cone, with a slice taken out */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.8, 4.5, 4, 64, 1, true, OPEN, Math.PI * 2 - OPEN * 2]} />
        <meshStandardMaterial color="#7a5a48" side={DoubleSide} roughness={0.95} />
      </mesh>
      {/* the layers of old lava and ash, seen on both cut faces */}
      {[OPEN, -OPEN].map((a) => (
        <group key={a} rotation-y={a - Math.PI / 2}>
          {faces.map((s, i) => (
            <mesh key={i}>
              <shapeGeometry args={[s]} />
              <meshStandardMaterial color={layers[i]} side={DoubleSide} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* the vent: magma's road to the top */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 5.4, 16]} />
        <meshStandardMaterial color="#ff7a1a" emissive="#ff5200" emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
      {/* lava pouring over the rim */}
      {[2.6, 3.4, 4.2].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 1.7, 2.6, Math.cos(a) * 1.7]} rotation={[Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55]}>
          <capsuleGeometry args={[0.16, 2.6, 4, 8]} />
          <meshStandardMaterial color="#ff8a2a" emissive="#ff5a00" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
      <Glow color="#ffb04a" size={3} opacity={0.8} position={[0, 4.1, 0]} />
      <group ref={ash}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} userData={{ noShadow: true }}>
            <sphereGeometry args={[0.5, 12, 10]} />
            <meshStandardMaterial color="#8a8a8a" transparent opacity={0.6} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- planets in a row

function bandTexture(colors: string[]) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = c.getContext('2d')!;
  colors.forEach((col, i) => {
    x.fillStyle = col;
    x.fillRect(0, (i * 64) / colors.length, 64, 64 / colors.length + 1);
  });
  return new CanvasTexture(c);
}

function Planets() {
  const spin = useRef<Group>(null);
  const jupiter = useMemo(() => bandTexture(['#d8b48a', '#b07a4f', '#e8d2b0', '#c48a5a', '#e2c39a', '#a8704a', '#dcc0a0']), []);
  const saturn = useMemo(() => bandTexture(['#e8d8a8', '#d4bf88', '#efe2bb', '#cdb27a']), []);
  const earth = useMemo(() => bandTexture(['#2f7fd0', '#3fa04a', '#2f7fd0', '#2f8fe0', '#4caf50', '#2f7fd0']), []);
  useFrame((_, dt) => spin.current?.children.forEach((c) => (c.rotation.y += dt * 0.5)));
  const P: { x: number; r: number; color?: string; map?: CanvasTexture }[] = [
    { x: 2.4, r: 0.18, color: '#9a9a9a' },
    { x: 3.6, r: 0.3, color: '#e8c27a' },
    { x: 5.2, r: 0.32, map: earth },
    { x: 6.6, r: 0.24, color: '#c1440e' },
    { x: 9, r: 0.95, map: jupiter },
    { x: 11.4, r: 0.8, map: saturn },
    { x: 13.4, r: 0.5, color: '#8fd3e0' },
    { x: 15, r: 0.48, color: '#3f5fd0' },
  ];
  return (
    <group position={[-6, 0, -3]}>
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[1.25, 32, 24]} />
        <meshBasicMaterial color="#ffcf4a" toneMapped={false} />
      </mesh>
      <Glow color="#ffd36a" size={6} opacity={0.9} position={[0, 1.6, 0]} />
      {P.map((p) => (
        <mesh key={`o${p.x}`} position={[0, 1.6, 0]} rotation-x={-Math.PI / 2} userData={{ noShadow: true }}>
          <ringGeometry args={[p.x - 0.01, p.x + 0.01, 96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={DoubleSide} />
        </mesh>
      ))}
      <group ref={spin}>
        {P.map((p) => (
          <mesh key={p.x} position={[p.x, 1.6, 0]} rotation-z={0.3}>
            <sphereGeometry args={[p.r, 32, 20]} />
            <meshStandardMaterial color={p.color ?? '#ffffff'} map={p.map} roughness={0.8} />
          </mesh>
        ))}
      </group>
      <mesh position={[11.4, 1.6, 0]} rotation={[-Math.PI / 2 + 0.45, 0, 0]}>
        <ringGeometry args={[1.05, 1.7, 64]} />
        <meshStandardMaterial color="#d9c896" side={DoubleSide} transparent opacity={0.8} />
      </mesh>
      {/* the Great Red Spot */}
      <mesh position={[9 + 0.25, 1.35, 0.88]}>
        <sphereGeometry args={[0.15, 12, 8]} />
        <meshStandardMaterial color="#b0442a" />
      </mesh>
      <mesh position={[5.75, 1.75, 0]}>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the water cycle

function WaterCycle() {
  const vapour = useRef<Group>(null);
  const rain = useRef<Group>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    vapour.current?.children.forEach((c, i) => {
      const k = (t * 0.25 + i / 10) % 1;
      c.position.set(-4 + (i % 5) * 0.6 + k * 2, 0.4 + k * 3.3, 1 - (i % 3) * 0.6);
      (c as Mesh).scale.setScalar(0.12 + k * 0.1);
    });
    rain.current?.children.forEach((c, i) => {
      const k = (t * 1.3 + i / 14) % 1;
      c.position.set(1.6 + (i % 7) * 0.32, 3.5 - k * 3.2, -0.6 + (i % 3) * 0.5);
    });
  });
  return (
    <group>
      {/* the sea */}
      <mesh position={[-4, 0.05, 0.5]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[3.6, 48]} />
        <meshStandardMaterial color="#2f8fd8" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* a mountain with a snowy top, and a river running back to the sea */}
      <mesh position={[4.5, 1.6, -1.5]}>
        <coneGeometry args={[3, 3.2, 7]} />
        <meshStandardMaterial color="#6a9a5a" flatShading />
      </mesh>
      <mesh position={[4.5, 2.75, -1.5]}>
        <coneGeometry args={[0.95, 0.95, 7]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
      <mesh position={[0.9, 0.06, 0.8]} rotation={[-Math.PI / 2, 0, 0.35]}>
        <planeGeometry args={[5.5, 0.6]} />
        <meshStandardMaterial color="#4aa8e8" />
      </mesh>
      {/* the sun */}
      <mesh position={[-6, 6.5, -4]}>
        <sphereGeometry args={[0.9, 24, 16]} />
        <meshBasicMaterial color="#ffd34a" toneMapped={false} />
      </mesh>
      <Glow color="#ffdc6a" size={4} opacity={0.8} position={[-6, 6.5, -4]} />
      {/* a cloud made of puffs */}
      <group position={[1, 4, 0]}>
        {[
          [0, 0, 0, 0.9],
          [0.9, 0.2, 0, 0.75],
          [-0.9, 0.1, 0.1, 0.7],
          [0.4, 0.55, -0.2, 0.7],
          [1.7, -0.1, 0.1, 0.55],
        ].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 16, 12]} />
            <meshStandardMaterial color="#e8eef5" roughness={1} />
          </mesh>
        ))}
      </group>
      <group ref={vapour}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} userData={{ noShadow: true }}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>
      <group ref={rain}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} userData={{ noShadow: true }}>
            <capsuleGeometry args={[0.03, 0.22, 2, 4]} />
            <meshBasicMaterial color="#7fc6ff" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- any other question

const ring = (n: number, r: number, from = 0) => Array.from({ length: n }, (_, i) => [Math.cos(from + (i / n) * Math.PI * 2) * r, Math.sin(from + (i / n) * Math.PI * 2) * r] as [number, number]);
const meadow = (i: number): [number, number] => {
  const a = i * 2.39996;
  const r = 4.5 + ((i * 0.618) % 1) * 10;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

/** A world made from a Wikipedia article: its picture on an easel, a reading stand, and a little garden around the stops. */
function WikiWorld({ title, label }: { title: string; label: string }) {
  return (
    <group>
      <group position={[0, 0, -2.6]}>
        <WikiPicture title={title} position={[0, 2.7, 0]} width={3.4} height={2.6} />
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 0.75, -0.15]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
            <boxGeometry args={[0.12, 1.6, 0.12]} />
            <meshStandardMaterial color="#8a5a32" roughness={0.8} />
          </mesh>
        ))}
        <Label3D position={[0, 4.75, 0]} distanceFactor={10}>
          <div className="plaque" style={{ fontSize: 18 }}>
            {label}
          </div>
        </Label3D>
      </group>
      <mesh position={[0, 0.45, -0.6]}>
        <cylinderGeometry args={[0.08, 0.14, 0.9, 10]} />
        <meshStandardMaterial color="#8a5a32" roughness={0.8} />
      </mesh>
      <Model id="open-book" fit={1.4} position={[0, 0.9, -0.6]} rotation={[0.5, 0, 0]} />
      {ring(9, 12.5, 0.3).map(([x, z], i) =>
        i % 3 ? <RoundTree key={i} position={[x, 0, z]} scale={0.9 + (i % 2) * 0.3} color={i % 2 ? '#5cc85e' : '#7fd36a'} /> : <PineTree key={i} position={[x, 0, z]} scale={1.1} />,
      )}
      {ring(7, 8.5, 1).map(([x, z], i) => (
        <Rock key={i} position={[x, 0.15, z]} scale={0.5 + (i % 3) * 0.25} color="#a9b4bc" />
      ))}
      <Grass count={260} area={meadow} color="#7ccf5a" />
      <Twinkles count={40} scale={[14, 5, 14]} position={[0, 2.5, 0]} size={3} speed={0.3} color="#fff6c8" />
    </group>
  );
}

export function WonderWorld() {
  const visit = useApp((s) => s.wonder);
  const chase = useRef<Vector3 | null>(null);
  // Wondoo goes wherever the tour is
  useFrame(() => {
    chase.current = wonderFocus.at;
  });
  const built = visit?.kind === 'built' ? WONDERS.find((w) => w.id === visit.id) : undefined;
  const stops = stopPoints(visit);
  const space = built?.id === 'solar-system';
  return (
    <SceneShell
      hotspots={[]}
      start={{ x: 0, z: 9, yaw: 0 }}
      bounds={circleBounds(15)}
      exit={{ position: [0, 0, 15], rotationY: Math.PI }}
      sky={space ? { top: '#050818', horizon: '#1a2350', bottom: '#0b1030' } : { top: '#4aa8f0', horizon: '#e8f6ff', bottom: '#d8ecd0' }}
      fog={space ? ['#0b1030', 30, 90] : ['#e8f6ff', 30, 90]}
      clouds={!space}
      mascotChase={chase}
    >
      <FloorDisc radius={16} color={space ? '#1b2448' : '#d3eabf'} rim={space ? '#4a5aa0' : '#a9d68f'} />
      {space && <Twinkles count={160} scale={[60, 30, 60]} position={[0, 12, 0]} size={4} speed={0.1} color="#ffffff" />}
      {built?.id === 'volcano' && <Volcano />}
      {built?.id === 'solar-system' && <Planets />}
      {built?.id === 'water-cycle' && <WaterCycle />}
      {visit?.kind === 'wiki' && <WikiWorld title={visit.title} label={visit.question ?? visit.title} />}
      <StopMarkers stops={stops} />
    </SceneShell>
  );
}
