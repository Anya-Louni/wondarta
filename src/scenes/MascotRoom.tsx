import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { Html } from '@react-three/drei';
import { MessageCircle, Moon } from 'lucide-react';
import { Label3D } from '../three/Label3D';
import { Color, Mesh, ShaderMaterial, Vector3 } from 'three';
import { useApp } from '../state/store';
import { useLines } from '../i18n';
import { sfx } from '../audio/sfx';
import { Player, circleBounds } from '../three/Player';
import { Portal } from '../three/Portal';
import { Mascot } from '../three/Mascot';
import { Bubbles, Glow, GradientSky, Twinkles } from '../three/Environment';
import { mascotBus, placePlayer, walkTo } from '../three/playerState';
import { Atmosphere, GroundShadows } from '../three/World';
import { Pet, type PetId } from '../models/kenney';

/** Imperative bridge so the DOM "Throw the ball" button can reach the 3D ball. */
export const roomCtl = { throwReq: false };

const HOME: [number, number, number] = [0, 1.15, -1.2];
const NEST: [number, number, number] = [0, 0.95, -2.6];

function Aurora() {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ t: { value: 0 }, a: { value: new Color('#6fffc8') }, b: { value: new Color('#8f7bff') } }), []);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.t.value += dt;
  });
  return (
    <mesh position={[0, 2.9, -6.3]}>
      <planeGeometry args={[6, 2.6]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
        fragmentShader={`uniform float t; uniform vec3 a; uniform vec3 b; varying vec2 vUv;
          void main(){
            vec3 night = mix(vec3(0.03,0.08,0.2), vec3(0.1,0.2,0.4), vUv.y);
            float band = sin(vUv.x * 6.0 + t * 0.6) * 0.12 + 0.55;
            float glow = smoothstep(0.25, 0.0, abs(vUv.y - band));
            vec3 c = night + glow * mix(a, b, vUv.x + sin(t * 0.3) * 0.2);
            float star = step(0.995, fract(sin(dot(floor(vUv * 90.0), vec2(12.9898, 78.233))) * 43758.5453));
            gl_FragColor = vec4(c + star * 0.8, 1.0);
          }`}
      />
    </mesh>
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
 * Wondoo's Den: a cozy nest, not an exhibit hall. Play, Chat and Sleep modes;
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
      <GradientSky top="#ffcf9a" horizon="#fff1dc" bottom="#e9c9a0" />
      <hemisphereLight args={['#fff1dc', '#b07a45', 0.7]} />
      <Atmosphere sky="#ffe9c8" ground="#e9b77a" warm="#ffd59a" intensity={0.9} />
      <GroundShadows size={14} far={1.2} opacity={0.35} />
      <pointLight position={[0, 3.2, 0]} color="#ffc47d" intensity={sleeping ? 6 : 14} distance={14} />
      <pointLight position={[0, 2, -4]} color="#9f8bff" intensity={sleeping ? 6 : 2} distance={8} />
      <Player bounds={circleBounds(5.4)} speed={4.4} />

      {/* floor (tap-to-walk) + rug */}
      <mesh
        rotation-x={-Math.PI / 2}
        onClick={(e) => {
          if (e.delta > 6) return;
          walkTo(e.point.x, e.point.z);
        }}
      >
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#d9a871" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -0.5]}>
        <circleGeometry args={[3, 40]} />
        <meshStandardMaterial color="#ffe0b8" />
      </mesh>
      {/* rounded walls */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[7, 7, 5, 48, 1, true]} />
        <meshStandardMaterial color="#f6dcb6" side={1} />
      </mesh>
      <mesh position={[0, 5, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#ffe7c6" side={2} />
      </mesh>
      <Aurora />
      {/* woven nest + cushion: tap it to say goodnight */}
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
      <mesh position={[NEST[0], 0.35, NEST[2]]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.1, 0.35, 10, 28]} />
        <meshStandardMaterial color="#a86f3c" roughness={1} flatShading />
      </mesh>
      <mesh position={[NEST[0], 0.3, NEST[2]]} scale={[1, 0.3, 1]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#ffcfdc" />
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
      <Label3D position={[0, 4.35, -6.2]} distanceFactor={10}>
        <div className="plaque">{t('hud.tally', { days, topics })}</div>
      </Label3D>
      {/* cushions */}
      {[
        [-3, -1, '#9fe0ff'],
        [3, -0.5, '#c9f5b4'],
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
      {/* string lights */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <Glow key={i} color={i % 2 ? '#ffd257' : '#ffb3c8'} size={0.6} opacity={0.9} position={[Math.sin(a) * 6.6, 4.2 + Math.sin(i) * 0.15, Math.cos(a) * 6.6]} />;
      })}
      <Bubbles count={16} radius={5} height={4} />
      <Twinkles count={25} scale={[10, 4, 10]} position={[0, 2.5, 0]} size={3} speed={0.2} color="#fff1c9" />

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
