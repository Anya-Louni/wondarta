import { Suspense, useMemo, useRef, type JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh, Shape } from 'three';
import type { CategoryId, Lang } from '../types/content';
import { getScene } from '../content/loader';
import { useApp } from '../state/store';
import { Glow } from '../three/Environment';
import { Model } from '../models';
import { BodyDisplay } from '../three/BodyDisplay';
import { Critter, type CritterMove } from '../three/Critter';
import { Nature } from '../models/kenney';
import { PineTree, Rock, RoundTree } from '../three/props';
import { WikiPicture } from '../three/WikiPicture';

export interface MiniTheme {
  floor: string;
  rim: string;
  wall: string;
  bubble?: string;
  hotspotColor?: string;
  sky: { top: string; horizon: string; bottom: string };
  lights?: { sky?: string; ground?: string; keyLight?: string; intensity?: number };
  Decor: () => JSX.Element;
}

// ---------------------------------------------------------------- shared bits

/**
 * A tappable resident of a room. What Wondoo says when it is tapped is one of
 * that room's own checked facts, pulled by id, so nothing here can drift from
 * the reviewed content.
 */
function Talker({ id, scene, fact, ...rest }: { id: string; scene: Exclude<CategoryId, 'ocean'>; fact: string; position: [number, number, number]; fit: number; move?: CritterMove }) {
  const lang = useApp((s) => s.lang);
  const text = getScene(scene).facts.find((f) => f.id === fact)?.text;
  return <Critter id={id} noticeRange={5} say={text ? text[lang] || text.en : undefined} {...rest} />;
}

function Spin({ children, speed = 0.3, position }: { children: React.ReactNode; speed?: number; position: [number, number, number] }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * speed;
  });
  return (
    <group ref={g} position={position}>
      {children}
    </group>
  );
}

function StarMesh({ color = '#ffd257' }: { color?: string }) {
  const shape = useMemo(() => {
    const s = new Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.45 : 1;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
  }, []);
  return (
    <mesh>
      <extrudeGeometry args={[shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.2} envMapIntensity={1.5} />
    </mesh>
  );
}

// ---------------------------------------------------------------- science

function BloodCells() {
  const cells = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: 5 + (i % 3), y: 1 + (i % 4) * 0.9 })), []);
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.08;
  });
  return (
    <group ref={g}>
      {cells.map((c, i) => (
        <mesh key={i} position={[Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r]} rotation={[c.a, c.a * 2, 0]} scale={[1, 1, 0.45]}>
          <torusGeometry args={[0.35, 0.22, 10, 20]} />
          <meshStandardMaterial color="#e2404f" roughness={0.3} envMapIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

function ScienceDecor() {
  return (
    <>
      <Talker id="heart-organ" scene="science" fact="f-heart-beats" move="hop" position={[-6.6, 0.9, -5.2]} fit={1.1} />
      <Talker id="brain" scene="science" fact="f-brain" move="sway" position={[6.4, 0, -5.6]} fit={1} />
      <Talker id="lungs" scene="science" fact="f-lungs-lobes" move="breathe" position={[3.6, 0, -8]} fit={1} />
      <BloodCells />
      {/* vessel arches */}
      {[-7, 7].map((x) => (
        <mesh key={x} position={[x, 0, -2]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[3, 0.45, 12, 32, Math.PI]} />
          <meshStandardMaterial color="#ff8a9c" roughness={0.3} envMapIntensity={1.5} />
        </mesh>
      ))}
      {/* the real thing: MRI-built organs in a turning glass body (BodyParts3D) */}
      <BodyDisplay position={[0, 0, -6.8]} />
    </>
  );
}

// ---------------------------------------------------------------- history

function HistoryDecor() {
  return (
    <>
      <Suspense fallback={null}>
        <Nature id="campfire_stones" position={[-1.5, 0, 3]} fit={1.4} />
        <Nature id="rock_tallA" position={[-8, 0, 0]} fit={2.6} />
        <Nature id="rock_largeC" position={[8, 0, 1]} fit={2} rotation-y={1} />
        <Nature id="plant_bushLarge" position={[4.5, 0, 5.5]} fit={1.6} />
      </Suspense>
      <mesh position={[0, 3, -30]}>
        <coneGeometry args={[9, 7, 9]} />
        <meshStandardMaterial color="#8b6b54" flatShading />
      </mesh>
      <Glow color="#ff8a3d" size={6} opacity={0.7} position={[0, 6.6, -30]} />
      {[[-7, 0.3, -5], [7, 0.4, -3], [-6, 0.3, 4], [6, 0.35, 5]].map((p, i) => (
        <Rock key={i} position={p as [number, number, number]} scale={1.4} color="#a48a6a" />
      ))}
      <PineTree position={[-8, 0, -6]} scale={1.3} />
      <PineTree position={[8, 0, -7]} scale={1.1} />
      <Talker id="trex" scene="history" fact="f-dino-humans" move="breathe" position={[-6, 0, -7]} fit={2.55} />
      <Talker id="diplodocus" scene="history" fact="f-dino-span" move="graze" position={[6.5, 0, -6.5]} fit={2.72} />
      <Talker id="triceratops" scene="history" fact="f-dino-extinct" move="graze" position={[-2.2, 0, -8.4]} fit={2.1} />
      <Talker id="eagle" scene="history" fact="f-dino-birds" move="flit" position={[4.4, 2.6, -3.5]} fit={1.1} />
      <Talker id="mammoth" scene="history" fact="f-mammoth" move="graze" position={[2.5, 0, -7.5]} fit={1.87} />
      {/* fossil bones in the sand */}
      {[0, 0.5, 1].map((k) => (
        <mesh key={k} position={[-3 + k, 0.08, 1.5 + k * 0.3]} rotation={[Math.PI / 2, 0, k]}>
          <capsuleGeometry args={[0.08, 0.9, 4, 8]} />
          <meshStandardMaterial color="#f4ecd8" />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- reading

function Bookshelf({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const colors = ['#e0393e', '#2f6fe0', '#3fae4a', '#f7d531', '#b46cff', '#ff8a5c'];
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2.6, 3, 0.6]} />
        <meshStandardMaterial color="#b98552" />
      </mesh>
      {[0.6, 1.5, 2.4].map((y) =>
        Array.from({ length: 7 }, (_, i) => (
          <mesh key={`${y}-${i}`} position={[-1.05 + i * 0.35, y, 0.25]}>
            <boxGeometry args={[0.26, 0.7, 0.2]} />
            <meshStandardMaterial color={colors[(i + y * 3) % colors.length | 0]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function ReadingDecor() {
  const explored = useApp((s) => s.explored);
  const storyOpen = explored.includes('reading/story');
  return (
    <>
      {[-2.4, -1.4, 1.4, 2.4].map((a) => (
        <Bookshelf key={a} position={[Math.sin(a) * 8.8, 0, Math.cos(a) * 8.8]} rotationY={a + Math.PI} />
      ))}
      <Talker id="owl" scene="reading" fact="f-fable" move="sway" position={[5.6, 0, -6.8]} fit={1.1} />
      <Talker id="starfish" scene="reading" fact="f-seastar" move="hop" position={[2.2, 0.02, -7.6]} fit={0.8} />
      <Talker id="open-book" scene="reading" fact="f-kalila" move="sway" position={[-4, 0, -6.5]} fit={1.53} />
      {/* Rebus: rendered as real 3D objects next to the sign */}
      <Spin position={[3, 2.2, -6.8]} speed={0.6}>
        <StarMesh />
      </Spin>
      <Html position={[4.3, 2.2, -6.8]} center zIndexRange={[5, 0]}>
        <div className="glyph3d">+</div>
      </Html>
      <group position={[5.7, 1.2, -6.8]}>
        <mesh>
          <boxGeometry args={[2, 1.4, 1]} />
          <meshStandardMaterial color="#2aa6e6" transparent opacity={0.8} roughness={0} envMapIntensity={1.5} />
        </mesh>
        {[-0.6, 0, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.75, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.25, 0.07, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>
      <Glow color="#ffe9a6" size={5} opacity={0.35} position={[4.3, 2, -6.6]} />
      {/* Step into the story: once the fable is read, its world appears */}
      {storyOpen && (
        <group position={[0, 0, 2]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
            <ringGeometry args={[4.2, 5.4, 48]} />
            <meshStandardMaterial color="#d9b77c" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
            <circleGeometry args={[4.2, 48]} />
            <meshStandardMaterial color="#7bd35f" />
          </mesh>
          <Suspense fallback={null}>
            <Nature id="tree_oak" position={[0, 0, 0]} fit={4} />
            <Nature id="fence_simple" position={[2.5, 0, 4.9]} fit={2} rotation-y={0.4} />
            <Nature id="flower_yellowA" position={[1.6, 0, -1.2]} fit={0.5} />
            <Nature id="flower_redA" position={[-2, 0, -1.8]} fit={0.5} />
          </Suspense>
          <Talker id="rabbit" scene="reading" fact="f-aesop" move="hop" position={[-1.4, 0, 1.2]} fit={1.1} />
          <Html position={[-1.4, 1.3, 1.2]} center zIndexRange={[5, 0]}>
            <div className="zzz">z Z z</div>
          </Html>
          <Talker id="tortoise" scene="reading" fact="f-moral" move="breathe" position={[4.8, 0, -1.2]} fit={1.02} />
          <Model id="finish-flag" position={[4.8, 0, 1.4]} fit={1.19} />
        </group>
      )}
    </>
  );
}

// ---------------------------------------------------------------- places

function Globe() {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.25;
  });
  return (
    <group ref={g} position={[0, 3.3, -6.8]}>
      <mesh>
        <sphereGeometry args={[1.5, 32, 24]} />
        <meshStandardMaterial color="#3aa0ff" roughness={0.1} envMapIntensity={1.5} />
      </mesh>
      {[[0.8, 0.6, 1.1], [-1.1, 0.1, 0.9], [0.2, -0.7, -1.3], [-0.5, 0.9, -1.1], [1.3, -0.3, -0.4]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#4cc26a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function PlacesDecor() {
  const stones: { glyph: string; x: number }[] = [
    { glyph: 'A', x: 2.2 },
    { glyph: 'ع', x: 3.8 },
    { glyph: '字', x: 5.4 },
    { glyph: 'Ж', x: 7 },
  ];
  return (
    <>
      <Suspense fallback={null}>
        <Nature id="plant_bushDetailed" position={[-8, 0, 2]} fit={1.4} />
        <Nature id="tree_default" position={[8, 0, 2.5]} fit={3.6} />
      </Suspense>
      <Globe />
      <Talker id="parrot" scene="places" fact="f-hello-es" move="flit" position={[5.6, 1.6, -6.2]} fit={0.9} />
      <Talker id="globe" scene="places" fact="f-chinese-chars" move="sway" position={[0.4, 0, -8.2]} fit={1.3} />
      <Talker id="speaker" scene="places" fact="f-languages-count" move="breathe" position={[-5.8, 0, -6]} fit={1.1} />
      {stones.map((s) => (
        <group key={s.glyph} position={[s.x, 0, -7]}>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[1.2, 1.6, 0.5]} />
            <meshStandardMaterial color="#eef7ff" roughness={0.2} envMapIntensity={1.5} />
          </mesh>
          <Html position={[0, 0.85, 0.3]} center transform distanceFactor={4} zIndexRange={[5, 0]}>
            <div className="glyph3d" lang={s.glyph === 'ع' ? 'ar' : s.glyph === '字' ? 'zh' : undefined}>
              {s.glyph}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- games (coding)

function RobotGrid() {
  const puzzle = getScene('games').hotspots.find((h) => h.puzzle?.type === 'command-route')?.puzzle;
  const bot = useRef<Group>(null);
  useFrame((st) => {
    if (bot.current) bot.current.position.y = 0.2 + Math.abs(Math.sin(st.clock.elapsedTime * 3)) * 0.12;
  });
  if (!puzzle || puzzle.type !== 'command-route') return null;
  const size = 1.1;
  const n = puzzle.grid.length;
  const origin = { x: -((n - 1) * size) / 2, z: -7.8 };
  return (
    <group>
      {puzzle.grid.map((row, r) =>
        row.split('').map((c, col) => {
          const x = origin.x + col * size;
          const z = origin.z + r * size;
          return (
            <group key={`${r}-${col}`} position={[x, 0, z]}>
              <mesh position={[0, c === '#' ? 0.4 : 0.04, 0]}>
                <boxGeometry args={[size * 0.92, c === '#' ? 0.8 : 0.08, size * 0.92]} />
                <meshStandardMaterial
                  color={c === '#' ? '#5f7a90' : '#7ce3ff'}
                  emissive={c === '#' ? '#000' : '#1b93d8'}
                  emissiveIntensity={0.35}
                  roughness={0.2} envMapIntensity={1.5} />
              </mesh>
              {c === 'G' && (
                <Spin position={[0, 0.9, 0]} speed={1.2}>
                  <group scale={0.35}>
                    <StarMesh />
                  </group>
                </Spin>
              )}
              {c === 'S' && (
                <group ref={bot}>
                  <mesh position={[0, 0.35, 0]}>
                    <boxGeometry args={[0.5, 0.45, 0.4]} />
                    <meshStandardMaterial color="#f5f8fb" roughness={0.2} envMapIntensity={1.5} />
                  </mesh>
                  <mesh position={[0, 0.75, 0]}>
                    <sphereGeometry args={[0.22, 16, 12]} />
                    <meshStandardMaterial color="#ff5ac8" roughness={0.1} envMapIntensity={1.5} />
                  </mesh>
                  <mesh position={[0, 1.05, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
                    <meshStandardMaterial color="#333" />
                  </mesh>
                  <Glow color="#ff9fe0" size={0.6} position={[0, 1.2, 0]} />
                </group>
              )}
            </group>
          );
        }),
      )}
    </group>
  );
}

function GamesDecor() {
  return (
    <>
      <RobotGrid />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 8, 2.5, Math.cos(a) * 8]} rotation-y={a}>
            <torusGeometry args={[0.8, 0.06, 8, 30]} />
            <meshBasicMaterial color={i % 2 ? '#7ce3ff' : '#ff8ae0'} />
          </mesh>
        );
      })}
      <Talker id="lock" scene="games" fact="f-bug" move="hop" position={[5.4, 0, -6.6]} fit={0.8} />
      <Talker id="scroll" scene="games" fact="f-ada" move="sway" position={[0.6, 0, -8.4]} fit={1.2} />
      <Talker id="robot" scene="games" fact="f-algorithm" move="sway" position={[-4, 0, -6.8]} fit={1.53} />
    </>
  );
}

// ---------------------------------------------------------------- sports

function OlympicRings() {
  // Official ring colours: top row blue, black, red; bottom row yellow, green.
  const rings: [string, number, number][] = [
    ['#0081c8', -1.1, 0],
    ['#000000', 0, 0],
    ['#ee334e', 1.1, 0],
    ['#fcb131', -0.55, -0.5],
    ['#00a651', 0.55, -0.5],
  ];
  return (
    <group position={[-4, 3.4, -7]}>
      {rings.map(([c, x, y]) => (
        <mesh key={c} position={[x, y, 0]}>
          <torusGeometry args={[0.48, 0.07, 10, 36]} />
          <meshStandardMaterial color={c} metalness={0.3} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function SportsDecor() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <ringGeometry args={[2.8, 3, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <planeGeometry args={[0.15, 18]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <OlympicRings />
      {/* goal */}
      <group position={[0, 0, -8.6]}>
        {[-1.6, 1.6].map((x) => (
          <mesh key={x} position={[x, 0.9, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        ))}
        <mesh position={[0, 1.8, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 3.3, 8]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      </group>
      <Talker id="soccer-ball" scene="sports" fact="f-soccer-11" move="hop" position={[1.2, 0, -2]} fit={0.77} />
      <Talker id="shuttlecock" scene="sports" fact="f-badminton" move="sway" position={[3, 0, -7.2]} fit={0.94} />
      <Talker id="paddle" scene="sports" fact="f-table-tennis" move="sway" position={[4.4, 0, -7.4]} fit={0.94} />
      <Talker id="curling-stone" scene="sports" fact="f-curling" move="breathe" position={[5.8, 0, -7]} fit={0.94} />
      <Talker id="cricket-bat" scene="sports" fact="f-cricket" move="sway" position={[7, 0, -6.2]} fit={0.94} />
    </>
  );
}

// ---------------------------------------------------------------- arts

function ArtsDecor() {
  const pots: [string, number][] = [
    ['#e0393e', -5.6],
    ['#f7d531', -4.4],
    ['#2f6fe0', -3.2],
  ];
  return (
    <>
      <Suspense fallback={null}>
        <Nature id="flower_redA" position={[-7.5, 0, -4]} fit={0.8} />
        <Nature id="flower_purpleA" position={[7.5, 0, -4.5]} fit={0.8} />
        <Nature id="plant_bushDetailed" position={[0, 0, -8.6]} fit={1.4} />
      </Suspense>
      {pots.map(([c, x]) => (
        <group key={c} position={[x, 0, -6.4]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.4, 0.35, 0.7, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} envMapIntensity={1.5} />
          </mesh>
          <mesh position={[0, 0.71, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.37, 20]} />
            <meshStandardMaterial color={c} roughness={0.05} envMapIntensity={1.5} />
          </mesh>
        </group>
      ))}
      <Talker id="monarch" scene="arts" fact="f-mix-orange" move="flit" position={[3.4, 1.7, -5.6]} fit={0.5} />
      <Talker id="rose" scene="arts" fact="f-mix-purple" move="sway" position={[6.2, 0, -6.8]} fit={1} />
      <Talker id="tulip" scene="arts" fact="f-mix-green" move="sway" position={[-6.4, 0, -6.4]} fit={1} />
      <Talker id="palette" scene="arts" fact="f-primary" move="sway" position={[-4.4, 1.4, -7.4]} fit={1.1} />
      {/* The Mona Lisa is in the public domain; image comes from Wikimedia Commons */}
      <WikiPicture title="Mona Lisa" position={[4.4, 2.6, -8.2]} width={1.9} height={2.8} />
      {[-7.5, 7.5].map((x, i) => (
        <group key={x} position={[x, 0, 1]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <mesh position={[0, 1.8, 0]}>
            <planeGeometry args={[2, 1.5]} />
            <meshStandardMaterial color={i ? '#8a4fc0' : '#3fae4a'} />
          </mesh>
          <mesh position={[0, 0.9, -0.1]} rotation-x={0.1}>
            <boxGeometry args={[0.1, 1.8, 0.1]} />
            <meshStandardMaterial color="#b98552" />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- people

function LightBeam() {
  const m = useRef<Mesh>(null);
  useFrame((st) => {
    if (m.current) (m.current.material as { opacity: number }).opacity = 0.22 + Math.sin(st.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={m} position={[5.5, 3, -6.5]} rotation-z={0.5}>
      <coneGeometry args={[0.9, 5, 24, 1, true]} />
      <meshBasicMaterial color="#fff4c2" transparent opacity={0.25} depthWrite={false} side={2} />
    </mesh>
  );
}

function PeopleDecor() {
  return (
    <>
      <Talker id="atom" scene="people" fact="f-curie-elements" move="flit" position={[-3.2, 1.5, -7.4]} fit={0.9} />
      <Talker id="lens" scene="people" fact="f-haytham-optics" move="sway" position={[3.2, 0, -7.6]} fit={0.9} />
      <Talker id="flask" scene="people" fact="f-curie-two" move="sway" position={[-5.4, 0, -4.6]} fit={0.8} />
      <Suspense fallback={null}>
        <Nature id="statue_column" position={[-6.8, 0, -7]} fit={3.4} />
        <Nature id="statue_column" position={[6.8, 0, -7]} fit={3.4} />
        <Nature id="plant_bushDetailed" position={[-8, 0, 3]} fit={1.4} />
        <Nature id="plant_bushDetailed" position={[8, 0, 3]} fit={1.4} />
      </Suspense>
      <WikiPicture title="Marie Curie" position={[-4, 2.6, -8.2]} width={1.8} height={2.4} />
      <WikiPicture title="Ibn al-Haytham" position={[4, 2.6, -8.2]} width={1.8} height={2.4} />
      <LightBeam />
      {[-7, 7].map((x) => (
        <group key={x} position={[x, 0, -2]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.5, 0.6, 1.2, 16]} />
            <meshStandardMaterial color="#f2efe9" roughness={0.2} envMapIntensity={1.5} />
          </mesh>
          <Model id={x < 0 ? 'flask' : 'lens'} position={[0, 1.2, 0]} fit={0.9} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- social

const DIRS: Record<Lang, [string, string, string, string]> = {
  en: ['N', 'E', 'S', 'W'],
  fr: ['N', 'E', 'S', 'O'],
  ar: ['ش', 'ق', 'ج', 'غ'],
};

function CompassRose() {
  const lang = useApp((s) => s.lang);
  const shape = useMemo(() => {
    const s = new Shape();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 0.35 : i % 4 ? 1.2 : 2;
      const a = (i / 16) * Math.PI * 2;
      if (i === 0) s.moveTo(Math.sin(a) * r, Math.cos(a) * r);
      else s.lineTo(Math.sin(a) * r, Math.cos(a) * r);
    }
    s.closePath();
    return s;
  }, []);
  const d = DIRS[lang];
  // North points to -Z (straight ahead when you enter the room)
  const pos: [number, number][] = [
    [0, -2.5],
    [2.5, 0],
    [0, 2.5],
    [-2.5, 0],
  ];
  return (
    <group position={[-4, 0.03, -6.8]}>
      <mesh rotation-x={-Math.PI / 2}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#2f6fe0" />
      </mesh>
      {pos.map(([x, z], i) => (
        <Html key={i} position={[x, 0.3, z]} center zIndexRange={[5, 0]}>
          <div className="plaque small">{d[i]}</div>
        </Html>
      ))}
    </group>
  );
}

function SocialDecor() {
  return (
    <>
      <Suspense fallback={null}>
        <Nature id="sign" position={[1.5, 0, -6.8]} fit={1.5} rotation-y={-0.3} />
        <Nature id="fence_simple" position={[-8, 0, -1]} fit={2} rotation-y={Math.PI / 2} />
        <Nature id="fence_simple" position={[8, 0, -1]} fit={2} rotation-y={Math.PI / 2} />
        <Nature id="flower_yellowA" position={[5, 0, 3]} fit={0.6} />
      </Suspense>
      <CompassRose />
      <Talker id="sunflower" scene="social" fact="f-sun-east" move="sway" position={[7, 0, -4]} fit={2} />
      <Talker id="globe" scene="social" fact="f-map-key" move="sway" position={[-3.6, 0, -8]} fit={1.2} />
      <Talker id="compass" scene="social" fact="f-compass-north" move="sway" position={[-6.8, 0, -5]} fit={1.1} />
      <Talker id="scroll" scene="social" fact="f-caesar" move="sway" position={[-1.5, 0, -8]} fit={1.36} />
      <Talker id="scroll" scene="social" fact="f-earth-magnet" move="sway" position={[4, 0, -7]} fit={1.27} />
      <Talker id="lock" scene="social" fact="f-shift-cipher" move="breathe" position={[5.8, 0, -6.4]} fit={0.94} />
      <RoundTree position={[8, 0, 3.6]} scale={0.9} />
      <RoundTree position={[-7.2, 0, 2.5]} scale={0.8} color="#6fd35a" />
    </>
  );
}

// ---------------------------------------------------------------- registry

export const THEMES: Record<Exclude<CategoryId, 'animals' | 'ocean'>, MiniTheme> = {
  science: {
    floor: '#ffd6de', rim: '#ff8fa8', wall: '#ffe4ea', bubble: '#ffe0e6', hotspotColor: '#ffd1dc',
    sky: { top: '#ff8fa8', horizon: '#ffe8ee', bottom: '#ffc2cf' },
    lights: { sky: '#fff0f3', ground: '#ff9fb2', keyLight: '#fff0f0' },
    Decor: ScienceDecor,
  },
  history: {
    floor: '#ecd8a8', rim: '#c9a25a', wall: '#fff2d6', hotspotColor: '#ffe9b8',
    sky: { top: '#f59b52', horizon: '#ffe6c2', bottom: '#d9c28f' },
    lights: { sky: '#fff1dc', ground: '#c9a25a', keyLight: '#ffd9a8' },
    Decor: HistoryDecor,
  },
  reading: {
    floor: '#ecd2a8', rim: '#b98552', wall: '#e8f1ff', hotspotColor: '#c6e5ff',
    sky: { top: '#6f8cff', horizon: '#eef2ff', bottom: '#d6c8ff' },
    Decor: ReadingDecor,
  },
  places: {
    floor: '#c8f0ff', rim: '#2fc5c0', wall: '#e0fbff', hotspotColor: '#bff5f2',
    sky: { top: '#2aa6e6', horizon: '#e6fbff', bottom: '#aee8d8' },
    Decor: PlacesDecor,
  },
  games: {
    floor: '#1f3a66', rim: '#ff5ac8', wall: '#b9c9ff', bubble: '#ffd0f0', hotspotColor: '#ffd0f0',
    sky: { top: '#3a2a8a', horizon: '#8fd6ff', bottom: '#2a4a8a' },
    lights: { sky: '#dcd6ff', ground: '#3a4a8a', keyLight: '#ffffff', intensity: 1.1 },
    Decor: GamesDecor,
  },
  sports: {
    floor: '#6fd35a', rim: '#ffffff', wall: '#e8ffe0', hotspotColor: '#ffe2b8',
    sky: { top: '#2aa6e6', horizon: '#eaf8ff', bottom: '#9fe487' },
    Decor: SportsDecor,
  },
  arts: {
    floor: '#fff7ec', rim: '#b46cff', wall: '#f6ecff', bubble: '#f1e2ff', hotspotColor: '#e6ccff',
    sky: { top: '#b46cff', horizon: '#fff4fb', bottom: '#ffd6ec' },
    Decor: ArtsDecor,
  },
  people: {
    floor: '#f2efe9', rim: '#ff8a5c', wall: '#fff3ec', hotspotColor: '#ffd6c4',
    sky: { top: '#ff9f6b', horizon: '#fff6ef', bottom: '#ffe0c9' },
    Decor: PeopleDecor,
  },
  social: {
    floor: '#e8f5d6', rim: '#5b8cff', wall: '#e6ecff', hotspotColor: '#d0ddff',
    sky: { top: '#5b8cff', horizon: '#eef3ff', bottom: '#cfeebd' },
    Decor: SocialDecor,
  },
};
