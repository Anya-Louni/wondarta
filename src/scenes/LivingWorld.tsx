import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Label3D } from '../three/Label3D';
import { getScene } from '../content/loader';
import { SceneShell } from '../three/SceneShell';
import { circleBounds } from '../three/Player';
import { Bubbles, Twinkles } from '../three/Environment';
import { Model } from '../models';
import { Nature, preloadNature, type NatureId } from '../models/kenney';
import { Terrain, segDist, type Zone } from '../three/Terrain';
import { useQuality } from '../three/quality';
import { Grass, Pond, Reeds } from '../three/props';
import { Critter } from '../three/Critter';
import { MEADOW, Meadow } from './Meadow';
import { preloadReal } from '../models/real';

/**
 * FLAGSHIP: Animals / The Living World. Same shell, hotspots, mascot and card
 * systems as every mini-scene, just a bigger stage with three zones.
 */

const SAVANNA = { x: -11, z: -3, r: 10 };
const FOREST = { x: 3, z: -14, r: 10 };
const POND = { x: 16, z: -1, r: 3.6 };

function scatter(c: { x: number; z: number; r: number }) {
  return (i: number): [number, number] => {
    const a = i * 2.39996; // golden angle: even, deterministic spread
    const rr = Math.sqrt((i % 97) / 97) * c.r;
    return [c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr];
  };
}

const ZONES: Zone[] = [
  { x: 12.5, z: 9.5, r: 5.6, color: '#8fcf5a' },
  { x: SAVANNA.x, z: SAVANNA.z, r: SAVANNA.r, color: '#d9b75a' },
  { x: FOREST.x, z: FOREST.z, r: FOREST.r, color: '#3a8f3f' },
  { x: POND.x, z: POND.z, r: POND.r + 2.2, color: '#d9c894' },
];
/** Dirt paths from the entrance to each zone. */
const PATHS: [number, number, number, number][] = [
  [2, 7, 10.5, 9.5],
  [0, 16, 0, 4],
  [0, 4, -9, -1],
  [0, 4, 2, -7],
  [0, 4, 10, 0],
];
/** Keep grass off the walking paths. */
const offPath = (x: number, z: number) => PATHS.every(([ax, az, bx, bz]) => segDist(x, z, ax, az, bx, bz) > 2.2);

/** Face a model toward the main path so animals greet the visitor. */
const face = (x: number, z: number) => Math.atan2(0 - x, 6 - z);

function ZoneLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Label3D position={position} distanceFactor={22} maxDistance={60} zIndex={4}>
      <div className="plaque">{text}</div>
    </Label3D>
  );
}

// ---------------------------------------------------------------- Kenney Nature Kit set dressing

type Placed = [NatureId, number, number, number, number?]; // id, x, z, fit, rotY

const SAVANNA_SET: Placed[] = [
  ['tree_plateau', -17, -3, 5.5, 0.4],
  ['tree_plateau', -6, 3.5, 4.6, 2.1],
  ['tree_plateau', -19, -15, 5, 1.2],
  ['tree_plateau', -11, -18, 4.2, 2.8],
  ['rock_largeA', -9, 4.5, 1.6, 0.8],
  ['rock_smallC', -13, -3, 0.7, 0.2],
  ['plant_bush', -15, 0, 1.2, 0],
  ['plant_bush', -20, -9, 1.3, 1.3],
  ['grass_large', -11, -1, 0.9, 0],
  ['grass_large', -16, -7, 0.9, 2],
];

const FOREST_SET: Placed[] = [
  ['tree_pineTallA_detailed', -5, -20, 7, 0.3],
  ['tree_pineRoundA', 0, -23, 6, 1.1],
  ['tree_pineTallA_detailed', 9, -21, 7.5, 2.2],
  ['tree_pineRoundC', 11, -15, 5.5, 0.6],
  ['tree_pineDefaultA', -7, -12, 5.2, 1.8],
  ['tree_pineRoundA', 7, -24.5, 6.5, 2.9],
  ['tree_detailed', -1.5, -20.5, 5.5, 0.1],
  ['tree_fat', 13, -20, 5, 1.5],
  ['tree_oak', -2.5, -11.5, 7.5, 0.7], // the mighty oak of the oak hotspot
  ['plant_bushDetailed', 2, -16, 1.4, 0.3],
  ['plant_bushLarge', -8, -17, 1.8, 1],
  ['mushroom_red', 1.2, -18.6, 0.5, 0],
  ['mushroom_tanGroup', -6.2, -15.5, 0.6, 1],
  ['log_large', 4, -22, 2.6, 1.2],
  ['flower_redA', 6.8, -13.2, 0.6, 0],
  ['flower_yellowA', 9, -13.8, 0.6, 1],
  ['flower_purpleA', 5.5, -11.8, 0.6, 2],
  ['stump_round', 10.5, -18, 0.8, 0],
];

const POND_SET: Placed[] = [
  ['lily_large', POND.x + 1.8, POND.z - 1.1, 1.0, 0.4],
  ['lily_small', POND.x - 2.1, POND.z + 0.9, 0.6, 1.3],
  ['lily_large', POND.x + 0.2, POND.z + 2.2, 0.8, 2.2],
  ['canoe', POND.x + 3.9, POND.z + 3.2, 2.4, 2.4],
  ['rock_smallA', POND.x - 3.9, POND.z - 1.8, 0.7, 0],
  ['rock_smallC', POND.x + 4.2, POND.z - 1.2, 0.6, 1],
  ['plant_bushDetailed', POND.x + 5.2, POND.z + 0.8, 1.2, 0],
  ['grass_leafs', POND.x - 4.2, POND.z + 1.8, 0.8, 0],
];

preloadNature([...new Set([...SAVANNA_SET, ...FOREST_SET, ...POND_SET].map((p) => p[0]))]);
preloadReal(['elephant', 'lion', 'zebra', 'giraffe', 'rhino', 'hippo', 'owl', 'fox', 'deer', 'rabbit', 'frog', 'panda', 'kangaroo', 'penguin']);

/** Small scatter props: safe to thin out. Trees, logs, stumps and the canoe stay. */
const FILLER = /^(grass|flower|mushroom|plant|lily|rock_small|stone)/;

function Placements({ set }: { set: Placed[] }) {
  // Kenney's models carry most of the scene's triangles, so the low tier
  // thins the scatter. Nothing a kid can visit or read about is dropped.
  const low = useQuality((s) => s.tier === 'low');
  const shown = low ? set.filter(([id], i) => !(FILLER.test(id) && i % 2 === 1)) : set;
  return (
    <>
      {shown.map(([id, x, z, fit, rot = 0], i) => (
        <Nature key={i} id={id} position={[x, id.startsWith('lily') ? 0.05 : 0, z]} fit={fit} rotation-y={rot} />
      ))}
    </>
  );
}
const SavannaPlants = () => <Placements set={SAVANNA_SET} />;
const ForestPlants = () => <Placements set={FOREST_SET} />;
const PondPlants = () => <Placements set={POND_SET} />;

export function LivingWorld() {
  const { t } = useTranslation();
  const scene = getScene('animals');
  const savannaGrass = useMemo(() => scatter(SAVANNA), []);
  const forestGrass = useMemo(() => scatter(FOREST), []);
  const meadowGrass = useMemo(() => scatter(MEADOW), []);

  return (
    <SceneShell
      hotspots={scene.hotspots}
      start={{ x: 0, z: 12, yaw: 0 }}
      bounds={circleBounds(25)}
      exit={{ position: [0, 0, 15.5], rotationY: Math.PI }}
      sky={{ top: '#3aa8f2', horizon: '#e9f9ff', bottom: '#c3eaa2' }}
      fog={['#e3f6ff', 30, 95]}
      shadowSize={56}
    >
      <Terrain zones={ZONES} paths={PATHS} base="#6fbf4f" pathColor="#cdb07a" hill="#5fae45" />
      <Grass count={700} area={savannaGrass} color="#c7a63f" keep={offPath} />
      <Grass count={620} area={forestGrass} color="#3f9a3a" keep={offPath} />
      <Grass count={260} area={meadowGrass} color="#6cc24f" keep={offPath} />

      {/* SAVANNA */}
      <ZoneLabel position={[SAVANNA.x, 4.5, SAVANNA.z + 3]} text={t('zones.savanna')} />
      <Suspense fallback={null}>
        <SavannaPlants />
      </Suspense>
      <Critter id="elephant" position={[-14.5, 0, 3.5]} fit={4.0} rotationY={face(-14.5, 3.5)} move="graze" say={t('critters.elephant')} />
      <Critter id="lion" position={[-9.5, 0, -8]} fit={2.3} rotationY={face(-9.5, -8)} say={t('critters.lion')} />
      <Critter id="lion" position={[-8, 0, -9.2]} fit={1.7} rotationY={face(-8, -9.2)} move="hop" say={t('critters.cub')} />
      <Critter id="zebra" position={[-17.5, 0, -10]} fit={2.3} rotationY={face(-17.5, -10)} move="graze" say={t('critters.zebra')} />
      <Critter id="zebra" position={[-19.5, 0, -12]} fit={2.2} rotationY={face(-19.5, -12) + 0.6} move="graze" say={t('critters.zebra')} />
      <Critter id="giraffe" position={[-15.5, 0, -14]} fit={4.4} rotationY={face(-15.5, -14)} move="graze" say={t('critters.giraffe')} />
      <Critter id="rhino" position={[-12.5, 0, -13]} fit={2.9} rotationY={face(-12.5, -13)} move="graze" say={t('critters.rhino')} />
      <Critter id="hippo" position={[-19, 0, -7]} fit={2.8} rotationY={face(-19, -7)} say={t('critters.hippo')} />

      {/* FOREST */}
      <ZoneLabel position={[FOREST.x, 6, FOREST.z + 2]} text={t('zones.forest')} />
      <Suspense fallback={null}>
        <ForestPlants />
      </Suspense>
      <Model id="acorn" position={[-0.6, 0, -8.4]} fit={0.45} rotation-y={face(-0.6, -8.4)} />
      {/* owl on a stump by its hotspot */}
      <mesh position={[-4.4, 0.45, -16.6]}>
        <cylinderGeometry args={[0.38, 0.45, 0.9, 12]} />
        <meshStandardMaterial color="#7b5132" roughness={0.9} />
      </mesh>
      <mesh position={[-4.4, 0.905, -16.6]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.38, 20]} />
        <meshStandardMaterial color="#d9b27a" roughness={0.8} />
      </mesh>
      <Critter id="owl" position={[-4.4, 0.9, -16.6]} fit={0.95} rotationY={face(-4.4, -16.6)} move="sway" say={t('critters.owl')} />
      <Critter id="fox" position={[3, 0, -20]} fit={1.25} rotationY={face(3, -20)} say={t('critters.fox')} />
      <Critter id="deer" position={[7.5, 0, -19.5]} fit={1.9} rotationY={face(7.5, -19.5)} move="graze" say={t('critters.deer')} />
      <Critter id="rabbit" position={[6, 0, -16.5]} fit={0.7} rotationY={face(6, -16.5)} move="hop" say={t('critters.rabbit')} />
      <Model id="sunflower" position={[9.8, 0, -11]} fit={2.2} rotation-y={face(9.8, -11)} />

      {/* ATLAS CORNER: the globe post, and the three animals from far away */}
      <mesh position={[6.2, 0.55, 3.4]}>
        <cylinderGeometry args={[0.12, 0.16, 1.1, 10]} />
        <meshStandardMaterial color="#c9a25a" roughness={0.6} />
      </mesh>
      <Critter id="globe" position={[6.2, 1.35, 3.4]} fit={0.9} move="flit" noticeRange={0} say={t('critters.tap')} />
      <Critter id="panda" position={[8.2, 0, 4.2]} fit={1.4} rotationY={face(8.2, 4.2)} say={t('critters.panda')} />
      <Critter id="kangaroo" position={[4.6, 0, 5.4]} fit={1.7} rotationY={face(4.6, 5.4)} move="hop" say={t('critters.kangaroo')} />
      <Critter id="penguin" position={[7.4, 0, 6.2]} fit={1.1} rotationY={face(7.4, 6.2)} say={t('critters.penguin')} />

      {/* FLOWER MEADOW */}
      <ZoneLabel position={[MEADOW.x, 3.4, MEADOW.z]} text={t('zones.meadow')} />
      <Meadow sayBee={t('critters.bee')} sayButterfly={t('critters.butterfly')} saySunflower={t('critters.sunflower')} />

      {/* SOUND SAFARI: a listening post by the entrance */}
      <mesh position={[-3.6, 0.55, 6.8]}>
        <cylinderGeometry args={[0.1, 0.14, 1.1, 10]} />
        <meshStandardMaterial color="#c9a25a" roughness={0.6} />
      </mesh>
      <Critter id="speaker" position={[-3.6, 1.1, 6.8]} fit={0.7} rotationY={face(-3.6, 6.8)} move="breathe" noticeRange={0} say={t('critters.listen')} />

      {/* POND */}
      <ZoneLabel position={[POND.x, 3.6, POND.z]} text={t('zones.pond')} />
      <Pond position={[POND.x, 0, POND.z]} radius={POND.r} />
      <Reeds position={[POND.x - 3.4, 0, POND.z + 2.4]} />
      <Reeds position={[POND.x + 3.2, 0, POND.z - 2.6]} />
      <Reeds position={[POND.x + 1, 0, POND.z + 4]} />
      <Suspense fallback={null}>
        <PondPlants />
      </Suspense>
      <Critter id="frog" position={[POND.x - 1.8, 0.05, POND.z - 1.2]} fit={0.6} rotationY={face(POND.x - 1.8, POND.z - 1.2)} move="hop" say={t('critters.frog')} />
      <Model id="frogspawn" position={[POND.x + 1.4, 0.05, POND.z + 1]} fit={0.85} />
      <Critter id="tadpole" position={[POND.x + 0.4, 0.06, POND.z - 0.8]} fit={0.45} rotationY={1.2} move="swim" noticeRange={0} />
      <Critter id="tadpole" position={[POND.x - 0.6, 0.06, POND.z + 0.6]} fit={0.4} rotationY={-2} move="swim" noticeRange={0} />
      <Bubbles count={20} radius={POND.r} height={3} center={[POND.x, 0, POND.z]} />
      <Twinkles count={24} scale={[8, 3, 8]} position={[POND.x, 1.5, POND.z]} size={4} speed={0.3} color="#dff9ff" />

    </SceneShell>
  );
}
