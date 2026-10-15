import { Suspense, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, ConeGeometry, DoubleSide, Group, InstancedMesh, Object3D, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getScene } from '../content/loader';
import { Model } from '../models';
import { Real } from '../models/real';
import { Nature, preloadNature } from '../models/kenney';
import { Label3D } from '../three/Label3D';
import { circleBounds } from '../three/Player';
import { SceneShell } from '../three/SceneShell';
import { Terrain } from '../three/Terrain';
import { Grass } from '../three/props';
import { Bubbles } from '../three/Environment';
import { useQuality } from '../three/quality';
import { glowTexture } from '../three/textures';

/**
 * The Great Aquarium: you walk the sandy floor of a huge tank. Light shafts
 * come down from the surface, a school of fish wheels overhead, kelp sways and
 * a blue whale makes a slow pass through the open water.
 *
 * Everything that swims is a handful of instanced or cloned toy models, so the
 * whole tank costs about as much as the meadow does.
 */

const dummy = new Object3D();
const rnd = (i: number, salt = 1) => Math.abs(Math.sin(i * 12.9898 * salt + salt * 78.233) * 43758.5453) % 1;

/**
 * One little fish, merged into a single geometry so a whole school is one
 * instanced draw call: a tapered body, a tail fin and a dorsal fin.
 */
const schoolFish = (() => {
  const body = new SphereGeometry(0.5, 10, 7).scale(0.34, 0.5, 1);
  const tail = new ConeGeometry(0.3, 0.42, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.62);
  const dorsal = new ConeGeometry(0.16, 0.3, 3).translate(0, 0.28, -0.05);
  return mergeGeometries([body, tail, dorsal])!;
})();

const REEF = { x: -12, z: -6, r: 8 };
const KELP = { x: 9, z: 8, r: 7 };

const REEF_SET: [string, number, number, number][] = [
  ['coral', -13.5, -7.5, 1.7],
  ['coral', -10.2, -4.4, 1.3],
  ['coral', -15.2, -3.6, 1.1],
  ['coral', -9.4, -9.2, 1.5],
  ['coral', -12.4, -10.6, 1.2],
  ['anemone', -11, -6.4, 1.1],
  ['anemone', -14.4, -5.2, 0.9],
  ['starfish', -9.8, -6.6, 0.8],
  ['starfish', -13.2, -3.2, 0.7],
  ['crab', -10.6, -8.2, 0.8],
];

/** A school of fish wheeling around a centre, each on its own little orbit. */
function School({ count = 26, center = [0, 3, 0] as [number, number, number], radius = 7, tint = '#ffd08a' }) {
  const low = useQuality((s) => s.tier === 'low');
  const n = low ? Math.round(count * 0.5) : count;
  const ref = useRef<InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        r: radius * (0.55 + rnd(i) * 0.45),
        y: center[1] + (rnd(i, 3) - 0.5) * 2.6,
        speed: 0.22 + rnd(i, 5) * 0.16,
        phase: rnd(i, 7) * Math.PI * 2,
        size: 0.32 + rnd(i, 11) * 0.34,
      })),
    [n, radius, center],
  );
  useFrame((st) => {
    const m = ref.current;
    if (!m) return;
    const t = st.clock.elapsedTime;
    seeds.forEach((f, i) => {
      const a = f.phase + t * f.speed;
      dummy.position.set(center[0] + Math.sin(a) * f.r, f.y + Math.sin(t * 0.8 + f.phase) * 0.35, center[2] + Math.cos(a) * f.r);
      dummy.rotation.set(0, a + Math.PI / 2, Math.sin(t * 3 + f.phase) * 0.12);
      dummy.scale.setScalar(f.size);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[schoolFish, undefined, n]} frustumCulled={false}>
      <meshStandardMaterial color={tint} roughness={0.45} flatShading />
    </instancedMesh>
  );
}

/** The blue whale's slow pass across the top of the tank. */
function WhalePass() {
  const g = useRef<Group>(null);
  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime * 0.06;
    const a = t % (Math.PI * 2);
    g.current.position.set(Math.sin(a) * 19, 11 + Math.sin(t * 2) * 0.8, Math.cos(a) * 19);
    g.current.rotation.y = -a + Math.PI / 2;
    g.current.rotation.z = Math.sin(t * 2) * 0.06;
  });
  return (
    <group ref={g}>
      {/* the downloaded blue whale; the simple one stands in while it loads */}
      <Suspense fallback={<Model id="whale" fit={9} anchor="center" />}>
        <Real id="whale" fit={11} />
      </Suspense>
    </group>
  );
}

/** A creature that drifts gently on the spot: turtles, jellyfish, octopus. */
function Drifter({ id, position, fit, speed = 0.5, spin = 0 }: { id: 'turtle' | 'jellyfish' | 'octopus' | 'clownfish'; position: [number, number, number]; fit: number; speed?: number; spin?: number }) {
  const g = useRef<Group>(null);
  const phase = useMemo(() => Math.random() * 6.3, []);
  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime;
    g.current.position.y = position[1] + Math.sin(t * speed + phase) * 0.35;
    g.current.rotation.y = spin ? t * spin : g.current.rotation.y;
    g.current.rotation.z = Math.sin(t * speed * 1.7 + phase) * 0.08;
  });
  return (
    <group ref={g} position={position}>
      {id === 'octopus' ? (
        <Suspense fallback={<Model id={id} fit={fit} anchor="center" />}>
          <Real id="octopus" fit={fit * 1.4} />
        </Suspense>
      ) : (
        <Model id={id} fit={fit} anchor="center" />
      )}
    </group>
  );
}

/** Sunlight shafts coming down through the water. */
function LightShafts({ count = 7 }: { count?: number }) {
  const low = useQuality((s) => s.tier === 'low');
  if (low) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.4;
        const r = 6 + rnd(i, 13) * 11;
        return (
          <mesh key={i} position={[Math.sin(a) * r, 9, Math.cos(a) * r]} rotation={[0, a, 0.12]}>
            <planeGeometry args={[3.4 + rnd(i, 3) * 2, 18]} />
            <meshBasicMaterial map={glowTexture()} color="#bff0ff" transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        );
      })}
    </>
  );
}

const TANK_PROPS = ['rock_largeA', 'rock_largeC', 'rock_smallA', 'rock_tallA', 'stone_largeB'] as const;
preloadNature([...TANK_PROPS]);

function Rocks() {
  const placements: [(typeof TANK_PROPS)[number], number, number, number][] = [
    ['rock_largeA', -16.5, -9.5, 2.4],
    ['rock_largeC', 13.5, -7, 2.2],
    ['rock_tallA', 6.5, 12.5, 2.8],
    ['rock_smallA', -5.5, -13.5, 1.2],
    ['stone_largeB', 15, 6, 2],
  ];
  return (
    <Suspense fallback={null}>
      {placements.map(([id, x, z, fit], i) => (
        <Nature key={i} id={id} position={[x, 0, z]} fit={fit} rotation-y={i} />
      ))}
    </Suspense>
  );
}

function ZoneLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Label3D position={position} distanceFactor={16} maxDistance={34} zIndex={4}>
      <div className="plaque small">{text}</div>
    </Label3D>
  );
}

export function Aquarium() {
  const { t } = useTranslation();
  const scene = getScene('ocean');
  const low = useQuality((s) => s.tier === 'low');
  const kelpBed = useMemo(
    () =>
      Array.from({ length: low ? 9 : 18 }, (_, i) => {
        const a = i * 2.39996;
        const r = Math.sqrt(rnd(i, 5)) * KELP.r;
        return { x: KELP.x + Math.cos(a) * r, z: KELP.z + Math.sin(a) * r, s: 1.6 + rnd(i, 9) * 1.8, k: i };
      }),
    [low],
  );
  const sandTufts = useMemo(() => {
    return (i: number): [number, number] => {
      const a = i * 2.39996;
      const r = Math.sqrt((i % 89) / 89) * 20;
      return [Math.cos(a) * r, Math.sin(a) * r];
    };
  }, []);

  return (
    <SceneShell
      hotspots={scene.hotspots}
      start={{ x: 0, z: 14, yaw: 0 }}
      bounds={circleBounds(21)}
      exit={{ position: [0, 0, 17.5], rotationY: Math.PI }}
      // bright at the surface, deep below: the gradient sky *is* the water
      sky={{ top: '#a6ecff', horizon: '#2f96c9', bottom: '#0a4a70' }}
      fog={['#2b8fc0', 14, 60]}
      lights={{ sky: '#bfeaff', ground: '#1d6b93', keyLight: '#dff6ff', intensity: 0.9 }}
      hotspotColor="#bff0ff"
      shadowSize={46}
      clouds={false}
    >
      <Terrain
        size={96}
        segments={90}
        flatRadius={22}
        base="#e4d3ab"
        hill="#cbb98f"
        pathColor="#efe3c4"
        detail={3}
        zones={[
          { x: REEF.x, z: REEF.z, r: REEF.r, color: '#d9c49a' },
          { x: KELP.x, z: KELP.z, r: KELP.r, color: '#bfae86' },
        ]}
      />
      <Grass count={low ? 160 : 380} area={sandTufts} color="#7fae7a" />

      <LightShafts />
      <Bubbles count={low ? 14 : 30} radius={18} height={16} color="#eaffff" />
      <WhalePass />
      <School center={[0, 6, -4]} radius={9} count={30} tint="#ffd08a" />
      <School center={[8, 3.4, 6]} radius={5} count={16} tint="#8fd8ff" />

      <Rocks />

      {/* reef */}
      <ZoneLabel position={[REEF.x, 4.2, REEF.z]} text={t('zones.reef')} />
      {REEF_SET.map(([id, x, z, fit], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={rnd(i, 3) * 6.3}>
          <Model id={id as 'coral'} fit={fit} />
        </group>
      ))}
      <Drifter id="clownfish" position={[-10.8, 1.5, -6.2]} fit={0.9} speed={1.2} />
      <Drifter id="clownfish" position={[-11.6, 1.1, -5.4]} fit={0.7} speed={1.4} />
      <Drifter id="octopus" position={[-8, 1, 6]} fit={1.8} speed={0.4} />

      {/* kelp forest */}
      <ZoneLabel position={[KELP.x, 4.6, KELP.z]} text={t('zones.kelp')} />
      {kelpBed.map((k) => (
        <group key={k.k} position={[k.x, 0, k.z]} rotation-y={rnd(k.k, 7) * 6.3}>
          <Model id="kelp" fit={k.s} />
        </group>
      ))}

      {/* open water */}
      <ZoneLabel position={[0, 8, -15]} text={t('zones.openWater')} />
      <Drifter id="turtle" position={[10, 2.4, -9]} fit={2.2} speed={0.5} spin={0.08} />
      <Drifter id="jellyfish" position={[4, 4.2, -12]} fit={1.6} speed={0.7} />
      <Drifter id="jellyfish" position={[-3.5, 5.6, -13.5]} fit={1.2} speed={0.6} />
      <Drifter id="jellyfish" position={[6.5, 6.4, -15]} fit={1.4} speed={0.5} />
    </SceneShell>
  );
}
