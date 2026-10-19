import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CatmullRomCurve3, DoubleSide, Group, MeshBasicMaterial, TubeGeometry, Vector3 } from 'three';
import { useApp } from '../state/store';
import { mascotBus, player, type MascotReaction } from './playerState';
import { Glow } from './Environment';

// One tentacle: it hangs down from the body, then the tip curls outward and up,
// like a cartoon octopus. Local +x points away from the body.
const ARM = new TubeGeometry(
  new CatmullRomCurve3([new Vector3(0, 0.06, 0), new Vector3(0.015, -0.1, 0), new Vector3(0.05, -0.22, 0), new Vector3(0.12, -0.27, 0), new Vector3(0.17, -0.22, 0), new Vector3(0.16, -0.16, 0)]),
  32,
  0.052,
  10,
  false,
);

interface Props {
  mode: 'follow' | 'stay';
  /** 'stay' position, or where to go while sleeping in the den */
  home?: [number, number, number];
  /** Extra target that overrides home (e.g. chasing the ball in Play mode). */
  chase?: { current: Vector3 | null };
  sleeping?: boolean;
  onPoke?: () => void;
  showSpeech?: boolean;
  name?: string;
}

/**
 * Wondoo: a glossy blue octopus in a white rabbit costume, built from primitives.
 * Follows the player through every scene, delivers quiz lines in a speech
 * bubble, and sleeps when put to bed or when the free LLM tier is exhausted.
 */
export function Mascot({ mode, home = [0, 1.2, 0], chase, sleeping: sleepProp, onPoke, showSpeech = true, name }: Props) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  // the face: open eyes, happy ^^ arcs, eyebrows and cheeks, mixed per expression (no mouth)
  const open = useRef<Group[]>([]);
  const arcs = useRef<Group[]>([]);
  const brows = useRef<Group[]>([]);
  const cheeks = useRef<MeshBasicMaterial[]>([]);
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0, next: 1 });
  const arms = useRef<Group>(null);
  const earL = useRef<Group>(null);
  const earR = useRef<Group>(null);
  const speech = useApp((s) => s.mascotSpeech);
  const bedtime = useApp((s) => s.bedtime);
  // the open panel already shows Wondoo's line; avoid a duplicate floating bubble
  const panelOpen = useApp((s) => Boolean(s.openHotspot) || s.askOpen);
  const sleeping = sleepProp ?? bedtime;
  const reaction = useRef<{ r: MascotReaction; t: number } | null>(null);
  const goal = useRef(new Vector3(...home));
  const blink = useRef(0);

  useEffect(() => mascotBus.on((r) => (reaction.current = { r, t: 0 })), []);

  useFrame((st, dt) => {
    const g = root.current;
    if (!g || !body.current || !eyes.current) return;
    const t = st.clock.elapsedTime;

    if (chase?.current) goal.current.copy(chase.current);
    else if (mode === 'follow') {
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      // hover ahead and up-left of the player: always in view, never blocking what's ahead
      goal.current.set(player.pos.x - sin * 3.6 - cos * 1.45, 1.95, player.pos.z - cos * 3.6 + sin * 1.45);
    } else goal.current.set(...home);
    if (sleeping) goal.current.y = home[1] - 0.35;

    g.position.lerp(goal.current, 1 - Math.pow(0.02, dt));
    const hover = sleeping ? Math.sin(t * 0.8) * 0.03 : Math.sin(t * 2) * 0.08;
    body.current.position.y = hover;

    // face the player (yaw only)
    const want = Math.atan2(player.pos.x - g.position.x, player.pos.z - g.position.z);
    let diff = want - g.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * Math.min(1, dt * 4);

    // reactions
    let sx = 1;
    let sy = 1;
    const rc = reaction.current;
    if (rc) {
      rc.t += dt;
      const k = rc.t;
      if (rc.r === 'happy') {
        body.current.position.y += Math.abs(Math.sin(k * 10)) * 0.35 * Math.max(0, 1 - k);
        body.current.rotation.y = k * Math.PI * 2 * Math.max(0, 1 - k / 1.2);
      } else if (rc.r === 'squish') {
        const s = Math.sin(Math.min(k, 0.6) * Math.PI / 0.6) * 0.3;
        sy = 1 - s;
        sx = 1 + s * 0.6;
      } else if (rc.r === 'sad') {
        body.current.rotation.z = Math.sin(k * 12) * 0.15 * Math.max(0, 1 - k);
      } else if (rc.r === 'wave') {
        body.current.rotation.z = Math.sin(k * 14) * 0.2 * Math.max(0, 1 - k);
      }
      if (k > (rc.r === 'think' ? 6 : 1.3)) {
        reaction.current = null;
        body.current.rotation.set(0, 0, 0);
      }
    }
    body.current.scale.set(sx, sy, sx);

    // arms sway, ears flop a little with every bob
    if (arms.current) arms.current.rotation.y = Math.sin(t * 1.4) * 0.18;
    const flop = sleeping ? 0.9 : Math.sin(t * 2 + 1) * 0.07;
    if (earL.current) earL.current.rotation.x = -flop * (sleeping ? 1 : 1);
    if (earR.current) earR.current.rotation.x = -flop * (sleeping ? 0.8 : -1);

    // blink or sleep
    blink.current -= dt;
    if (blink.current < -0.12) blink.current = 2 + Math.random() * 3;
    // which face to make
    const r = reaction.current?.r;
    const face: 'sleep' | 'happy' | 'sad' | 'surprised' | 'think' | 'talk' | 'idle' = sleeping
      ? 'sleep'
      : r === 'happy' || r === 'wave'
        ? 'happy'
        : r === 'sad'
          ? 'sad'
          : r === 'squish' || r === 'surprised'
            ? 'surprised'
            : r === 'think'
              ? 'think'
              : speech && !panelOpen
                ? 'talk'
                : 'idle';
    // little glances around, like a curious kid; looking up and aside while thinking
    const lk = look.current;
    lk.next -= dt;
    if (lk.next < 0) {
      lk.next = 1.5 + Math.random() * 2.5;
      lk.tx = (Math.random() - 0.5) * 0.05;
      lk.ty = (Math.random() - 0.5) * 0.03;
    }
    if (face === 'think') {
      lk.tx = 0.04;
      lk.ty = 0.045;
    }
    lk.x += (lk.tx - lk.x) * Math.min(1, dt * 8);
    lk.y += (lk.ty - lk.y) * Math.min(1, dt * 8);
    eyes.current.position.set(lk.x, lk.y, 0.385);
    const openY = face === 'sleep' ? 0.12 : blink.current < 0 ? 0.15 : face === 'surprised' ? 1.3 : face === 'sad' ? 0.72 : face === 'talk' ? 1.05 + Math.sin(t * 9) * 0.05 : 1;
    const openS = face === 'surprised' ? 1.18 : 1;
    open.current.forEach((o) => {
      o.visible = face !== 'happy';
      o.scale.set(openS, openY, 1);
    });
    arcs.current.forEach((a) => (a.visible = face === 'happy'));
    brows.current.forEach((b, i) => {
      const side = i === 0 ? -1 : 1;
      const lift = face === 'surprised' ? 0.05 : face === 'think' && i === 1 ? 0.05 : face === 'happy' ? 0.02 : 0;
      const tilt = face === 'sad' ? side * 0.45 : face === 'think' && i === 0 ? -side * 0.2 : face === 'sleep' ? 0 : side * -0.08;
      b.position.y += (0.115 + lift - b.position.y) * Math.min(1, dt * 10);
      b.rotation.z += (tilt - b.rotation.z) * Math.min(1, dt * 10);
      b.visible = face !== 'sleep';
    });
    const blush = face === 'happy' ? 1 : face === 'surprised' ? 0.9 : 0.75;
    cheeks.current.forEach((m) => (m.opacity += (blush - m.opacity) * Math.min(1, dt * 6)));
  });

  return (
    <group ref={root} position={home} name={name} scale={mode === 'follow' ? 0.62 : 1}>
      <group
        ref={body}
        onClick={(e) => {
          if (e.delta > 6 || !onPoke) return;
          e.stopPropagation();
          onPoke();
        }}
      >
        {/* the octopus: a glossy blue head... */}
        <mesh>
          <sphereGeometry args={[0.42, 32, 24]} />
          <meshPhysicalMaterial color="#6fcaf6" roughness={0.04} clearcoat={1} clearcoatRoughness={0.05} sheen={1} sheenColor="#dff6ff" />
        </mesh>
        {/* ...and eight short curling arms peeking out under the costume */}
        <group ref={arms}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
            const x = Math.sin(a);
            const z = Math.cos(a);
            return (
              <group key={i} position={[x * 0.2, -0.26, z * 0.2]} rotation-y={a - Math.PI / 2}>
                <mesh geometry={ARM}>
                  <meshPhysicalMaterial color="#6fcaf6" roughness={0.05} clearcoat={1} />
                </mesh>
                <mesh position={[0.16, -0.16, 0]}>
                  <sphereGeometry args={[0.052, 12, 10]} />
                  <meshPhysicalMaterial color="#8ad6f9" roughness={0.05} clearcoat={1} />
                </mesh>
              </group>
            );
          })}
        </group>
        {/* glossy highlight */}
        <mesh position={[-0.15, 0.12, 0.36]} scale={[1, 0.7, 0.4]}>
          <sphereGeometry args={[0.075, 12, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
        {/* the rabbit costume: a soft white hood open at the face... */}
        <mesh rotation-x={-0.12}>
          <sphereGeometry args={[0.455, 32, 20, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, 2.05]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} side={DoubleSide} />
        </mesh>
        <mesh rotation-x={-0.12}>
          <sphereGeometry args={[0.456, 32, 10, 0, Math.PI * 2, 0, 0.82]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} side={DoubleSide} />
        </mesh>
        {/* ...two long ears, pink inside... */}
        {[-1, 1].map((sgn) => (
          <group key={sgn} ref={sgn < 0 ? earL : earR} position={[sgn * 0.17, 0.4, -0.04]} rotation-z={-sgn * 0.2}>
            <mesh position={[0, 0.27, 0]} scale={[1, 1, 0.55]}>
              <capsuleGeometry args={[0.085, 0.38, 6, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.27, 0.035]} scale={[0.55, 0.85, 0.3]}>
              <capsuleGeometry args={[0.085, 0.38, 6, 12]} />
              <meshStandardMaterial color="#ffc2d6" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* ...and a cotton tail */}
        <mesh position={[0, -0.14, -0.44]}>
          <sphereGeometry args={[0.11, 14, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
        {/* eyes */}
        <group ref={eyes} position={[0, 0.0, 0.385]}>
          {[-0.13, 0.13].map((x, i) => (
            <group key={x} position={[x, 0, 0]}>
              <group ref={(g) => void (g && (open.current[i] = g))}>
                <mesh scale={[0.8, 1.2, 0.5]}>
                  <sphereGeometry args={[0.065, 12, 10]} />
                  <meshBasicMaterial color="#10283c" />
                </mesh>
                <mesh position={[0.02, 0.03, 0.03]}>
                  <sphereGeometry args={[0.018, 8, 6]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
              {/* happy eyes: little upside-down U arcs, like ^^ */}
              <group ref={(g) => void (g && (arcs.current[i] = g))} visible={false} position={[0, -0.01, 0.01]}>
                <mesh rotation-z={0}>
                  <torusGeometry args={[0.045, 0.014, 6, 16, Math.PI]} />
                  <meshBasicMaterial color="#10283c" />
                </mesh>
              </group>
              {/* eyebrow */}
              <group ref={(g) => void (g && (brows.current[i] = g))} position={[0, 0.115, 0.02]}>
                <mesh rotation-z={Math.PI / 2}>
                  <capsuleGeometry args={[0.011, 0.05, 4, 8]} />
                  <meshBasicMaterial color="#1b4d7a" />
                </mesh>
              </group>
            </group>
          ))}
        </group>
        {/* cheeks */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, -0.07, 0.31]} scale={[1, 0.6, 0.3]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshBasicMaterial ref={(m) => void (m && (cheeks.current[x < 0 ? 0 : 1] = m))} color="#ff9fb8" transparent opacity={0.8} />
          </mesh>
        ))}
        <Glow color="#bfeaff" size={2.2} opacity={0.35} />
      </group>

      {sleeping ? (
        <Html position={[0.35, 0.9, 0]} center zIndexRange={[12, 0]}>
          <div className="zzz" aria-hidden>z Z z</div>
        </Html>
      ) : (
        showSpeech &&
        !panelOpen &&
        speech && (
          <Html key={speech.key} position={[0, 1.2, 0]} center distanceFactor={9} zIndexRange={[12, 0]}>
            <div className="bubble3d">{speech.text}</div>
          </Html>
        )
      )}
    </group>
  );
}
