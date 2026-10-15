import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, CircleGeometry, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, RingGeometry, Vector3 } from 'three';
import { FISH, RARITY, rollFish, type FishKind } from '../content/fish';
import { useApp } from '../state/store';
import { player } from '../three/playerState';
import { useQuality } from '../three/quality';
import { sfx } from '../audio/sfx';
import { Glow } from '../three/Environment';

// ---------------------------------------------------------------- shadows

/**
 * The hall stands still, so its sun shadows are drawn a few times while the
 * models stream in and then frozen: real shadows for the price of a photo.
 */
export function BakedShadows() {
  const { gl, scene } = useThree();
  const low = useQuality((s) => s.tier === 'low');
  useEffect(() => {
    if (low) return;
    gl.shadowMap.autoUpdate = false;
    const bake = () => {
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const m = o.material as { transparent?: boolean } | undefined;
        if (o.userData.floor) o.receiveShadow = true;
        else if (!m?.transparent && !o.userData.noShadow) o.castShadow = true;
      });
      gl.shadowMap.needsUpdate = true;
    };
    const ids = [200, 1500, 3500, 7000].map((ms) => window.setTimeout(bake, ms));
    return () => {
      ids.forEach(window.clearTimeout);
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, scene, low]);
  return null;
}

// ---------------------------------------------------------------- the floor answers back

const PALETTE = ['#8fcdee', '#a8e0bd', '#f9d98c', '#f4b3a6', '#c7b6ee', '#7fd3d6'].map((c) => new Color(c));
const ripples: { x: number; z: number; t: number }[] = [];
/** A ring spreads out across the floor where the explorer taps. */
export function rippleAt(x: number, z: number) {
  ripples.push({ x, z, t: 0 });
  if (ripples.length > 8) ripples.shift();
}

/** Footsteps light up the mosaic, and taps send out rings. One draw call each. */
export function FloorGlow() {
  const steps = useRef<InstancedMesh>(null);
  const rings = useRef<InstancedMesh>(null);
  const STEPS = 28;
  const pool = useMemo(() => Array.from({ length: STEPS }, () => ({ x: 0, z: 0, t: 99, c: PALETTE[0] })), []);
  const last = useRef(new Vector3(999, 0, 999));
  const next = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const geo = useMemo(() => new CircleGeometry(0.42, 20), []);
  const ringGeo = useMemo(() => new RingGeometry(0.9, 1, 48), []);
  const mat = useMemo(() => new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const black = useMemo(() => new Color(0, 0, 0), []);

  useFrame((_, dt) => {
    const p = player.pos;
    if (Math.hypot(p.x - last.current.x, p.z - last.current.z) > 0.85) {
      last.current.copy(p);
      const s = pool[next.current++ % STEPS];
      Object.assign(s, { x: p.x, z: p.z, t: 0, c: PALETTE[next.current % PALETTE.length] });
    }
    const m = steps.current;
    if (m) {
      pool.forEach((s, i) => {
        s.t += dt;
        const k = Math.max(0, 1 - s.t / 2.4);
        dummy.position.set(s.x, 0.02, s.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(k > 0 ? 0.7 + (1 - k) * 0.6 : 0.0001);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        m.setColorAt(i, black.clone().lerp(s.c, k * 0.55));
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const r = rings.current;
    if (r) {
      for (let i = 0; i < 8; i++) {
        const w = ripples[i];
        if (w) w.t += dt;
        const k = w ? Math.max(0, 1 - w.t / 1.3) : 0;
        dummy.position.set(w?.x ?? 0, 0.025, w?.z ?? 0);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(k > 0 ? 0.3 + (1 - k) * 2.6 : 0.0001);
        dummy.updateMatrix();
        r.setMatrixAt(i, dummy.matrix);
        r.setColorAt(i, black.clone().lerp(PALETTE[i % PALETTE.length], k * 0.8));
      }
      r.instanceMatrix.needsUpdate = true;
      if (r.instanceColor) r.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={steps} args={[geo, mat, STEPS]} frustumCulled={false} userData={{ noShadow: true }} />
      <instancedMesh ref={rings} args={[ringGeo, mat, 8]} frustumCulled={false} userData={{ noShadow: true }} />
    </>
  );
}

// ---------------------------------------------------------------- fish leaping from the fountain

function FishBody({ kind }: { kind: FishKind }) {
  const { body, mark, fin, long, tall } = kind.look;
  const L = 0.28 * long;
  const T = 0.28 * tall;
  return (
    <group>
      <mesh scale={[L, T, 0.11]}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={body} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[-L * 0.15, -T * 0.25, 0]} scale={[L * 0.6, T * 0.55, 0.115]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={mark} roughness={0.4} />
      </mesh>
      <mesh position={[-L * 1.05, 0, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.25]}>
        <coneGeometry args={[T * 0.8, L * 0.55, 3]} />
        <meshStandardMaterial color={fin} roughness={0.5} />
      </mesh>
      <mesh position={[0, T * 0.95, 0]} rotation-z={-0.4} scale={[L * 0.5, T * 0.35, 0.03]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial color={fin} roughness={0.5} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[L * 0.6, T * 0.2, s * 0.09]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshBasicMaterial color="#12283d" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Every few seconds a fish leaps across the fountain. Tap it mid-air to catch
 * it for the journal. Fish jump more often when the explorer is close.
 */
export function LeapingFish({ basin = 1.8, waterY = 0.5 }: { basin?: number; waterY?: number }) {
  const catchFish = useApp((s) => s.catchFish);
  const g = useRef<Group>(null);
  const [kind, setKind] = useState<FishKind>(FISH[0]);
  const jump = useRef({ t: 0, wait: 3, flying: false, caught: false, from: new Vector3(), to: new Vector3(), dur: 1.7 });
  const splashes = useRef<{ x: number; z: number; t: number }[]>([]);
  const [, bump] = useState(0);

  useFrame((_, dt) => {
    const j = jump.current;
    j.t += dt;
    splashes.current.forEach((s) => (s.t += dt));
    if (splashes.current.some((s) => s.t < 0.95)) bump((n) => n + 1);
    if (!j.flying) {
      if (j.t < j.wait) return;
      const a = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * (basin - 0.6);
      const b = a + Math.PI * (0.6 + Math.random() * 0.8);
      j.from.set(Math.cos(a) * r, waterY, Math.sin(a) * r);
      j.to.set(Math.cos(b) * (0.4 + Math.random() * (basin - 0.5)), waterY, Math.sin(b) * (0.4 + Math.random() * (basin - 0.5)));
      Object.assign(j, { t: 0, flying: true, caught: false });
      setKind(rollFish());
      splashes.current = [{ x: j.from.x, z: j.from.z, t: 0 }];
      bump((n) => n + 1);
    }
    const u = j.t / j.dur;
    const node = g.current;
    if (!node) return;
    if (u >= 1 || j.caught) {
      if (!j.caught) splashes.current.push({ x: j.to.x, z: j.to.z, t: 0 });
      node.visible = false;
      const near = player.pos.length() < 9;
      Object.assign(j, { flying: false, t: 0, wait: near ? 1.5 + Math.random() * 2.5 : 5 + Math.random() * 4 });
      bump((n) => n + 1);
      return;
    }
    node.visible = true;
    const h = 2.3 * Math.sin(Math.PI * u);
    node.position.lerpVectors(j.from, j.to, u).setY(waterY + h);
    node.rotation.set(0, Math.atan2(-(j.to.z - j.from.z), j.to.x - j.from.x), 0);
    // nose up on the way out, nose down on the way back in
    node.children[0].rotation.z = Math.cos(Math.PI * u) * 0.9;
  });

  const rar = RARITY[kind.rarity];
  return (
    <>
      <group
        ref={g}
        visible={false}
        userData={{ noShadow: true }}
        onClick={(e) => {
          const j = jump.current;
          if (!j.flying || j.caught) return;
          e.stopPropagation();
          j.caught = true;
          sfx('correct');
          catchFish(kind.id);
        }}
      >
        <group>
          <FishBody kind={kind} />
          {/* a bigger, invisible target so small fingers can catch it */}
          <mesh visible={false} userData={{ noShadow: true }}>
            <sphereGeometry args={[0.55, 8, 6]} />
          </mesh>
        </group>
        <Glow color={rar.color} size={kind.rarity === 'common' ? 0.9 : kind.rarity === 'legendary' ? 2.6 : 1.6} opacity={kind.rarity === 'common' ? 0.35 : 0.85} />
      </group>
      {splashes.current
        .filter((s) => s.t < 0.9)
        .map((s, i) => (
          <mesh key={`${i}-${s.x}`} position={[s.x, waterY + 0.02, s.z]} rotation-x={-Math.PI / 2} scale={0.3 + s.t * 1.4} userData={{ noShadow: true }}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.8 - s.t)} depthWrite={false} />
          </mesh>
        ))}
    </>
  );
}
