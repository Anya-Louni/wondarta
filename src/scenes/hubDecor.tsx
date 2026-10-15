import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { Model } from '../models';
import { Nature, preloadNature, type NatureId } from '../models/kenney';
import { Grass } from '../three/props';
import { Water } from '../three/World';
import { useQuality } from '../three/quality';

/**
 * Decorations that make the Great Hall feel lived-in: a planted ring around
 * the colonnade, butterflies over the flower beds, planters and fish in the
 * fountain. Everything here is ornament — nothing a kid can
 * visit or read lives in this file — so the low tier trims it freely.
 */

/** Deterministic 0..1 from an index; the same hall every visit. */
const rnd = (i: number, salt = 1) => Math.abs(Math.sin(i * 12.9898 * salt + salt * 78.233) * 43758.5453) % 1;

/** An even, gap-free spread around a band: golden angle, deterministic. */
function ringScatter(inner: number, outer: number) {
  return (i: number): [number, number] => {
    const a = i * 2.39996;
    const r = inner + rnd(i, 11) * (outer - inner);
    return [Math.sin(a) * r, Math.cos(a) * r];
  };
}

/** Flowers and shrubs set into the bed (Kenney Nature Kit, CC0). */
const BED: { id: NatureId; fit: number }[] = [
  { id: 'flower_redA', fit: 0.85 },
  { id: 'plant_bush', fit: 1.1 },
  { id: 'flower_yellowA', fit: 0.85 },
  { id: 'mushroom_red', fit: 0.5 },
  { id: 'flower_purpleA', fit: 0.85 },
  { id: 'grass_large', fit: 0.9 },
];
preloadNature([...BED.map((b) => b.id), 'statue_column']);

/**
 * A planted band between the portals and the colonnade: soil, a pale kerb,
 * real grass tufts and a ring of flowers. The bed is two meshes, the grass is
 * one instanced mesh, and each flower species is one small GLB.
 */
export function GardenRing({ inner = 17.4, outer = 20.3 }: { inner?: number; outer?: number }) {
  const low = useQuality((s) => s.tier === 'low');
  const area = useMemo(() => ringScatter(inner + 0.4, outer - 0.4), [inner, outer]);
  const flowers = useMemo(() => {
    const n = low ? 12 : 22;
    return Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.35) / n) * Math.PI * 2;
      const r = inner + 0.6 + rnd(i, 13) * (outer - inner - 1.2);
      const b = BED[i % BED.length];
      return { ...b, x: Math.sin(a) * r, z: Math.cos(a) * r, rot: rnd(i, 17) * 6.3, key: i };
    });
  }, [low, inner, outer]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[inner, outer, 80]} />
        <meshStandardMaterial color="#6fae52" roughness={0.95} />
      </mesh>
      {/* a pale kerb so the bed reads as built, not spilled */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <ringGeometry args={[inner - 0.24, inner, 80]} />
        <meshStandardMaterial color="#f4fbff" roughness={0.3} envMapIntensity={1.4} />
      </mesh>
      <Grass count={low ? 320 : 700} area={area} color="#5fbd46" />
      <Suspense fallback={null}>
        {flowers.map((f) => (
          <Nature key={f.key} id={f.id} position={[f.x, 0.03, f.z]} fit={f.fit} rotation-y={f.rot} />
        ))}
      </Suspense>
    </group>
  );
}

/** A butterfly looping over the flower bed, wings beating. */
function Butterfly({ seed, radius }: { seed: number; radius: number }) {
  const g = useRef<Group>(null);
  const phase = rnd(seed) * 6.3;
  const speed = 0.16 + rnd(seed, 2) * 0.12;
  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime * speed + phase;
    const r = radius + Math.sin(t * 2.1) * 1.4;
    g.current.position.set(Math.sin(t) * r, 1.5 + Math.sin(t * 3.3 + phase) * 0.7, Math.cos(t) * r);
    g.current.rotation.y = -t + Math.PI / 2;
    g.current.rotation.z = Math.sin(t * 3.3) * 0.25;
  });
  return (
    <group ref={g}>
      <Model id="butterfly" fit={0.42} anchor="center" />
    </group>
  );
}

export function Butterflies({ count = 4, radius = 16 }: { count?: number; radius?: number }) {
  const low = useQuality((s) => s.tier === 'low');
  if (low) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Butterfly key={i} seed={i + 1} radius={radius - (i % 3)} />
      ))}
    </>
  );
}

/** Two fish circling the fountain basin, because still water looks empty. */
export function FountainFish({ radius = 1.5 }: { radius?: number }) {
  const low = useQuality((s) => s.tier === 'low');
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime * 0.5;
    [a.current, b.current].forEach((g, i) => {
      if (!g) return;
      const k = t + i * Math.PI;
      const r = radius - i * 0.35;
      g.position.set(Math.sin(k) * r, 0.32 + Math.sin(k * 2) * 0.03, Math.cos(k) * r);
      g.rotation.y = -k;
      g.rotation.z = Math.sin(k * 3) * 0.12;
    });
  });
  if (low) return null;
  return (
    <>
      <group ref={a}>
        <Model id="fish" fit={0.34} anchor="center" />
      </group>
      <group ref={b}>
        <Model id="fish" fit={0.26} anchor="center" />
      </group>
    </>
  );
}

/** The fountain's water and its slowly turning orb (it turns, it does not bob). */
export function FountainLife({ orbY = 3.6 }: { orbY?: number }) {
  const orb = useRef<Mesh>(null);
  useFrame((st) => {
    if (orb.current) orb.current.rotation.y = st.clock.elapsedTime * 0.2;
  });
  return (
    <>
      <group position={[0, 0.5, 0]}>
        {/* clear enough to see the fish circling under it */}
        <Water radius={2.2} deep="#2ea0d8" shallow="#bff0ff" opacity={0.62} />
      </group>
      <FountainFish />
      <mesh ref={orb} position={[0, orbY, 0]}>
        <sphereGeometry args={[0.8, 32, 24]} />
        <meshStandardMaterial color="#9fe0ff" roughness={0} transparent opacity={0.7} envMapIntensity={1.6} />
      </mesh>
    </>
  );
}

/** Two Kenney columns flanking the walk to Wondoo's Den, like a garden gate. */
export function DenGate({ z = 13.4, spread = 2.6 }: { z?: number; spread?: number }) {
  return (
    <Suspense fallback={null}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Nature id="statue_column" position={[s * spread, 0, z]} fit={2.6} rotation-y={s * 0.3} />
          <Nature id="flower_yellowA" position={[s * (spread + 0.9), 0, z + 0.7]} fit={0.8} rotation-y={s} />
        </group>
      ))}
    </Suspense>
  );
}

/**
 * Planters: a glossy pot with a Kenney shrub in it, so the greenery reads as
 * placed rather than sprouting through the marble.
 */
export function Planters({ count = 8, radius = 9.6 }: { count?: number; radius?: number }) {
  const low = useQuality((s) => s.tier === 'low');
  const n = low ? 4 : count;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        const x = Math.sin(a) * radius;
        const z = Math.cos(a) * radius;
        return (
          <group key={i} position={[x, 0, z]} rotation-y={a}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.62, 0.48, 0.6, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.28} envMapIntensity={1.4} />
            </mesh>
            <mesh position={[0, 0.61, 0]}>
              <cylinderGeometry args={[0.66, 0.66, 0.08, 16]} />
              <meshStandardMaterial color="#e6f6ff" roughness={0.25} envMapIntensity={1.4} />
            </mesh>
            <mesh position={[0, 0.64, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.06, 14]} />
              <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
            </mesh>
            <Suspense fallback={null}>
              <Nature id={i % 3 === 1 ? 'flower_redA' : i % 3 === 2 ? 'flower_purpleA' : 'plant_bushDetailed'} position={[0, 0.66, 0]} fit={i % 3 ? 1 : 1.3} rotation-y={i} />
            </Suspense>
          </group>
        );
      })}
    </>
  );
}
