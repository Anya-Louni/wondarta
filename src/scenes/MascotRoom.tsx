import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { Html, Line } from '@react-three/drei';
import { MessageCircle, Moon } from 'lucide-react';
import { Label3D } from '../three/Label3D';
import { Group, Mesh, ShaderMaterial, Vector3 } from 'three';
import { useApp } from '../state/store';
import { useLines } from '../i18n';
import { sfx } from '../audio/sfx';
import { Player, circleBounds } from '../three/Player';
import { Portal } from '../three/Portal';
import { Mascot } from '../three/Mascot';
import { Glow, GradientSky, Twinkles } from '../three/Environment';
import { mascotBus, placePlayer, walkTo } from '../three/playerState';
import { Atmosphere, GroundShadows } from '../three/World';
import { Pet, type PetId } from '../models/kenney';

/** Imperative bridge so the DOM "Throw the ball" button can reach the 3D ball. */
export const roomCtl = { throwReq: false };

const HOME: [number, number, number] = [0, 1.15, -1.2];
const NEST: [number, number, number] = [0, 0.95, -2.6];

/** The planetarium dome: twilight blue (never black), slowly turning stars and soft nebulae. */
function StarDome() {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ t: { value: 0 } }), []);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.t.value += dt;
  });
  return (
    <mesh>
      <sphereGeometry args={[7.6, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <shaderMaterial
        ref={mat}
        side={1}
        uniforms={uniforms}
        vertexShader="varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
        fragmentShader={`uniform float t; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
          void main(){
            float e = clamp(vDir.y, 0.0, 1.0);
            vec3 sky = mix(vec3(0.62, 0.71, 0.96), vec3(0.20, 0.26, 0.55), smoothstep(0.0, 0.85, e));
            // the sky turns slowly, like a real planetarium projector
            float a = t * 0.015;
            vec3 d = vec3(vDir.x * cos(a) - vDir.z * sin(a), vDir.y, vDir.x * sin(a) + vDir.z * cos(a));
            float h = hash(floor(d * 140.0));
            float star = step(0.9935, h) * (0.6 + 0.4 * sin(t * 2.0 + h * 50.0)) * smoothstep(0.08, 0.35, e);
            float big = step(0.9993, hash(floor(d * 60.0))) * smoothstep(0.1, 0.4, e);
            // soft nebulae in pink and teal
            float n1 = smoothstep(0.45, 0.0, length(d.xz - vec2(0.35, -0.3))) * smoothstep(0.2, 0.6, e);
            float n2 = smoothstep(0.4, 0.0, length(d.xz - vec2(-0.4, 0.25))) * smoothstep(0.2, 0.6, e);
            vec3 c = sky + n1 * vec3(0.35, 0.15, 0.35) + n2 * vec3(0.1, 0.3, 0.32) + vec3(star * 0.9 + big * 1.2);
            gl_FragColor = vec4(c, 1.0);
          }`}
      />
    </mesh>
  );
}

/** A few constellations traced on the dome: dots joined by soft lines (azimuth, elevation). */
const CONSTELLATIONS: [number, number][][] = [
  // the Big Dipper
  [[-2.4, 0.95], [-2.15, 1.0], [-1.9, 1.02], [-1.68, 0.98], [-1.55, 0.8], [-1.25, 0.82], [-1.28, 1.0], [-1.68, 0.98]],
  // Cassiopeia, the W
  [[0.6, 0.9], [0.8, 1.05], [1.0, 0.92], [1.2, 1.08], [1.4, 0.94]],
  // Orion: shoulders and belt
  [[2.4, 0.55], [2.55, 0.75], [2.7, 0.6], [2.62, 0.68], [2.5, 0.68], [2.38, 0.68], [2.5, 0.85], [2.75, 0.85]],
];
function Constellations() {
  const pts = useMemo(
    () => CONSTELLATIONS.map((c) => c.map(([az, el]) => new Vector3(Math.sin(az) * Math.cos(el) * 7.3, Math.sin(el) * 7.3, -Math.cos(az) * Math.cos(el) * 7.3))),
    [],
  );
  return (
    <group>
      {pts.map((line, i) => (
        <group key={i}>
          <Line points={line} color="#e3ecff" lineWidth={1.6} transparent opacity={0.55} />
          {line.map((p, k) => (
            <Glow key={k} color="#fff8e1" size={0.45} opacity={0.95} position={[p.x, p.y, p.z]} />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Planets gliding round the dome, each on its own slow orbit. */
function Planets() {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    g.current?.children.forEach((c, i) => (c.rotation.y += dt * (0.05 + i * 0.02)));
  });
  const planet = (r: number, y: number, size: number, color: string, ring?: string) => (
    <group position={[r, y, 0]}>
      <mesh>
        <sphereGeometry args={[size, 32, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      {ring && (
        <mesh rotation-x={1.2}>
          <ringGeometry args={[size * 1.4, size * 2.1, 48]} />
          <meshStandardMaterial color={ring} side={2} transparent opacity={0.85} emissive={ring} emissiveIntensity={0.2} />
        </mesh>
      )}
    </group>
  );
  return (
    <group ref={g}>
      <group>{planet(4.6, 4.4, 0.42, '#e8b36a', '#f3d9a6')}</group>
      <group rotation-y={2}>{planet(5.2, 3.8, 0.28, '#d9634a')}</group>
      <group rotation-y={4}>{planet(3.6, 4.9, 0.34, '#4f8fdc')}</group>
    </group>
  );
}

function Ball({ chase }: { chase: { current: Vector3 | null } }) {
  const ref = useRef<Mesh>(null);
  const st = useRef<{ mode: 'idle' | 'flying' | 'fetch' | 'return'; t: number; from: Vector3; to: Vector3 }>({
    mode: 'idle',
    t: 0,
    from: new Vector3(1.2, 0.25, 0.4),
    to: new Vector3(),
  });
  const pos = useRef(new Vector3(1.2, 0.25, 0.4));

  const throwIt = () => {
    const s = st.current;
    if (s.mode !== 'idle' || useApp.getState().bedtime) return;
    const a = Math.random() * Math.PI * 2;
    s.from.copy(pos.current);
    s.to.set(Math.cos(a) * 3.5, 0.25, Math.sin(a) * 3 - 0.5);
    s.mode = 'flying';
    s.t = 0;
    sfx('pop');
  };

  useFrame((state, dt) => {
    const s = st.current;
    if (roomCtl.throwReq) {
      roomCtl.throwReq = false;
      throwIt();
    }
    if (s.mode === 'flying') {
      s.t = Math.min(1, s.t + dt / 0.9);
      pos.current.lerpVectors(s.from, s.to, s.t);
      pos.current.y = 0.25 + Math.sin(s.t * Math.PI) * 2.2;
      if (s.t >= 1) {
        s.mode = 'fetch';
        chase.current = s.to.clone().setY(0.9);
      }
    } else if (s.mode === 'fetch') {
      // Wondoo flies to the ball (the Mascot lerps toward chase.current)
      const nimbo = state.scene.getObjectByName('nimbo');
      if (nimbo && nimbo.position.distanceTo(chase.current!) < 0.4) {
        s.mode = 'return';
        chase.current = null;
        mascotBus.emit('happy');
        sfx('giggle');
      }
    } else if (s.mode === 'return') {
      const nimbo = state.scene.getObjectByName('nimbo');
      if (nimbo) pos.current.set(nimbo.position.x, nimbo.position.y - 0.45, nimbo.position.z + 0.3);
      if (nimbo && nimbo.position.distanceTo(new Vector3(...HOME)) < 0.3) {
        pos.current.set(HOME[0] + 0.6, 0.25, HOME[2] + 1.2);
        s.mode = 'idle';
      }
    }
    ref.current?.position.copy(pos.current);
    if (ref.current && s.mode !== 'idle') ref.current.rotation.x += dt * 8;
  });

  return (
    <mesh
      ref={ref}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        throwIt();
      }}
    >
      <sphereGeometry args={[0.25, 20, 14]} />
      <meshStandardMaterial color="#ff5a6e" roughness={0.2} envMapIntensity={1.5} />
    </mesh>
  );
}

/** A Kenney Cube Pet plush: tap it and it dances for a moment. */
function Plush({ id, position, rotationY = 0 }: { id: PetId; position: [number, number, number]; rotationY?: number }) {
  const [dancing, setDancing] = useState(false);
  return (
    <group
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        sfx('giggle');
        setDancing(true);
        window.setTimeout(() => setDancing(false), 2600);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <Pet id={id} fit={0.8} action={dancing ? 'dance' : 'idle'} />
    </group>
  );
}

/**
 * Wondoo's Den: a bright little planetarium, not an exhibit hall. Play, Chat and Sleep modes;
 * the Sleep visual is also what the kid sees when the free LLM tier runs out.
 */
export function MascotRoom() {
  const { t } = useTranslation();
  const line = useLines();
  const goTo = useApp((s) => s.goTo);
  const say = useApp((s) => s.say);
  const bedtime = useApp((s) => s.bedtime);
  const mode = useApp((s) => s.roomMode);
  const groq = useApp((s) => s.providers.groq);
  const setBedtime = useApp((s) => s.setBedtime);
  const setMode = useApp((s) => s.setRoomMode);
  const days = useApp((s) => s.visitDays.length);
  const topics = useApp((s) => s.explored.length);
  const chase = useRef<Vector3 | null>(null);
  const quotaNap = mode === 'chat' && groq !== 'ok';
  const sleeping = bedtime || quotaNap;

  useEffect(() => {
    placePlayer(0, 4.4, 0);
    if (!useApp.getState().bedtime) say(line('mascot.greet'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <GradientSky top="#3a4a8c" horizon="#9fb5f2" bottom="#c9d3f3" />
      <hemisphereLight args={['#e3e9ff', '#8d96d6', 1.0]} />
      <Atmosphere sky="#c9d6ff" ground="#9aa6e0" warm="#ffe7b8" intensity={0.9} />
      <GroundShadows size={14} far={1.2} opacity={0.3} />
      <pointLight position={[0, 3.4, 0]} color="#fff1d6" intensity={sleeping ? 6 : 13} distance={14} />
      <pointLight position={[0, 2, -4]} color="#b9a8ff" intensity={sleeping ? 6 : 3} distance={9} />
      <Player bounds={circleBounds(5.4)} speed={4.4} />

      {/* floor (tap-to-walk): a light planetarium floor with rings, like rows of seats */}
      <mesh
        rotation-x={-Math.PI / 2}
        onClick={(e) => {
          if (e.delta > 6) return;
          walkTo(e.point.x, e.point.z);
        }}
      >
        <circleGeometry args={[7.6, 64]} />
        <meshStandardMaterial color="#cdd6f4" roughness={0.8} />
      </mesh>
      {[2.2, 3.6, 5.0, 6.4].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
          <ringGeometry args={[r, r + 0.08, 72]} />
          <meshStandardMaterial color="#aab6e6" />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -0.5]}>
        <circleGeometry args={[1.9, 48]} />
        <meshStandardMaterial color="#e6ebfb" />
      </mesh>
      <StarDome />
      <Constellations />
      <Planets />
      {/* the moon bed: tap it to say goodnight */}
      <group
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          if (!useApp.getState().bedtime) {
            sfx('pop');
            say(null);
            setBedtime(true);
          }
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
      {/* a crescent-moon bed */}
      <mesh position={[NEST[0], 0.55, NEST[2] - 0.25]} rotation-z={Math.PI / 2 + 0.35}>
        <torusGeometry args={[0.9, 0.32, 16, 40, Math.PI * 1.1]} />
        <meshStandardMaterial color="#ffd86b" roughness={0.6} emissive="#ffcf4a" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[NEST[0], 0.28, NEST[2]]} scale={[1, 0.3, 0.8]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#c9d4ff" />
      </mesh>
      </group>
      {!sleeping && (
        <Label3D position={[NEST[0] + 1.3, 0.9, NEST[2]]} distanceFactor={8}>
          <div className="plaque small">
            <Moon className="i" /> {t('room.bedtime')}
          </div>
        </Label3D>
      )}
      {/* tally plaque: the relationship remembers across sessions */}
      <Label3D position={[0, 3.6, -5.6]} distanceFactor={10}>
        <div className="plaque">{t('hud.tally', { days, topics })}</div>
      </Label3D>
      {/* cushions */}
      {[
        [-3, -1, '#a9c8ff'],
        [3, -0.5, '#d8c4ff'],
        [-2.6, 2, '#ffe28a'],
      ].map(([x, z, c], i) => (
        <mesh key={i} position={[x as number, 0.3, z as number]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.7, 20, 12]} />
          <meshStandardMaterial color={c as string} />
        </mesh>
      ))}
      {/* Wondoo's plush friends (Kenney Cube Pets): tap one to make it dance */}
      <Suspense fallback={null}>
        <Plush id="lion" position={[-3, 0.55, -1]} rotationY={0.6} />
        <Plush id="panda" position={[3, 0.55, -0.5]} rotationY={-0.6} />
        <Plush id="bunny" position={[-2.6, 0.55, 2]} rotationY={1.6} />
        <Plush id="elephant" position={[2.4, 0, -3.6]} rotationY={-0.4} />
        <Plush id="penguin" position={[-2.3, 0, -3.7]} rotationY={0.4} />
      </Suspense>
      <Twinkles count={40} scale={[12, 5, 12]} position={[0, 3, 0]} size={3} speed={0.15} color="#fff8e1" />

      <Ball chase={chase} />
      <Mascot
        mode="stay"
        name="nimbo"
        home={sleeping ? NEST : HOME}
        sleeping={sleeping}
        chase={chase}
        onPoke={() => {
          if (bedtime) {
            // waking up is part of the bedtime ritual
            setBedtime(false);
            sfx('portal');
            mascotBus.emit('happy');
            say(line('mascot.greet'));
            return;
          }
          if (sleeping) return;
          sfx('giggle');
          mascotBus.emit('squish');
          say(line('mascot.praise'));
        }}
      />
      {!sleeping && mode !== 'chat' && (
        <Html position={[1.1, 1.9, HOME[2]]} center zIndexRange={[12, 0]}>
          <button
            className="act3d"
            onClick={() => {
              sfx('click');
              setMode('chat');
            }}
          >
            <MessageCircle className="i" /> {t('room2.talk')}
          </button>
        </Html>
      )}

      <Portal
        position={[0, 0, 6.2]}
        rotationY={Math.PI}
        color="#7cc8f0"
        glow="#e8f8ff"
        home
        label={t('hud.backToHall')}
        onEnter={() => {
          sfx('portal');
          goTo('hub');
        }}
      />
    </>
  );
}
