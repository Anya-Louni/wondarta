import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Real, preloadReal, type RealId } from '../models/real';
import { Critter } from '../three/Critter';
import { useQuality } from '../three/quality';
import { useApp } from '../state/store';
import { sfx } from '../audio/sfx';

/**
 * The flower meadow in the Living World: real tulips, roses, daisies and
 * sunflowers (see CREDITS.md), with bees and monarch butterflies travelling
 * from flower to flower, which is exactly the thing the Busy Bees card teaches.
 */
export const MEADOW = { x: 12.5, z: 9.5, r: 5 };

const rnd = (i: number, salt = 1) => Math.abs(Math.sin(i * 12.9898 * salt + salt * 78.233) * 43758.5453) % 1;

const KINDS: { id: RealId; fit: number }[] = [
  { id: 'tulip', fit: 0.7 },
  { id: 'rose', fit: 0.8 },
  { id: 'daisy', fit: 0.65 },
  { id: 'tulip', fit: 0.6 },
  { id: 'daisy', fit: 0.7 },
];
preloadReal(['tulip', 'rose', 'daisy', 'sunflower', 'bee', 'monarch']);

/** Flower spots, kept clear of the three hotspot markers. */
function useBeds(n: number) {
  return useMemo(() => {
    const out: { id: RealId; fit: number; x: number; z: number; rot: number }[] = [];
    for (let i = 0; out.length < n && i < n * 4; i++) {
      const a = i * 2.39996;
      const r = Math.sqrt(rnd(i, 3)) * MEADOW.r;
      const x = MEADOW.x + Math.cos(a) * r;
      const z = MEADOW.z + Math.sin(a) * r;
      const nearMarker = [[13.2, 10.8], [9.6, 11.6], [15.4, 7.6]].some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 1.3);
      if (nearMarker) continue;
      const k = KINDS[i % KINDS.length];
      out.push({ ...k, fit: k.fit * (0.85 + rnd(i, 7) * 0.4), x, z, rot: rnd(i, 11) * 6.3 });
    }
    return out;
  }, [n]);
}

/** A bee or butterfly that hops from flower to flower, hovering at each. */
function Visitor({ id, fit, stops, seed }: { id: RealId; fit: number; stops: [number, number][]; seed: number }) {
  const g = useRef<Group>(null);
  const speed = 0.22 + rnd(seed, 5) * 0.12;
  useFrame((st) => {
    const o = g.current;
    if (!o) return;
    const t = st.clock.elapsedTime * speed + seed * 1.7;
    const leg = Math.floor(t) % stops.length;
    const [ax, az] = stops[leg];
    const [bx, bz] = stops[(leg + 1) % stops.length];
    const f = t - Math.floor(t);
    // hover at the flower for the first third of each leg, then fly on
    const k = f < 0.33 ? 0 : (f - 0.33) / 0.67;
    const e = k * k * (3 - 2 * k);
    const x = ax + (bx - ax) * e;
    const z = az + (bz - az) * e;
    const hover = f < 0.33 ? Math.sin(st.clock.elapsedTime * 9 + seed) * 0.03 : 0;
    o.position.set(x, 0.75 + Math.sin(e * Math.PI) * 0.6 + hover, z);
    o.rotation.y = Math.atan2(bx - ax, bz - az);
    o.rotation.z = Math.sin(st.clock.elapsedTime * (id === 'monarch' ? 10 : 30) + seed) * 0.08;
  });
  return (
    <group ref={g}>
      <Suspense fallback={null}>
        <Real id={id} fit={fit} />
      </Suspense>
    </group>
  );
}

export function Meadow({ sayBee, sayButterfly, saySunflower }: { sayBee: string; sayButterfly: string; saySunflower: string }) {
  const low = useQuality((s) => s.tier === 'low');
  const say = useApp((s) => s.say);
  const tell = (line: string) => () => {
    sfx('pop');
    say(line);
  };
  const beds = useBeds(low ? 14 : 26);
  const stops = useMemo(() => beds.map((b) => [b.x, b.z] as [number, number]), [beds]);
  const route = (start: number, n = 5) => Array.from({ length: n }, (_, i) => stops[(start + i * 3) % stops.length]);

  return (
    <group>
      <Suspense fallback={null}>
        {beds.map((b, i) => (
          <Real key={i} id={b.id} fit={b.fit} position={[b.x, 0, b.z]} rotation-y={b.rot} />
        ))}
      </Suspense>
      {/* the big sunflowers by their hotspot: taller than a child, as the card says */}
      <Critter id="sunflower" position={[16.4, 0, 6.8]} fit={2.4} rotationY={-1.2} move="sway" noticeRange={0} say={saySunflower} />
      <Critter id="sunflower" position={[17.2, 0, 8.4]} fit={2.1} rotationY={-1.6} move="sway" noticeRange={0} say={saySunflower} />
      <Critter id="sunflower" position={[15.8, 0, 5.6]} fit={1.9} rotationY={-1} move="sway" noticeRange={0} say={saySunflower} />

      {/* visitors: tapping one says what it is doing */}
      {[0, 1, 2].slice(0, low ? 2 : 3).map((i) => (
        <group key={`b${i}`} onClick={(e) => { e.stopPropagation(); tell(sayBee)(); }}>
          <Visitor id="bee" fit={0.16} stops={route(i * 4)} seed={i + 1} />
        </group>
      ))}
      {[0, 1].slice(0, low ? 1 : 2).map((i) => (
        <group key={`m${i}`} onClick={(e) => { e.stopPropagation(); tell(sayButterfly)(); }}>
          <Visitor id="monarch" fit={0.28} stops={route(i * 7 + 2, 4)} seed={i + 5} />
        </group>
      ))}
    </group>
  );
}
