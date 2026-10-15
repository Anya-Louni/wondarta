import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
import { Model, type ModelId } from '../models';
import { REAL, Real, hasReal } from '../models/real';
import { sfx } from '../audio/sfx';
import { useApp } from '../state/store';
import { mascotBus, player } from './playerState';
import { useQuality } from './quality';

/**
 * A living animal: it breathes on the spot, turns its head as you walk past,
 * and does something when you tap it.
 *
 * Every motion is one group transform per frame — no skeletons, no clips — so
 * a meadow full of animals costs the same as a meadow full of statues.
 */

/** Procedural models that can stand in while a downloaded one loads. */
const TOY = new Set<string>(['elephant', 'lion', 'giraffe', 'zebra', 'rhino', 'hippo', 'fox', 'deer', 'rabbit', 'owl', 'frog', 'panda', 'kangaroo', 'penguin', 'sunflower', 'butterfly']);

export type CritterMove = 'breathe' | 'graze' | 'hop' | 'flit' | 'sway' | 'swim';

const NOISE: Partial<Record<string, 'giggle' | 'pop' | 'correct'>> = {
  frog: 'pop',
  rabbit: 'pop',
  owl: 'giggle',
  lion: 'giggle',
  elephant: 'giggle',
};

export function Critter({
  id,
  position,
  fit,
  rotationY = 0,
  move = 'breathe',
  /** Wondoo's line when the kid taps this animal, already translated. */
  say,
  /** Looks up from grazing when you come within this many metres. */
  noticeRange = 7,
  children,
}: {
  /** A procedural model id, a downloaded (real) model id, or both. */
  id: ModelId | string;
  position: [number, number, number];
  fit: number;
  rotationY?: number;
  move?: CritterMove;
  say?: string;
  noticeRange?: number;
  children?: ReactNode;
}) {
  const g = useRef<Group>(null);
  const low = useQuality((s) => s.tier === 'low');
  const sayIt = useApp((s) => s.say);
  const [poked, setPoked] = useState(0);
  // the file's own jump clip, when it has one, plays for a moment after a tap
  const [clip, setClip] = useState<string | null>(null);
  useEffect(() => {
    const hop = hasReal(id) ? REAL[id].hop : undefined;
    if (!poked || !hop) return;
    setClip(hop);
    const t = window.setTimeout(() => setClip(null), 1100);
    return () => window.clearTimeout(t);
  }, [poked, id]);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);
  const state = useRef({ hop: 0, notice: 0 });

  useFrame((st, dt) => {
    const o = g.current;
    if (!o) return;
    const t = st.clock.elapsedTime + seed;
    const s = state.current;

    // does the player have its attention?
    const dx = player.pos.x - position[0];
    const dz = player.pos.z - position[2];
    const near = Math.hypot(dx, dz) < noticeRange;
    s.notice = MathUtils.damp(s.notice, near ? 1 : 0, 3, dt);

    // a tap sends it hopping/startling for a moment
    if (s.hop > 0) s.hop = Math.max(0, s.hop - dt / 0.9);
    const jump = Math.sin((1 - s.hop) * Math.PI) * (s.hop > 0 ? 1 : 0);

    let y = position[1];
    let tilt = 0;
    let turn = rotationY;
    switch (move) {
      case 'graze':
        // head down, up, look around — the slow rhythm of an animal feeding
        tilt = Math.sin(t * 0.35) * 0.12 - 0.1 + s.notice * 0.12;
        y += Math.sin(t * 1.1) * 0.012 * fit;
        break;
      case 'hop':
        y += Math.abs(Math.sin(t * 1.5)) * 0.06 * fit;
        tilt = Math.cos(t * 1.5) * 0.08;
        break;
      case 'flit':
        y += Math.sin(t * 2.2) * 0.05 * fit;
        turn += Math.sin(t * 0.7) * 0.5;
        break;
      case 'sway':
        tilt = Math.sin(t * 0.8) * 0.05;
        break;
      case 'swim':
        y += Math.sin(t * 1.6) * 0.03 * fit;
        turn += Math.sin(t * 0.5) * 0.6;
        break;
      default:
        y += Math.sin(t * 1.3) * 0.008 * fit; // breathing
    }

    // turn toward the visitor when they are close
    if (s.notice > 0.01 && move !== 'flit') {
      const want = Math.atan2(dx, dz);
      let diff = want - rotationY;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      turn = rotationY + diff * s.notice * 0.55;
    }

    o.position.set(position[0], y + jump * 0.35 * fit, position[2]);
    o.rotation.set(tilt, turn, Math.sin(t * 0.6) * 0.012);
    const squash = 1 + jump * 0.08;
    o.scale.set(1 / squash, squash, 1 / squash);
  });

  return (
    <group
      ref={g}
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        state.current.hop = 1;
        setPoked((n) => n + 1);
        sfx(NOISE[id] ?? 'pop');
        mascotBus.emit('happy');
        if (say) sayIt(say);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {hasReal(id) ? (
        <Suspense fallback={TOY.has(id) ? <Model id={id as ModelId} fit={fit} /> : null}>
          <Real id={id} fit={fit} action={clip} />
        </Suspense>
      ) : (
        <Model id={id as ModelId} fit={fit} />
      )}
      {/* a puff of surprise when tapped; skipped on the low tier */}
      {!low && poked > 0 && <Poof key={poked} scale={fit} />}
      {children}
    </group>
  );
}

/** A little ring that expands and fades where the animal was tapped. */
function Poof({ scale }: { scale: number }) {
  const m = useRef<Group>(null);
  const born = useRef(0);
  useFrame((st) => {
    if (!m.current) return;
    if (!born.current) born.current = st.clock.elapsedTime;
    const k = Math.min(1, (st.clock.elapsedTime - born.current) / 0.6);
    m.current.scale.setScalar((0.3 + k * 1.4) * scale);
    m.current.visible = k < 1;
  });
  return (
    <group ref={m} position={[0, 0.05, 0]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.32, 0.4, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}
