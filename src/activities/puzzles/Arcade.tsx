import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, Shovel } from 'lucide-react';
import type { ArcadePuzzle, Lang } from '../../types/content';
import { sfx } from '../../audio/sfx';
import { seeded, type PuzzleProps } from './types';
import { Html, Line, Stars } from '@react-three/drei';
import { DoubleSide } from 'three';
import { AcaciaTree, PineTree, Rock } from '../../three/props';
import { BODY_PARTS, useBodyShots, type BodyPart } from './sprites';
import {
  Blades,
  Board3D,
  Candle,
  Chest,
  Chrysalis,
  Floor,
  Germ,
  GroundStrip,
  Hive,
  Leaf,
  Meadow,
  Pin,
  PondFloor,
  Pterosaur,
  Racket,
  RedCell,
  River,
  RockColumn,
  SeaFloor,
  Thing,
  Tint,
  Moth,
  WhiteCell,
  m,
  side,
  top,
} from './Board3D';

/**
 * Games you play with your hands instead of answering a question. Each one
 * acts out a fact from its card: a whale gulps krill, a bee carries pollen,
 * a brush uncovers a fossil. The instruction line comes from the content file.
 */
type P = PuzzleProps<ArcadePuzzle>;
const W = 400;
const H = 240;

function useLoop(step: (dt: number) => void, on: boolean) {
  const ref = useRef(step);
  ref.current = step;
  useEffect(() => {
    if (!on) return;
    let last = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      ref.current(Math.min(0.05, (now - last) / 1000));
      last = now;
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

/** Pointer position in the 400x240 drawing, whatever size it is on screen. */
const at = (e: RPointerEvent<Element>, w = W, h = H) => {
  const r = e.currentTarget.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * w,
    y: ((e.clientY - r.top) / r.height) * h,
  };
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const Score = ({ n, of }: { n: number; of: number }) => (
  <p className="arcade-score" dir="ltr">
    {Math.min(n, of)} / {of}
  </p>
);

/** Dev builds only: lets the automated play tests read a game's state. */
const devState = (st: object) => {
  if (import.meta.env.DEV) (window as unknown as { __game?: object }).__game = st;
};

/** Keys 1 to n press the matching cell or pad, for players without a mouse. */
function useNumberKeys(n: number, act: (i: number) => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const k = Number(e.key);
      if (k >= 1 && k <= n) act(k - 1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
}

// ---------- swim and eat: the whale and the tadpole share this ----------
function Swim({
  onSolved,
  onWrong,
  cls,
  hero,
  good,
  bad,
  scenery,
  mouth = 26,
}: P & {
  mouth?: number;
  cls: string;
  hero: (got: number) => ReactNode;
  good: ReactNode;
  bad: ReactNode;
  scenery: ReactNode;
}) {
  const GOAL = 12;
  const g = useRef({
    x: 90,
    y: 120,
    tx: 90,
    ty: 120,
    items: [] as {
      x: number;
      y: number;
      v: number;
      bad: boolean;
      id: number;
    }[],
    next: 0,
    n: 0,
    got: 0,
    ouch: 0,
    won: false,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    s.x += (s.tx - s.x) * Math.min(1, dt * 6);
    s.y += (s.ty - s.y) * Math.min(1, dt * 6);
    s.ouch = Math.max(0, s.ouch - dt);
    s.next -= dt;
    if (s.next <= 0) {
      s.next = 0.42;
      s.items.push({
        x: W + 10,
        y: 22 + Math.random() * (H - 44),
        v: 60 + Math.random() * 50,
        bad: Math.random() < 0.2,
        id: s.n++,
      });
    }
    s.items = s.items.filter((it) => {
      it.x -= it.v * dt;
      if (it.x < -20) return false;
      // the mouth is at the front of the whale
      if (Math.hypot(it.x - (s.x + mouth), it.y - s.y) > 22) return true;
      if (it.bad) {
        s.ouch = 0.5;
        sfx('wrong');
        onWrong();
      } else {
        s.got++;
        sfx('pop');
      }
      return false;
    });
    if (s.got >= GOAL && !s.won) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  const t = performance.now() / 1000;
  return (
    <div className="arcade">
      <Score n={s.got} of={GOAL} />
      <Board3D view="side" className={cls} onPoint={(p) => Object.assign(s, { tx: p.x - mouth, ty: p.y })}>
        {scenery}
        {s.items.map((it) => (
          <group key={it.id} position={side(it.x, it.y)} rotation={[0, 0, Math.sin(t * 3 + it.id) * 0.3]}>
            {it.bad ? bad : good}
          </group>
        ))}
        <group position={side(s.x, s.y)} rotation={[0, Math.PI / 2, s.ouch ? Math.sin(t * 40) * 0.15 : Math.sin(t * 2) * 0.05]}>
          {hero(s.got)}
        </group>
      </Board3D>
    </div>
  );
}

const KrillGulp = (p: P) => (
  <Swim
    {...p}
    cls="sea"
    mouth={50}
    scenery={<SeaFloor />}
    good={
      <group rotation={[0, 0, 0.3]} scale={2}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.1, 0.36, 4, 8]} />
          <meshStandardMaterial color="#ff8a70" roughness={0.4} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.22, 6]} />
          <meshStandardMaterial color="#ff6f55" />
        </mesh>
      </group>
    }
    bad={
      <group rotation={[0, 0, 0.4]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.75, 14]} />
          <meshStandardMaterial color="#d8eef2" transparent opacity={0.6} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.18, 10]} />
          <meshStandardMaterial color="#e5533d" />
        </mesh>
      </group>
    }
    hero={() => (
      <group position={[0, -0.9, 0]}>
        <Thing id="whale" fit={6.6} />
      </group>
    )}
  />
);

// A tadpole changes as it eats: tadpole, then froglet with legs and a short tail, then frog.
const Tadpole = (p: P) => (
  <Swim
    {...p}
    cls="pond"
    mouth={18}
    scenery={<PondFloor />}
    good={
      <>
        <mesh>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color="#5fae3d" roughness={0.8} />
        </mesh>
        <mesh position={[0.18, 0.12, 0]}>
          <icosahedronGeometry args={[0.13, 1]} />
          <meshStandardMaterial color="#7cc653" roughness={0.8} />
        </mesh>
      </>
    }
    bad={<Thing id="fish" fit={1.7} rotation={[0, Math.PI / 2, 0]} position={[0, -0.4, 0]} />}
    hero={(got) => {
      const stage = Math.min(4, Math.floor(got / 3));
      return <Thing id={stage < 2 ? 'tadpole' : stage < 4 ? 'froglet' : 'frog'} fit={2.2 + stage * 0.3} position={[0, -0.5, 0]} />;
    }}
  />
);

// ---------- bee: carry pollen between flowers, then fly home ----------
const FLOWERS = [
  { x: 70, y: 78, id: 'rose' },
  { x: 150, y: 168, id: 'daisy' },
  { x: 218, y: 70, id: 'tulip' },
  { x: 290, y: 170, id: 'sunflower' },
  { x: 352, y: 84, id: 'daisy' },
  { x: 76, y: 190, id: 'tulip' },
];
const HIVE = { x: 356, y: 200 };
const BEE_H = 2.8;
function Pollinate({ onSolved }: P) {
  const g = useRef({
    x: 200,
    y: 120,
    tx: 200,
    ty: 120,
    last: -1,
    carrying: false,
    fruit: FLOWERS.map(() => false),
    won: false,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  const all = s.fruit.every(Boolean);
  useLoop((dt) => {
    s.x += (s.tx - s.x) * Math.min(1, dt * 5);
    s.y += (s.ty - s.y) * Math.min(1, dt * 5);
    FLOWERS.forEach((f, i) => {
      if (i === s.last || Math.hypot(f.x - s.x, f.y - s.y) > 20) return;
      // pollen from the flower before lands here, and this flower's pollen comes along
      if (s.carrying && !s.fruit[i]) {
        s.fruit[i] = true;
        sfx('pop');
      }
      s.carrying = true;
      s.last = i;
    });
    if (s.fruit.every(Boolean) && !s.won && Math.hypot(HIVE.x - s.x, HIVE.y - s.y) < 24) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  const t = performance.now() / 1000;
  return (
    <div className="arcade">
      <Score n={s.fruit.filter(Boolean).length} of={FLOWERS.length} />
      <Board3D className="sky" lift={BEE_H} onPoint={(p) => Object.assign(s, { tx: p.x, ty: p.y })}>
        <Meadow grass={700} />
        <Hive position={top(HIVE.x, HIVE.y)} glow={all} />
        {FLOWERS.map((f, i) => (
          <group key={i}>
            <Thing id={f.id} fit={3.2} position={top(f.x, f.y)} />
            {s.fruit[i] && (
              <mesh position={top(f.x + 16, f.y + 10, 0.35)}>
                <sphereGeometry args={[0.34, 18, 14]} />
                <meshStandardMaterial color="#e5533d" roughness={0.3} />
              </mesh>
            )}
          </group>
        ))}
        <group position={top(s.x, s.y, BEE_H + Math.sin(t * 7) * 0.08)} rotation={[0, Math.atan2(s.tx - s.x, s.ty - s.y || 0.001), 0]}>
          <Thing id="bee" fit={1.6} />
          {s.carrying && (
            <mesh position={[0, 0.05, 0]}>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshStandardMaterial color="#f5b700" />
            </mesh>
          )}
        </group>
      </Board3D>
    </div>
  );
}

// ---------- fossil: brush the rock away ----------
function FossilDig({ onSolved }: P) {
  const cv = useRef<HTMLCanvasElement>(null);
  const seen = useRef(new Set<number>());
  const [pct, setPct] = useState(0);
  const done = pct >= 1;
  useEffect(() => {
    const c = cv.current!.getContext('2d')!;
    c.fillStyle = '#b08a5e';
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = i % 2 ? '#9c774d' : '#c5a076';
      c.fillRect(Math.random() * W, Math.random() * H, 4, 2);
    }
  }, []);
  const brush = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (done) return;
    const { x, y } = at(e);
    const c = cv.current!.getContext('2d')!;
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(x, y, 18, 0, Math.PI * 2);
    c.fill();
    seen.current.add(Math.floor(x / 25) + Math.floor(y / 24) * 16);
    // 16 x 10 squares; three quarters brushed is clean enough
    const p = Math.min(1, seen.current.size / (160 * 0.75));
    setPct(p);
    if (p >= 1) {
      c.clearRect(0, 0, W, H);
      onSolved();
    }
  };
  return (
    <div className="arcade">
      <progress className="arcade-bar" value={pct} max={1} />
      <div className="arcade-board dig">
        <img src="./images/art/trex-skeleton.jpg" alt="" className="fossil" />
        <canvas ref={cv} width={W} height={H} onPointerMove={brush} onPointerDown={brush} />
      </div>
    </div>
  );
}

// ---------- tortoise and hare: steady taps win ----------
const offTrack = (_x: number, z: number) => Math.abs(z - top(0, 96)[2]) > 1.4 && Math.abs(z - top(0, 164)[2]) > 1.4;
function SteadyRace({ puzzle, lang, onSolved, onWrong }: P) {
  const STEPS = 14;
  const [steps, setSteps] = useState(0);
  const [trip, setTrip] = useState(false);
  const [t, setT] = useState(0);
  const last = useRef(0);
  const done = steps >= STEPS;
  useLoop((dt) => setT((v) => v + dt), !done);
  const tap = () => {
    if (done) return;
    const now = performance.now();
    const fast = last.current && now - last.current < 380;
    last.current = now;
    if (fast) {
      setTrip(true);
      window.setTimeout(() => setTrip(false), 350);
      sfx('wrong');
      return onWrong();
    }
    sfx('pop');
    setSteps(steps + 1);
    if (steps + 1 === STEPS) onSolved();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      tap();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // the hare sprints most of the way, then lies down for a nap
  const hare = 30 + Math.min(0.72, t * 0.3) * 320;
  const napping = t > 2.4;
  const tort = 30 + (steps / STEPS) * 320;
  return (
    <div className="arcade">
      <Score n={steps} of={STEPS} />
      <Board3D className="sky" onDown={tap}>
        <Meadow grass={500} keep={offTrack} />
        {[96, 164].map((y) => (
          <mesh key={y} position={top(200, y, 0.01)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ ground: true }}>
            <planeGeometry args={[22, 2.6]} />
            <meshStandardMaterial color="#c9a46a" roughness={1} />
          </mesh>
        ))}
        <mesh position={top(352, 130, 0.02)} rotation={[-Math.PI / 2, 0, 0]} userData={{ ground: true }}>
          <planeGeometry args={[0.3, 6.6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Thing id="finish-flag" fit={2.6} position={top(366, 60)} />
        <group position={top(hare, 96)} rotation={[napping ? 1.35 : 0, Math.PI / 2, 0]}>
          <Thing id="rabbit" fit={1.9} />
        </group>
        {napping && (
          <Html position={top(hare + 16, 80, 2.4)} center>
            <span className="arcade-tag">z z z</span>
          </Html>
        )}
        <group position={top(tort, 164)} rotation={[trip ? 0.35 : 0, Math.PI / 2, 0]}>
          <Thing id="tortoise" fit={1.9} />
        </group>
      </Board3D>
      <button type="button" className={`btn go arcade-tap${trip ? ' shake' : ''}`} onClick={tap} aria-label={puzzle.prompt[lang as Lang]} disabled={done}>
        <Footprints className="i" />
      </button>
    </div>
  );
}

// ---------- badminton: keep the shuttlecock up ----------
function KeepUp({ onSolved, onWrong }: P) {
  const GOAL = 10;
  const g = useRef({
    x: 200,
    y: 30,
    vx: 30,
    vy: 0,
    rx: 200,
    hits: 0,
    won: false,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    s.vy = Math.min(170, s.vy + 300 * dt); // feathers slow the fall
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < 10 || s.x > W - 10) s.vx = -s.vx;
    s.x = clamp(s.x, 10, W - 10);
    if (s.vy > 0 && s.y > 196 && s.y < 212 && Math.abs(s.x - s.rx) < 34) {
      s.vy = -250;
      s.vx = (s.x - s.rx) * 4;
      s.hits++;
      sfx('pop');
    }
    if (s.y > H + 12) {
      Object.assign(s, { x: 200, y: 20, vx: 0, vy: 0 });
      sfx('wrong');
      onWrong();
    }
    if (s.hits >= GOAL && !s.won) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  return (
    <div className="arcade">
      <Score n={s.hits} of={GOAL} />
      <Board3D view="side" className="court" onPoint={(p) => (s.rx = clamp(p.x, 30, W - 30))}>
        <GroundStrip y={-6.3} color="#4f9a64" depth={10} />
        <mesh position={[0, -6.28, 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 0.12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, -4.6, -1.5]}>
          <boxGeometry args={[0.12, 3.4, 0.12]} />
          <meshStandardMaterial color="#e8edf5" />
        </mesh>
        <mesh position={[0, -4.3, -1.5]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[6, 1.6, 12, 4]} />
          <meshStandardMaterial color="#ffffff" wireframe transparent opacity={0.6} />
        </mesh>
        <group position={side(s.x, s.y)} rotation={[0, 0, Math.atan2(-s.vy, s.vx) + Math.PI / 2]}>
          <Thing id="shuttlecock" fit={1.3} position={[0, -0.6, 0]} />
        </group>
        <Racket position={side(s.rx, 210)} />
      </Board3D>
    </div>
  );
}

// ---------- octopus: change colour until it disappears ----------
const ROCKS = [
  { h: 38, l: 62 },
  { h: 8, l: 55 },
  { h: 150, l: 38 },
  { h: 275, l: 45 },
  { h: 205, l: 30 },
];
const STONES: [number, number, number][] = [
  [40, 40, 1.6],
  [120, 205, 2],
  [330, 40, 1.8],
  [365, 190, 2.2],
  [70, 150, 1.2],
  [290, 215, 1.3],
  [25, 222, 1.5],
];
function Camouflage({ seed, onSolved }: P) {
  const { t } = useTranslation();
  const rounds = useMemo(() => seeded(ROCKS, seed).slice(0, 3), [seed]);
  const [round, setRound] = useState(0);
  const [h, setH] = useState(200);
  const [l, setL] = useState(70);
  const target = rounds[Math.min(round, 2)];
  const dh = Math.abs(((h - target.h + 540) % 360) - 180);
  const hidden = dh < 14 && Math.abs(l - target.l) < 8;
  useEffect(() => {
    if (!hidden || round > 2) return;
    sfx('pop');
    const id = window.setTimeout(() => {
      if (round === 2) onSolved();
      setRound((r) => r + 1);
    }, 1100);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, round]);
  const skin = `hsl(${h}, 45%, ${l}%)`;
  const ground = `hsl(${target.h}, 45%, ${target.l}%)`;
  return (
    <div className="arcade">
      <Score n={round} of={3} />
      <Board3D>
        <Floor color={ground} />
        {STONES.map(([x, y, k], i) => (
          <Rock key={i} position={top(x, y, 0.3 * k)} scale={k} color={`hsl(${target.h}, 40%, ${target.l + (i % 2 ? 6 : -6)}%)`} />
        ))}
        <Tint color={skin}>
          <Thing id="octopus" fit={6} position={top(200, 120)} />
        </Tint>
      </Board3D>
      <div className="arcade-sliders" dir="ltr">
        <input type="range" className="hue" min={0} max={359} value={h} onChange={(e) => setH(+e.target.value)} aria-label={t('arcade.colour')} />
        <input type="range" className="light" min={15} max={85} value={l} onChange={(e) => setL(+e.target.value)} aria-label={t('arcade.light')} />
      </div>
    </div>
  );
}

// ---------- treasure: follow compass clues on a map ----------
type Dir = 'N' | 'E' | 'S' | 'W';
const LETTER: Record<Lang, Record<Dir, string>> = {
  en: { N: 'N', E: 'E', S: 'S', W: 'W' },
  fr: { N: 'N', E: 'E', S: 'S', W: 'O' },
  ar: { N: 'ش', E: 'ق', S: 'ج', W: 'غ' },
};
const MOVE: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};
const ICON = { N: ArrowUp, E: ArrowRight, S: ArrowDown, W: ArrowLeft };
const START: [number, number] = [4, 2];
const ROUTES: [Dir, number][][] = [
  [
    ['N', 2],
    ['E', 3],
    ['S', 1],
  ],
  [
    ['W', 3],
    ['S', 2],
    ['E', 1],
  ],
  [
    ['E', 2],
    ['N', 1],
    ['W', 4],
  ],
  [
    ['S', 2],
    ['W', 2],
    ['N', 3],
  ],
];
function Treasure({ lang, seed, onSolved, onWrong }: P) {
  const { t } = useTranslation();
  const route = ROUTES[seed % ROUTES.length];
  const goal = route.reduce<[number, number]>(([x, y], [d, n]) => [x + MOVE[d][0] * n, y + MOVE[d][1] * n], START);
  const [path, setPath] = useState<[number, number][]>([START]);
  const [found, setFound] = useState(false);
  const [holes, setHoles] = useState<[number, number][]>([]);
  const here = path[path.length - 1];
  const px = ([x, y]: [number, number]) => [40 + x * 40, 40 + y * 40];
  const go = (d: Dir) => {
    if (found) return;
    const to: [number, number] = [clamp(here[0] + MOVE[d][0], 0, 8), clamp(here[1] + MOVE[d][1], 0, 4)];
    if (to[0] !== here[0] || to[1] !== here[1]) setPath([...path, to]);
  };
  const dig = () => {
    if (here[0] === goal[0] && here[1] === goal[1]) {
      setFound(true);
      return onSolved();
    }
    setHoles([...holes, here]);
    setPath([START]);
    onWrong();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = (
        {
          ArrowUp: 'N',
          ArrowRight: 'E',
          ArrowDown: 'S',
          ArrowLeft: 'W',
        } as Record<string, Dir>
      )[e.key];
      if (!d) return;
      e.preventDefault();
      go(d);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <div className="arcade treasure">
      <ol className="arcade-clues" dir="ltr">
        {route.map(([d, n], i) => {
          const I = ICON[d];
          return (
            <li key={i}>
              <I className="i" /> {LETTER[lang][d]} × {n}
            </li>
          );
        })}
      </ol>
      <Board3D className="sky">
        <Floor color="#e6d29c" />
        {Array.from({ length: 45 }, (_, i) => (
          <mesh key={i} position={top(40 + (i % 9) * 40, 40 + Math.floor(i / 9) * 40, 0.04)} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshStandardMaterial color="#a88a58" />
          </mesh>
        ))}
        <River />
        <PineTree position={top(296, 52)} scale={0.55} />
        <PineTree position={top(318, 66)} scale={0.45} />
        <Rock position={top(40, 210, 0.2)} scale={0.7} color="#a39880" />
        <Thing id="compass" fit={1.5} position={top(366, 26, 0.1)} />
        <Html position={top(366, 6, 0.4)} center>
          <span className="arcade-tag">{LETTER[lang].N}</span>
        </Html>
        {holes.map((h, i) => (
          <group key={i} position={top(px(h)[0], px(h)[1], 0.02)}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.5, 20]} />
              <meshStandardMaterial color="#5a4022" />
            </mesh>
            <mesh position={[0.55, 0.08, 0.2]} scale={[1, 0.4, 0.8]}>
              <sphereGeometry args={[0.32, 12, 8]} />
              <meshStandardMaterial color="#9a7a48" />
            </mesh>
          </group>
        ))}
        <Line points={path.map((p) => top(px(p)[0], px(p)[1], 0.06))} color="#e5533d" lineWidth={4} dashed dashSize={0.25} gapSize={0.2} />
        <group position={top(px(START)[0], px(START)[1])}>
          <mesh position={[-0.35, 0.6, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#5a3a12" />
          </mesh>
          <mesh position={[-0.05, 1.0, 0]}>
            <boxGeometry args={[0.6, 0.36, 0.04]} />
            <meshStandardMaterial color="#e5533d" />
          </mesh>
        </group>
        {found ? <Chest position={top(px(goal)[0], px(goal)[1])} /> : <Pin position={top(px(here)[0], px(here)[1])} />}
      </Board3D>
      <div className="arcade-pad" dir="ltr">
        {(['N', 'W', 'E', 'S'] as Dir[]).map((d) => {
          const I = ICON[d];
          return (
            <button key={d} type="button" className={`ibtn pad-${d}`} onClick={() => go(d)} aria-label={LETTER[lang][d]}>
              <I className="i" />
            </button>
          );
        })}
        <button type="button" className="btn go pad-dig" onClick={dig} disabled={found}>
          <Shovel className="i" /> {t('card.check')}
        </button>
      </div>
    </div>
  );
}

// ---------- dark room: light through a tiny hole flips the picture ----------
function Pinhole({ seed, onSolved }: P) {
  const targets = useMemo(() => seeded([66, 172, 94, 150], seed).slice(0, 3), [seed]);
  const [round, setRound] = useState(0);
  const [y, setY] = useState(120);
  const img = 240 - y; // same distance each side of the hole, so the picture is the same size, upside down
  const target = targets[Math.min(round, 2)];
  const on = Math.abs(img - target) < 8;
  useEffect(() => {
    if (!on || round > 2) return;
    sfx('pop');
    const id = window.setTimeout(() => {
      if (round === 2) onSolved();
      setRound((r) => r + 1);
    }, 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, round]);
  return (
    <div className="arcade">
      <Score n={round} of={3} />
      <Board3D view="side" className="dark" onPoint={(p) => setY(clamp(p.y, 42, 198))}>
        <mesh position={side(200, 58)}>
          <boxGeometry args={[0.35, 5.8, 3]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        <mesh position={side(200, 182)}>
          <boxGeometry args={[0.35, 5.8, 3]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        <mesh position={side(330, 120, -0.6)}>
          <boxGeometry args={[2.8, 11.4, 0.1]} />
          <meshStandardMaterial color="#5d6678" roughness={0.8} />
        </mesh>
        <Line points={[side(70, y - 28, 0.3), side(330, 240 - (y - 28), 0.3)]} color="#ffb300" lineWidth={2} transparent opacity={0.85} />
        <Line points={[side(70, y + 25, 0.3), side(330, 240 - (y + 25), 0.3)]} color="#ffb300" lineWidth={2} transparent opacity={0.85} />
        <Candle position={side(70, y)} />
        <pointLight position={side(70, y - 26, 0.6)} color="#ffc23a" intensity={6} distance={7} />
        <mesh position={side(200, 120, 0.3)}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
        </mesh>
        <Candle position={side(330, target, 0.1)} flip ghost />
        <Candle position={side(330, img, 0.15)} flip dim={!on} />
      </Board3D>
    </div>
  );
}

// ---------- painting: swap the pieces back ----------
function Jigsaw({ seed, onSolved }: P) {
  const COLS = 3;
  const ROWS = 4;
  const start = useMemo(() => {
    const ids = Array.from({ length: COLS * ROWS }, (_, i) => i);
    const mixed = seeded(ids, seed + 3);
    return mixed.every((v, i) => v === i) ? ids.reverse() : mixed;
  }, [seed]);
  const [order, setOrder] = useState(start);
  const [pick, setPick] = useState<number | null>(null);
  const solved = order.every((v, i) => v === i);
  const tap = (i: number) => {
    if (solved) return;
    if (pick === null) return setPick(i);
    const next = [...order];
    [next[i], next[pick]] = [next[pick], next[i]];
    setPick(null);
    setOrder(next);
    sfx('pop');
    if (next.every((v, k) => v === k)) onSolved();
  };
  return (
    <div className="arcade">
      <Score n={order.filter((v, i) => v === i).length} of={COLS * ROWS} />
      <div className={`jigsaw${solved ? ' done' : ''}`} dir="ltr">
        {order.map((piece, i) => (
          <button
            key={i}
            type="button"
            className={pick === i ? 'on' : ''}
            aria-label={`${i + 1}`}
            onClick={() => tap(i)}
            style={{
              backgroundPosition: `${((piece % COLS) / (COLS - 1)) * 100}% ${(Math.floor(piece / COLS) / (ROWS - 1)) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- lioness: creep while the zebra grazes, freeze when it looks ----------
const tallGrass = (i: number): [number, number] => [((i * 0.6180339) % 1) * 26 - 13, 1.6 + ((i * 0.7548776) % 1) * 2.4];
function Stalk({ onSolved, onWrong }: P) {
  const g = useRef({
    x: 30,
    hold: false,
    phase: 'graze' as 'graze' | 'warn' | 'look',
    left: 2.2,
    won: false,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    s.left -= dt;
    if (s.left <= 0) {
      s.phase = s.phase === 'graze' ? 'warn' : s.phase === 'warn' ? 'look' : 'graze';
      s.left = s.phase === 'graze' ? 1.6 + Math.random() * 1.6 : s.phase === 'warn' ? 0.6 : 1.3;
    }
    if (s.hold) {
      if (s.phase === 'look') {
        // spotted: slink back and wait for the next chance
        s.x = Math.max(30, s.x - 90);
        s.hold = false;
        sfx('wrong');
        onWrong();
      } else s.x += 46 * dt;
    }
    if (s.x >= 285 && !s.won) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      s.hold = e.type === 'keydown';
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
    };
  }, [s]);
  const step = s.hold && s.phase !== 'look' ? Math.sin(performance.now() / 90) * 0.06 : 0;
  return (
    <div className="arcade">
      <progress className="arcade-bar" value={(s.x - 30) / 255} max={1} />
      <Board3D view="side" className="savanna" onDown={() => (s.hold = true)} onUp={() => (s.hold = false)}>
        <GroundStrip y={-2.5} color="#c9a94f" depth={14} />
        <AcaciaTree position={[-7, -2.5, -5]} scale={1.3} />
        <AcaciaTree position={[9.5, -2.5, -6]} scale={1} />
        <group position={side(335, 170, -1)} rotation={[0, s.phase === 'look' ? -Math.PI / 2 : Math.PI / 2 - 0.3, 0]}>
          <Thing id="zebra" fit={4.2} />
        </group>
        {s.phase !== 'graze' && (
          <Html position={side(335, 40)} center>
            <span className={`arcade-tag alert${s.phase === 'look' ? ' look' : ''}`}>!</span>
          </Html>
        )}
        <group position={side(s.x, 170, 1)} rotation={[0, Math.PI / 2, step]}>
          <Thing id="lion" fit={3.9} />
        </group>
        <group position={[0, -2.5, 0]}>
          <Blades count={420} height={1.5} color="#b8b04a" area={tallGrass} />
        </group>
      </Board3D>
    </div>
  );
}

// ---------- sunflower: face the sun to grow ----------
function SunTrack({ lang, onSolved }: P) {
  const NEED = 11;
  const g = useRef({ t: 0, px: 320, grown: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  const DAY = 8;
  const day = s.t % (DAY + 2);
  const night = day > DAY;
  // east is on the right, like on a map: the sun rises there and sets in the west
  const k = Math.min(1, day / DAY);
  const sun = { x: 360 - k * 320, y: 150 - Math.sin(k * Math.PI) * 120 };
  const facing = !night && Math.abs(s.px - sun.x) < 42;
  useLoop((dt) => {
    s.t += dt;
    if (facing) s.grown += dt;
    if (s.grown >= NEED && !s.won) {
      s.won = true;
      s.px = 360;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  const tall = 60 + (Math.min(s.grown, NEED) / NEED) * 120;
  const lean = clamp((s.px - 200) / 160, -1, 1);
  return (
    <div className="arcade">
      <progress className="arcade-bar" value={s.grown / NEED} max={1} />
      <Board3D view="side" className={night ? 'night' : 'day'} onPoint={(p) => !s.won && (s.px = p.x)}>
        <GroundStrip y={-4.1} color="#7cc455" depth={10} />
        <group position={[0, -4.1, 0]}>
          <Blades count={260} height={0.6} area={(i) => [((i * 0.618) % 1) * 26 - 13, ((i * 0.7549) % 1) * 4 - 1]} />
        </group>
        {!night && (
          <group position={side(sun.x, sun.y, -2)}>
            <mesh>
              <sphereGeometry args={[0.95, 24, 16]} />
              <meshBasicMaterial color="#ffd24a" toneMapped={false} />
            </mesh>
            <pointLight intensity={30} distance={30} color="#fff1c2" />
          </group>
        )}
        <Html position={side(384, 196, 1)} center>
          <span className="arcade-tag">{LETTER[lang].E}</span>
        </Html>
        <Html position={side(16, 196, 1)} center>
          <span className="arcade-tag">{LETTER[lang].W}</span>
        </Html>
        <group position={side(200, 202)} rotation={[0, lean * 0.9, -lean * 0.25]}>
          <Thing id="sunflower" fit={m(tall)} />
        </group>
      </Board3D>
    </div>
  );
}

// ---------- x-ray: look inside the scanned body and find an organ ----------
function Xray({ seed, onSolved, onWrong }: P) {
  const shots = useBodyShots();
  const order = useMemo(() => seeded([...BODY_PARTS] as BodyPart[], seed), [seed]);
  const [found, setFound] = useState(0);
  const [lens, setLens] = useState({ x: 160, y: 250 });
  const S = 320;
  if (!shots) return <p className="muted">…</p>;
  const want = order[Math.min(found, 3)];
  const spot = (k: BodyPart) => [shots.at[k][0] * S, shots.at[k][1] * S];
  const tap = (e: RPointerEvent<SVGSVGElement>) => {
    const p = at(e, S, S);
    setLens(p);
    if (found > 3) return;
    const [x, y] = spot(want);
    if (Math.hypot(p.x - x, p.y - y) > 26) return onWrong();
    sfx('pop');
    if (found === 3) onSolved();
    setFound(found + 1);
  };
  return (
    <div className="arcade xray">
      <div className="xray-want">
        <img src={shots.icon[want]} alt="" />
        <Score n={found} of={4} />
      </div>
      <svg viewBox={`0 0 ${S} ${S}`} className="arcade-board tall" onPointerMove={(e) => setLens(at(e, S, S))} onPointerDown={tap}>
        <defs>
          <clipPath id="xray-lens">
            <circle cx={lens.x} cy={lens.y} r="46" />
          </clipPath>
        </defs>
        <rect width={S} height={S} fill="#dff1fb" />
        <image href={shots.skin} width={S} height={S} />
        <g clipPath="url(#xray-lens)">
          <rect width={S} height={S} fill="#0f1a2e" />
          <image href={shots.skin} width={S} height={S} opacity="0.16" />
          <image href={shots.inside} width={S} height={S} />
        </g>
        <circle cx={lens.x} cy={lens.y} r="46" fill="none" stroke="#2f7fd0" strokeWidth="3" />
        {order.slice(0, found).map((k) => (
          <circle key={k} cx={spot(k)[0]} cy={spot(k)[1]} r="16" fill="none" stroke="#3fb950" strokeWidth="2.5" />
        ))}
      </svg>
    </div>
  );
}

// ---------- debugging: tap the bugs crawling over the computer ----------
const TRACES: Pt[][] = [
  [
    [0, 40],
    [120, 40],
    [120, 110],
    [260, 110],
    [260, 60],
    [400, 60],
  ],
  [
    [60, 240],
    [60, 170],
    [200, 170],
    [200, 200],
    [330, 200],
    [330, 130],
    [400, 130],
  ],
  [
    [140, 0],
    [140, 70],
  ],
  [
    [300, 240],
    [300, 190],
  ],
];
const PADS3D: Pt[] = [
  [120, 110],
  [260, 60],
  [200, 170],
  [330, 130],
  [140, 70],
  [60, 170],
];
function Circuit() {
  return (
    <>
      <Floor color="#1f6b4a" roughness={0.5} />
      {TRACES.flatMap((line, li) =>
        line.slice(1).map(([x, y], i) => {
          const [px, py] = line[i];
          const len = m(Math.hypot(x - px, y - py)) + 0.15;
          return (
            <mesh key={`${li}-${i}`} position={top((x + px) / 2, (y + py) / 2, 0.02)} rotation={[0, x === px ? 0 : Math.PI / 2, 0]}>
              <boxGeometry args={[0.16, 0.04, len]} />
              <meshStandardMaterial color="#d39a45" metalness={0.7} roughness={0.35} />
            </mesh>
          );
        }),
      )}
      {PADS3D.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={top(x, y, 0.04)}>
          <cylinderGeometry args={[0.26, 0.26, 0.06, 16]} />
          <meshStandardMaterial color="#e2c25a" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      {[
        [195, 111, 3.5, 2.3],
        [303, 162, 1.7, 1.2],
      ].map(([x, y, w, d]) => (
        <group key={x} position={top(x, y)}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[w, 0.36, d]} />
            <meshStandardMaterial color="#20262e" roughness={0.45} />
          </mesh>
          {Array.from({ length: Math.round(w * 3) }, (_, i) =>
            [-1, 1].map((sgn) => (
              <mesh key={`${i}${sgn}`} position={[-w / 2 + 0.17 + i / 3, 0.08, sgn * (d / 2 + 0.08)]}>
                <boxGeometry args={[0.08, 0.06, 0.18]} />
                <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </>
  );
}
function BugHunt({ onSolved }: P) {
  const GOAL = 10;
  const mk = (id: number) => ({
    id,
    x: 30 + Math.random() * 340,
    y: 30 + Math.random() * 180,
    a: Math.random() * 6.28,
    v: 45 + Math.random() * 40,
  });
  const g = useRef({ bugs: [0, 1, 2, 3].map(mk), n: 4, got: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    for (const b of s.bugs) {
      b.a += (Math.random() - 0.5) * dt * 5;
      b.x += Math.cos(b.a) * b.v * dt;
      b.y += Math.sin(b.a) * b.v * dt;
      if (b.x < 14 || b.x > W - 14) b.a = Math.PI - b.a;
      if (b.y < 14 || b.y > H - 14) b.a = -b.a;
      b.x = clamp(b.x, 14, W - 14);
      b.y = clamp(b.y, 14, H - 14);
    }
    draw((n) => n + 1);
  }, !s.won);
  const tap = (p: { x: number; y: number }) => {
    const hit = s.bugs.find((b) => Math.hypot(b.x - p.x, b.y - p.y) < 26);
    if (!hit || s.won) return;
    sfx('pop');
    s.got++;
    s.bugs = s.bugs.filter((b) => b !== hit);
    if (s.got >= GOAL) {
      s.won = true;
      s.bugs = [];
      onSolved();
    } else if (s.got + s.bugs.length < GOAL) s.bugs.push(mk(s.n++));
    draw((n) => n + 1);
  };
  const t = performance.now() / 1000;
  return (
    <div className="arcade">
      <Score n={s.got} of={GOAL} />
      <Board3D lift={0.5} onDown={tap}>
        <Circuit />
        {/* the first computer "bug" really was a moth, so these are moth-brown */}
        {s.bugs.map((b) => (
          <group key={b.id} position={top(b.x, b.y, 0.45 + Math.sin(t * 6 + b.id) * 0.08)} rotation={[0, Math.atan2(Math.cos(b.a), Math.sin(b.a)), Math.sin(t * 18 + b.id) * 0.2]}>
            <group scale={1.8}>
              <Moth flap={Math.sin(t * 22 + b.id) * 0.35} />
            </group>
          </group>
        ))}
      </Board3D>
    </div>
  );
}

// ---------- writing: join the dots in the order the strokes are written ----------
type Pt = [number, number];
const GLYPHS: Pt[][][] = [
  // the Chinese character for mountain: middle stroke first
  [
    [
      [200, 40],
      [200, 180],
    ],
    [
      [130, 100],
      [130, 180],
      [270, 180],
    ],
    [
      [270, 100],
      [270, 180],
    ],
  ],
  // the Arabic letter ba: the bowl is drawn from right to left, then the dot underneath
  [
    [
      [300, 80],
      [296, 130],
      [250, 150],
      [150, 150],
      [104, 130],
      [100, 80],
    ],
    [[200, 200]],
  ],
  // the Latin letter A: left to right
  [
    [
      [130, 200],
      [200, 40],
      [270, 200],
    ],
    [
      [160, 140],
      [240, 140],
    ],
  ],
];
function Dots({ onSolved }: P) {
  const [round, setRound] = useState(0);
  const [n, setN] = useState(0);
  const glyph = GLYPHS[Math.min(round, 2)];
  const flat = glyph.flat();
  const done = n >= flat.length;
  const reach = (e: RPointerEvent<SVGSVGElement>) => {
    if (done) return;
    const p = at(e);
    if (Math.hypot(flat[n][0] - p.x, flat[n][1] - p.y) > 18) return;
    sfx('click');
    setN(n + 1);
  };
  useEffect(() => {
    if (!done || round > 2) return;
    sfx('pop');
    const id = window.setTimeout(() => {
      if (round === 2) return onSolved();
      setRound(round + 1);
      setN(0);
    }, 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, round]);
  let i = 0;
  return (
    <div className="arcade">
      <Score n={round + (done ? 1 : 0)} of={3} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board paper" onPointerMove={reach} onPointerDown={reach}>
        {glyph.map((stroke, si) => {
          const first = i;
          i += stroke.length;
          const drawn = stroke.slice(0, Math.max(0, n - first));
          return (
            <g key={`${round}-${si}`}>
              <polyline
                points={drawn.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#1d2433"
                strokeWidth={done ? 14 : 8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'stroke-width 0.3s' }}
              />
              {stroke.length === 1 && n > first && <circle cx={stroke[0][0]} cy={stroke[0][1]} r={done ? 9 : 6} fill="#1d2433" />}
              {!done &&
                stroke.map((p, k) => (
                  <g key={k} opacity={first + k < n ? 0.25 : 1}>
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={first + k === n ? 13 : 10}
                      fill={first + k === n ? '#ffd24a' : '#fff'}
                      stroke="#2f7fd0"
                      strokeWidth="2"
                      className={first + k === n ? 'arcade-glow' : ''}
                    />
                    <text x={p[0]} y={p[1] + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#12283d">
                      {first + k + 1}
                    </text>
                  </g>
                ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------- Snake, as a hungry caterpillar that becomes a butterfly ----------
type Cell = [number, number];
const GX = 20;
const GY = 12;
function Caterpillar({ onSolved, onWrong }: P) {
  const GOAL = 8;
  const g = useRef({
    body: [
      [6, 6],
      [5, 6],
      [4, 6],
    ] as Cell[],
    prev: [] as Cell[],
    dir: [1, 0] as Cell,
    next: [1, 0] as Cell,
    leaf: [12, 4] as Cell,
    eaten: 0,
    acc: 0,
    won: false,
    fly: 0,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  const turn = (d: Cell) => {
    if (d[0] === -s.dir[0] && d[1] === -s.dir[1]) return; // no turning back on yourself
    s.next = d;
  };
  useLoop((dt) => {
    if (s.won) {
      s.fly += dt;
      draw((n) => n + 1);
      return;
    }
    s.acc += dt;
    if (s.acc < 0.16) return draw((n) => n + 1);
    s.acc = 0;
    s.dir = s.next;
    s.prev = s.body.map((b) => [...b] as Cell);
    const head: Cell = [(s.body[0][0] + s.dir[0] + GX) % GX, (s.body[0][1] + s.dir[1] + GY) % GY];
    if (s.body.some(([x, y]) => x === head[0] && y === head[1])) {
      // bumped into itself: a little slip, and it shrinks back
      sfx('wrong');
      onWrong();
      s.body = s.body.slice(0, 3);
      draw((n) => n + 1);
      return;
    }
    s.body.unshift(head);
    if (head[0] === s.leaf[0] && head[1] === s.leaf[1]) {
      sfx('pop');
      s.eaten++;
      do s.leaf = [Math.floor(Math.random() * GX), Math.floor(Math.random() * GY)];
      while (s.body.some(([x, y]) => x === s.leaf[0] && y === s.leaf[1]));
      if (s.eaten >= GOAL) {
        s.won = true;
        onSolved();
      }
    } else s.body.pop();
    draw((n) => n + 1);
  }, true);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = (
        {
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
        } as Record<string, Cell>
      )[e.key];
      if (!d) return;
      e.preventDefault();
      turn(d);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const c = (v: number) => v * 20 + 10;
  const [hx, hy] = s.body[0];
  // glide each segment from where it was to where it is, unless it wrapped round the edge
  const k = Math.min(1, s.acc / 0.16);
  const seg = (i: number): [number, number] => {
    const [x, y] = s.body[i];
    const [px, py] = s.prev[i] ?? s.body[i];
    return Math.abs(px - x) + Math.abs(py - y) > 1 ? [c(x), c(y)] : [c(px + (x - px) * k), c(py + (y - py) * k)];
  };
  const t = performance.now() / 1000;
  const [sx, sy] = seg(0);
  const yaw = Math.atan2(s.dir[0], s.dir[1]);
  return (
    <div className="arcade">
      <Score n={s.eaten} of={GOAL} />
      <Board3D
        className="sky"
        onDown={(p) => {
          // tap on a side of the caterpillar to steer that way
          const dx = p.x - c(hx);
          const dy = p.y - c(hy);
          turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
        }}
      >
        <Meadow />
        {!s.won && <Leaf position={top(c(s.leaf[0]), c(s.leaf[1]), Math.sin(t * 3) * 0.05)} spin={t * 0.6} />}
        {s.won ? (
          <>
            <Chrysalis position={top(sx, sy)} scale={Math.max(0.001, 1 - s.fly * 0.6)} />
            <Thing
              id="monarch"
              fit={2.2}
              position={top(sx + (200 - sx) * Math.min(1, s.fly / 2), sy + (110 - sy) * Math.min(1, s.fly / 2), 0.8 + Math.min(1, s.fly / 2) * 2 + Math.sin(t * 3) * 0.2)}
              rotation={[0, t * 0.8, Math.sin(t * 14) * 0.25]}
            />
          </>
        ) : (
          <>
            {s.body.map((_, i) => {
              if (i === 0) return null;
              const [x, y] = seg(i);
              // monarch caterpillars are banded yellow, black and white
              const col = ['#f4f2ea', '#f2cf2a', '#1e1e1e'][i % 3];
              return (
                <mesh key={i} position={top(x, y, 0.42 + Math.sin(t * 9 - i * 0.9) * 0.06)} scale={[1, 0.9, 1]}>
                  <sphereGeometry args={[0.52, 20, 14]} />
                  <meshStandardMaterial color={col} roughness={0.45} />
                </mesh>
              );
            })}
            <group position={top(sx, sy, 0.5)} rotation={[0, yaw, 0]}>
              <mesh>
                <sphereGeometry args={[0.52, 22, 16]} />
                <meshStandardMaterial color="#1e1e1e" roughness={0.4} />
              </mesh>
              {[-0.2, 0.2].map((ex) => (
                <group key={ex}>
                  <mesh position={[ex, 0.16, 0.42]}>
                    <sphereGeometry args={[0.13, 12, 10]} />
                    <meshStandardMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[ex, 0.17, 0.53]}>
                    <sphereGeometry args={[0.065, 10, 8]} />
                    <meshStandardMaterial color="#12283d" />
                  </mesh>
                  <mesh position={[ex * 1.4, 0.62, 0.1]} rotation={[0.5, 0, -ex]}>
                    <cylinderGeometry args={[0.025, 0.035, 0.6, 6]} />
                    <meshStandardMaterial color="#1e1e1e" />
                  </mesh>
                </group>
              ))}
            </group>
          </>
        )}
      </Board3D>
      <div className="arcade-pad" dir="ltr">
        {(['N', 'W', 'E', 'S'] as Dir[]).map((d) => {
          const I = ICON[d];
          return (
            <button key={d} type="button" className={`ibtn pad-${d}`} onClick={() => turn(MOVE[d] as Cell)} aria-label={d}>
              <I className="i" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Breakout, with a white blood cell knocking out germs ----------
function GermBreakout({ onSolved, onWrong }: P) {
  const COLS = 8;
  const ROWS = 3;
  const mk = () =>
    Array.from({ length: COLS * ROWS }, (_, i) => ({
      x: 40 + (i % COLS) * 46,
      y: 34 + Math.floor(i / COLS) * 30,
      alive: true,
      hue: (i * 47) % 360,
    }));
  const g = useRef({
    germs: mk(),
    bx: 200,
    by: 190,
    vx: 120,
    vy: -170,
    px: 200,
    won: false,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    s.bx += s.vx * dt;
    s.by += s.vy * dt;
    if (s.bx < 8 || s.bx > W - 8) s.vx = -s.vx;
    if (s.by < 8) s.vy = Math.abs(s.vy);
    s.bx = clamp(s.bx, 8, W - 8);
    if (s.vy > 0 && s.by > 204 && s.by < 220 && Math.abs(s.bx - s.px) < 40) {
      s.vy = -Math.abs(s.vy);
      s.vx = (s.bx - s.px) * 5;
      sfx('click');
    }
    for (const gm of s.germs) {
      if (gm.alive && Math.abs(s.bx - gm.x) < 20 && Math.abs(s.by - gm.y) < 14) {
        gm.alive = false;
        s.vy = -s.vy;
        sfx('pop');
        break;
      }
    }
    if (s.by > H + 10) {
      Object.assign(s, { bx: s.px, by: 190, vx: 100, vy: -170 });
      sfx('wrong');
      onWrong();
    }
    if (!s.won && s.germs.every((gm) => !gm.alive)) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  const left = s.germs.filter((gm) => gm.alive).length;
  return (
    <div className="arcade">
      <Score n={COLS * ROWS - left} of={COLS * ROWS} />
      <Board3D lift={0.5} onPoint={(p) => (s.px = clamp(p.x, 40, W - 40))}>
        <Floor color="#c84848" roughness={0.6} />
        {[
          [20, 120],
          [385, 100],
          [60, 230],
          [345, 228],
          [200, 236],
          [12, 30],
          [392, 20],
        ].map(([x, y], i) => (
          <RedCell key={i} position={top(x, y, 0.25)} rot={i * 0.7} />
        ))}
        {s.germs.map((gm, i) => gm.alive && <Germ key={i} position={top(gm.x, gm.y, 0.5)} hue={gm.hue} />)}
        <mesh position={top(s.bx, s.by, 0.5)}>
          <sphereGeometry args={[0.3, 18, 14]} />
          <meshStandardMaterial color="#ffe27a" emissive="#d8a800" emissiveIntensity={0.5} roughness={0.3} />
        </mesh>
        <WhiteCell position={top(s.px, 214, 0.5)} />
      </Board3D>
    </div>
  );
}

// ---------- Flappy Bird, with a pterosaur ----------
function FlappyPterosaur({ onSolved, onWrong }: P) {
  const GOAL = 8;
  const g = useRef({
    y: 120,
    vy: 0,
    cols: [
      { x: 420, gap: 110 },
      { x: 600, gap: 80 },
    ],
    passed: 0,
    hurt: 0,
    won: false,
    started: false,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  const flap = () => {
    s.started = true;
    s.vy = -150;
    sfx('click');
  };
  useLoop((dt) => {
    if (!s.started) return draw((n) => n + 1);
    s.hurt = Math.max(0, s.hurt - dt);
    s.vy = Math.min(220, s.vy + 420 * dt);
    s.y = clamp(s.y + s.vy * dt, 10, H - 10);
    for (const c of s.cols) {
      c.x -= 95 * dt;
      if (c.x < -30) {
        c.x += 360;
        c.gap = 60 + Math.random() * 120;
      }
      if (!s.hurt && Math.abs(c.x - 90) < 22 && Math.abs(s.y - c.gap) > 42) {
        // bumped a rock: a slip, then a moment to recover
        s.hurt = 1.2;
        sfx('wrong');
        onWrong();
      }
      if (c.x < 90 && c.x + 95 * dt >= 90 && !s.hurt) {
        s.passed++;
        sfx('pop');
      }
    }
    if (!s.won && s.passed >= GOAL) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      flap();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <div className="arcade">
      <Score n={s.passed} of={GOAL} />
      <Board3D view="side" className="sky" onDown={flap}>
        <GroundStrip y={-6.4} color="#9b7a55" depth={12} />
        {[-11, -4, 3, 10].map((x, i) => (
          <mesh key={x} position={[x, -6.4 + 2.2 + (i % 2), -9]}>
            <coneGeometry args={[4 + (i % 2), 5 + (i % 2) * 2, 5]} />
            <meshStandardMaterial color="#8fa6c4" flatShading roughness={1} />
          </mesh>
        ))}
        {s.cols.map((c, i) => (
          <group key={i}>
            <RockColumn x={m(c.x - W / 2)} y0={m(H / 2 - (c.gap - 42))} y1={7.5} />
            <RockColumn x={m(c.x - W / 2)} y0={-6.4} y1={m(H / 2 - (c.gap + 42))} />
          </group>
        ))}
        <group position={side(90, s.y, 1)} rotation={[0.75, 0, -((clamp(s.vy / 6, -25, 35) * Math.PI) / 180)]} scale={1.6}>
          <group visible={!s.hurt || Math.floor(performance.now() / 120) % 2 === 0}>
            <Pterosaur flap={Math.sin(performance.now() / 70) * 0.6} />
          </group>
        </group>
      </Board3D>
    </div>
  );
}

// ---------- Tic-tac-toe against a robot that follows written rules ----------
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
const winner = (b: string[]) =>
  LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]) ? b[LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d])![0]] : b.every(Boolean) ? 'draw' : '';
/** The robot's algorithm, step by step: 1 win if you can, 2 block, 3 take the middle, 4 take a corner, 5 anything. */
function robotMove(b: string[]): number {
  const open = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  for (const who of ['O', 'X'])
    for (const i of open) {
      const t = [...b];
      t[i] = who;
      if (winner(t) === who) return i;
    }
  if (!b[4]) return 4;
  const corner = [0, 2, 6, 8].filter((i) => !b[i]);
  if (corner.length) return corner[Math.floor(Math.random() * corner.length)];
  return open[0];
}
function BeatTheRobot({ onSolved, onWrong }: P) {
  const { t } = useTranslation();
  const GOAL = 3;
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [ok, setOk] = useState(0);
  const [msg, setMsg] = useState('');
  const result = winner(board);
  const play = (i: number) => {
    if (board[i] || result) return;
    sfx('click');
    const b = [...board];
    b[i] = 'X';
    if (!winner(b)) b[robotMove(b)] = 'O';
    setBoard(b);
    const r = winner(b);
    if (!r) return;
    if (r === 'O') {
      setMsg(t('arcade.robotWins'));
      sfx('wrong');
      onWrong();
    } else {
      setMsg(r === 'X' ? t('arcade.youWin') : t('arcade.draw'));
      sfx('pop');
      if (ok + 1 >= GOAL) onSolved();
      setOk(ok + 1);
    }
  };
  useNumberKeys(9, play);
  return (
    <div className="arcade">
      <Score n={ok} of={GOAL} />
      <Board3D>
        <Floor color="#cfa86e" roughness={0.75} />
        <group scale={1.35} position={[0, 0, -0.3]}>
          <mesh position={[0, 0.15, 0.6]} receiveShadow userData={{ ground: true }}>
            <boxGeometry args={[7.4, 0.3, 7.4]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.6} />
          </mesh>
          {board.map((v, i) => (
            <group key={i} position={[((i % 3) - 1) * 2.35, 0.3, (Math.floor(i / 3) - 1) * 2.35 + 0.6]}>
              <mesh
                position={[0, 0.1, 0]}
                receiveShadow
                userData={{ ground: true }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  play(i);
                }}
              >
                <boxGeometry args={[2.15, 0.2, 2.15]} />
                <meshStandardMaterial color={(i + Math.floor(i / 3)) % 2 ? '#f3e6c8' : '#e6d3a8'} roughness={0.7} />
              </mesh>
              {v === 'X' &&
                [Math.PI / 4, -Math.PI / 4].map((r) => (
                  <mesh key={r} position={[0, 0.42, 0]} rotation={[0, r, 0]}>
                    <boxGeometry args={[1.6, 0.36, 0.36]} />
                    <meshStandardMaterial color="#e5533d" roughness={0.35} />
                  </mesh>
                ))}
              {v === 'O' && <Thing id="robot" fit={1.9} position={[0, 0.2, 0]} />}
            </group>
          ))}
        </group>
      </Board3D>
      <p className="muted">{result ? msg : t('arcade.yourTurn')}</p>
      {result && ok < GOAL && (
        <button type="button" className="btn go" onClick={() => setBoard(Array(9).fill(''))}>
          {t('arcade.again')}
        </button>
      )}
    </div>
  );
}

// ---------- Simon, with colours (and the primary colours lead the way) ----------
const PADS = [
  { c: '#e5533d', f: 330 },
  { c: '#f5c518', f: 392 },
  { c: '#2f7fd0', f: 494 },
  { c: '#3fb950', f: 587 },
];
function tone(f: number) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const v = ctx.createGain();
    o.frequency.value = f;
    v.gain.setValueAtTime(0.15, ctx.currentTime);
    v.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(v).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.36);
    o.onended = () => void ctx.close();
  } catch {
    /* no sound */
  }
}
function ColourEcho({ onSolved, onWrong }: P) {
  const { t } = useTranslation();
  const GOAL = 6;
  const [seq, setSeq] = useState<number[]>(() => [Math.floor(Math.random() * 4)]);
  const [lit, setLit] = useState(-1);
  const [pos, setPos] = useState(0);
  const [showing, setShowing] = useState(true);
  useEffect(() => {
    if (!showing) return;
    let k = 0;
    const id = window.setInterval(() => {
      if (k >= seq.length) {
        window.clearInterval(id);
        setLit(-1);
        setShowing(false);
        setPos(0);
        return;
      }
      setLit(seq[k]);
      tone(PADS[seq[k]].f);
      window.setTimeout(() => setLit(-1), 380);
      k++;
    }, 650);
    return () => window.clearInterval(id);
  }, [showing, seq]);
  const press = (i: number) => {
    if (showing) return;
    tone(PADS[i].f);
    setLit(i);
    window.setTimeout(() => setLit(-1), 200);
    if (seq[pos] !== i) {
      sfx('wrong');
      onWrong();
      setShowing(true);
      return;
    }
    if (pos + 1 < seq.length) return setPos(pos + 1);
    if (seq.length >= GOAL) return onSolved();
    sfx('pop');
    window.setTimeout(() => {
      setSeq([...seq, Math.floor(Math.random() * 4)]);
      setShowing(true);
    }, 600);
  };
  useNumberKeys(4, press);
  return (
    <div className="arcade">
      <Score n={seq.length - (showing ? 1 : 0)} of={GOAL} />
      <Board3D className="night">
        <Floor color="#26304d" roughness={0.6} />
        <group scale={1.3}>
          <mesh position={[0, 0.15, 0.6]} receiveShadow userData={{ ground: true }}>
            <cylinderGeometry args={[4.6, 4.8, 0.3, 48]} />
            <meshStandardMaterial color="#1a2036" roughness={0.4} />
          </mesh>
          {PADS.map((p, i) => (
            <group key={i} position={[(i % 2 ? 1 : -1) * 1.9, 0.3, (i < 2 ? -1 : 1) * 1.9 + 0.6]}>
              <mesh
                position={[0, lit === i ? 0.12 : 0.25, 0]}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  press(i);
                }}
              >
                <cylinderGeometry args={[1.55, 1.6, 0.4, 40]} />
                <meshStandardMaterial color={p.c} emissive={p.c} emissiveIntensity={lit === i ? 1.4 : 0.08} roughness={0.35} toneMapped={lit !== i} />
              </mesh>
              {lit === i && <pointLight position={[0, 1.2, 0]} color={p.c} intensity={8} distance={6} />}
            </group>
          ))}
        </group>
      </Board3D>
      <p className="muted">{showing ? t('arcade.watch') : t('arcade.yourGo')}</p>
    </div>
  );
}

// ---------- Penalty kick: aim where the goalkeeper isn't ----------
function Penalty({ onSolved, onWrong }: P) {
  const GOAL = 5;
  const g = useRef({ kx: 200, kv: 80, ball: null as null | { tx: number; t: number; saved?: boolean }, goals: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    s.kx += s.kv * dt;
    if (s.kx < 140 || s.kx > 260) s.kv = -s.kv;
    s.kx = clamp(s.kx, 140, 260);
    const b = s.ball;
    if (b) {
      const was = b.t;
      b.t += dt / 0.7;
      if (was < 1 && b.t >= 1) {
        b.saved = Math.abs(s.kx - b.tx) < 30;
        if (b.saved) {
          sfx('wrong');
          onWrong();
        } else {
          s.goals++;
          sfx('pop');
          s.kv = Math.sign(s.kv) * (80 + s.goals * 18);
          if (s.goals >= GOAL && !s.won) {
            s.won = true;
            onSolved();
          }
        }
      }
      if (b.t > 1.9) s.ball = null;
    }
    draw((n) => n + 1);
  }, !s.won || !!s.ball);
  const shoot = (p: { x: number; y: number }) => {
    if (s.ball || s.won) return;
    sfx('click');
    s.ball = { tx: clamp(p.x, 128, 272), t: 0 };
  };
  const b = s.ball;
  const k = b ? Math.min(1, b.t) : 0;
  const bx = b ? 200 + (b.tx - 200) * k : 200;
  const by = b ? 205 - 163 * k + (b.saved && b.t > 1 ? (b.t - 1) * 60 : 0) : 205;
  const bh = b ? 0.35 + Math.sin(Math.PI * k) * 1.4 + (b.t > 1 ? 0.6 : k * 0.6) : 0.35;
  return (
    <div className="arcade">
      <Score n={s.goals} of={GOAL} />
      <Board3D className="sky" onDown={shoot}>
        <Floor color="#4f9a4a" roughness={0.95} />
        {[-6, -2, 2, 6].map((z) => (
          <mesh key={z} position={[0, 0.003, z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ ground: true }} receiveShadow>
            <planeGeometry args={[40, 2]} />
            <meshStandardMaterial color="#59a653" roughness={1} />
          </mesh>
        ))}
        <mesh position={top(200, 40, 0.01)} rotation={[-Math.PI / 2, 0, 0]} userData={{ ground: true }}>
          <planeGeometry args={[30, 0.12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={top(200, 205, 0.01)} rotation={[-Math.PI / 2, 0, 0]} userData={{ ground: true }}>
          <circleGeometry args={[0.22, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {[120, 280].map((x) => (
          <mesh key={x} position={top(x, 38, 1.2)}>
            <cylinderGeometry args={[0.1, 0.1, 2.4, 10]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={top(200, 38, 2.4)} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 8.2, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={top(200, 18, 1.2)}>
          <planeGeometry args={[8, 2.4, 16, 6]} />
          <meshStandardMaterial color="#ffffff" wireframe transparent opacity={0.5} />
        </mesh>
        <group position={top(s.kx, 46)}>
          <mesh position={[0, 1.05, 0]}>
            <capsuleGeometry args={[0.38, 0.9, 4, 12]} />
            <meshStandardMaterial color="#f08a24" roughness={0.6} />
          </mesh>
          <mesh position={[0, 2.05, 0]}>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshStandardMaterial color="#c68b5e" />
          </mesh>
          {[-1, 1].map((sg) => (
            <mesh key={sg} position={[sg * 0.75, 1.6, 0.1]}>
              <sphereGeometry args={[0.2, 12, 10]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
          {[-1, 1].map((sg) => (
            <mesh key={sg} position={[sg * 0.2, 0.3, 0]}>
              <capsuleGeometry args={[0.13, 0.45, 4, 8]} />
              <meshStandardMaterial color="#1f2a44" />
            </mesh>
          ))}
        </group>
        <Thing id="soccer-ball" fit={0.7} position={top(bx, by, bh - 0.35)} />
      </Board3D>
    </div>
  );
}

// ---------- Lunar lander: touch down gently on the Moon ----------
const PAD = 280;
function Lander({ onSolved, onWrong }: P) {
  const { t } = useTranslation();
  const GOAL = 3;
  const g = useRef({ x: 80, y: 30, vy: 0, tx: 80, thrust: false, landed: 0, rest: 0, crash: false, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    if (s.rest > 0) {
      s.rest -= dt;
      if (s.rest <= 0 && !s.won) Object.assign(s, { x: 50 + Math.random() * 120, tx: 80, y: 30, vy: 0, crash: false });
    } else {
      // the Moon pulls about one sixth as hard as the Earth, so the fall is gentle
      s.vy = clamp(s.vy + 30 * dt - (s.thrust ? 78 * dt : 0), -70, 120);
      s.x += (s.tx - s.x) * Math.min(1, dt * 1.4);
      s.y += s.vy * dt;
      if (s.y < 10) Object.assign(s, { y: 10, vy: 0 });
      if (s.y >= 196) {
        s.y = 196;
        const ok = Math.abs(s.x - PAD) < 38 && s.vy < 40;
        if (ok) {
          s.landed++;
          sfx('pop');
          if (s.landed >= GOAL && !s.won) {
            s.won = true;
            onSolved();
          }
        } else {
          s.crash = true;
          sfx('wrong');
          onWrong();
        }
        s.vy = 0;
        s.rest = 1.3;
      }
    }
    draw((n) => n + 1);
  }, !s.won);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        s.thrust = e.type === 'keydown';
      } else if (e.type === 'keydown' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) s.tx = clamp(s.tx + (e.key === 'ArrowLeft' ? -30 : 30), 20, 380);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
    };
  }, [s]);
  const slow = s.vy < 40;
  const flame = s.thrust && s.rest <= 0;
  return (
    <div className="arcade">
      <Score n={s.landed} of={GOAL} />
      <Board3D view="side" className="space" onPoint={(p) => (s.tx = clamp(p.x, 20, 380))} onDown={() => (s.thrust = true)} onUp={() => (s.thrust = false)}>
        <Stars radius={40} depth={10} count={700} factor={2.5} fade speed={0.3} />
        <group position={side(340, 46, -8)}>
          <mesh>
            <sphereGeometry args={[1.6, 32, 24]} />
            <meshStandardMaterial color="#2f7fd0" roughness={0.5} />
          </mesh>
          <mesh position={[0.3, 0.4, 1.2]} scale={[0.9, 0.6, 0.5]}>
            <sphereGeometry args={[0.6, 12, 10]} />
            <meshStandardMaterial color="#5fae3d" />
          </mesh>
        </group>
        <GroundStrip y={-4.3} color="#a7a9ad" depth={14} />
        {[60, 150, 370].map((x, i) => (
          <mesh key={x} position={side(x, 206, 1 - i)} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]}>
            <torusGeometry args={[0.8 + i * 0.2, 0.22, 8, 20]} />
            <meshStandardMaterial color="#8d8f94" roughness={1} />
          </mesh>
        ))}
        <mesh position={side(PAD, 214, 0.5)}>
          <boxGeometry args={[m(76), 0.12, 2.4]} />
          <meshStandardMaterial color="#ffd24a" emissive="#c99a00" emissiveIntensity={0.5} />
        </mesh>
        <group position={side(s.x, s.y)} rotation={[0, 0.5, s.crash ? 0.6 : 0]}>
          <mesh position={[0, -0.55, 0]}>
            <boxGeometry args={[1.3, 0.8, 1.3]} />
            <meshStandardMaterial color="#d8a93a" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.95, 0.7, 0.95]} />
            <meshStandardMaterial color="#c9ccd1" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.25, 0.49]}>
            <circleGeometry args={[0.16, 12]} />
            <meshStandardMaterial color="#1d2433" />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos(i * 1.57 + 0.78) * 0.85, -0.95, Math.sin(i * 1.57 + 0.78) * 0.85]} rotation={[Math.sin(i * 1.57 + 0.78) * 0.5, 0, -Math.cos(i * 1.57 + 0.78) * 0.5]}>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
              <meshStandardMaterial color="#9aa0a8" />
            </mesh>
          ))}
          {flame && (
            <mesh position={[0, -1.35, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 0.8 + Math.random() * 0.4, 1]}>
              <coneGeometry args={[0.28, 0.9, 12]} />
              <meshBasicMaterial color="#ffb347" toneMapped={false} transparent opacity={0.9} />
            </mesh>
          )}
        </group>
      </Board3D>
      <p className={`arcade-speed${slow ? '' : ' fast'}`}>{slow ? t('arcade.slow') : t('arcade.fast')}</p>
    </div>
  );
}

// ---------- Stacker: build a pyramid one layer at a time ----------
function Stacker({ onSolved, onWrong }: P) {
  const LAYERS = 8;
  const BH = 22;
  const g = useRef({ layers: [{ x: 200, w: 210 }], x: 60, w: 196, v: 130, falling: [] as { x: number; w: number; y: number; vy: number }[], won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  const row = (i: number) => 210 - i * BH;
  useLoop(
    (dt) => {
      if (!s.won) {
        s.x += s.v * dt;
        if (s.x < s.w / 2 + 6 || s.x > W - s.w / 2 - 6) s.v = -s.v;
        s.x = clamp(s.x, s.w / 2 + 6, W - s.w / 2 - 6);
      }
      s.falling = s.falling.filter((f) => {
        f.vy += 500 * dt;
        f.y += f.vy * dt;
        return f.y < H + 60;
      });
      draw((n) => n + 1);
    },
    !s.won || s.falling.length > 0,
  );
  const drop = () => {
    if (s.won) return;
    const prev = s.layers[s.layers.length - 1];
    if (Math.abs(s.x - prev.x) < 5) s.x = prev.x; // nearly perfect snaps into place
    const l = Math.max(s.x - s.w / 2, prev.x - prev.w / 2);
    const r = Math.min(s.x + s.w / 2, prev.x + prev.w / 2);
    if (r - l < 10) {
      sfx('wrong');
      onWrong();
      s.falling.push({ x: s.x, w: s.w, y: row(s.layers.length), vy: 0 });
      s.x = 60;
      return;
    }
    // each layer is a little narrower than the one below, like the steps of a pyramid
    const w = Math.min(r - l, prev.w - 16);
    const cx = (l + r) / 2;
    if (s.x - s.w / 2 < l) s.falling.push({ x: (s.x - s.w / 2 + l) / 2, w: l - (s.x - s.w / 2), y: row(s.layers.length), vy: 0 });
    if (s.x + s.w / 2 > r) s.falling.push({ x: (r + s.x + s.w / 2) / 2, w: s.x + s.w / 2 - r, y: row(s.layers.length), vy: 0 });
    s.layers.push({ x: cx, w });
    sfx('pop');
    s.w = w - 16;
    s.v = Math.sign(s.v || 1) * (130 + s.layers.length * 14);
    s.x = s.v > 0 ? s.w / 2 + 8 : W - s.w / 2 - 8;
    if (s.layers.length - 1 >= LAYERS) {
      s.won = true;
      onSolved();
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      drop();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const stone = (i: number) => (i % 2 ? '#d9b77a' : '#cfa96a');
  const topRow = s.layers[s.layers.length - 1];
  return (
    <div className="arcade">
      <Score n={s.layers.length - 1} of={LAYERS} />
      <Board3D view="side" className="savanna" onDown={drop}>
        <GroundStrip y={-5.05} color="#e3c48a" depth={14} />
        {[-10, 9].map((x, i) => (
          <mesh key={x} position={[x, -5.05 + 2.2 - i * 0.5, -10]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[4 - i, 4.4 - i, 4]} />
            <meshStandardMaterial color="#e2c18c" flatShading roughness={1} />
          </mesh>
        ))}
        <mesh position={[8, 4.5, -12]}>
          <sphereGeometry args={[1.1, 20, 14]} />
          <meshBasicMaterial color="#ffd24a" toneMapped={false} />
        </mesh>
        {s.layers.map((b, i) => (
          <mesh key={i} position={side(b.x, row(i))}>
            <boxGeometry args={[m(b.w), m(BH) - 0.04, 3.2]} />
            <meshStandardMaterial color={stone(i)} roughness={0.95} />
          </mesh>
        ))}
        {!s.won && (
          <mesh position={side(s.x, row(s.layers.length))}>
            <boxGeometry args={[m(s.w), m(BH) - 0.04, 3.2]} />
            <meshStandardMaterial color="#e8c88c" roughness={0.9} emissive="#7a5a20" emissiveIntensity={0.15} />
          </mesh>
        )}
        {s.falling.map((f, i) => (
          <mesh key={i} position={side(f.x, f.y)} rotation={[0, 0, f.vy * 0.002]}>
            <boxGeometry args={[m(f.w), m(BH) - 0.04, 3.2]} />
            <meshStandardMaterial color="#cfa96a" roughness={0.95} />
          </mesh>
        ))}
        {s.won && (
          <mesh position={side(topRow.x, row(s.layers.length) - 3)} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[m(topRow.w) * 0.7, 1.4, 4]} />
            <meshStandardMaterial color="#e9c46a" metalness={0.5} roughness={0.35} />
          </mesh>
        )}
      </Board3D>
    </div>
  );
}

// ---------- Whack-a-letter: tap the letters of the word as they pop up ----------
const WORDS: Record<Lang, string[]> = { en: ['CAT', 'BOOK', 'STORY'], fr: ['CHAT', 'LIVRE', 'CONTE'], ar: ['قط', 'كتاب', 'قصة'] };
const ABC: Record<Lang, string> = { en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', fr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' };
const LETTER_COLOURS = ['#e5533d', '#2f7fd0', '#3fb950', '#f5b700', '#b46cff', '#ff8a3d'];
const HOLES: Pt[] = [
  [90, 85],
  [200, 85],
  [310, 85],
  [90, 175],
  [200, 175],
  [310, 175],
];
function LetterMoles({ lang, onSolved, onWrong }: P) {
  const words = WORDS[lang];
  const g = useRef({ word: 0, pos: 0, moles: HOLES.map(() => ({ ch: '', up: 0, life: 0, id: 0 })), next: 0.6, n: 1, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    const want = words[Math.min(s.word, words.length - 1)][s.pos];
    s.next -= dt;
    const free = s.moles.map((mo, i) => (mo.life <= 0 && mo.up <= 0.01 ? i : -1)).filter((i) => i >= 0);
    const showing = s.moles.filter((mo) => mo.life > 0);
    if (s.next <= 0 && free.length && showing.length < 3) {
      s.next = 0.55 + Math.random() * 0.5;
      const i = free[Math.floor(Math.random() * free.length)];
      // the letter you need comes up often, but never twice at the same time
      const need = !showing.some((mo) => mo.ch === want) && Math.random() < 0.55;
      const pool = [...ABC[lang]].filter((c) => c !== want);
      s.moles[i] = { ch: need ? want : pool[Math.floor(Math.random() * pool.length)], up: 0, life: 2.3, id: s.n++ };
    }
    for (const mo of s.moles) {
      mo.life -= dt;
      mo.up += ((mo.life > 0 ? 1 : 0) - mo.up) * Math.min(1, dt * 9);
    }
    draw((n) => n + 1);
  }, !s.won);
  const whack = (i: number) => {
    const mo = s.moles[i];
    if (s.won || mo.life <= 0 || mo.up < 0.4) return;
    mo.life = 0;
    if (mo.ch !== words[s.word][s.pos]) {
      sfx('wrong');
      return onWrong();
    }
    sfx('pop');
    s.pos++;
    if (s.pos >= words[s.word].length) {
      s.word++;
      s.pos = 0;
      sfx('correct');
      if (s.word >= words.length) {
        s.won = true;
        onSolved();
      }
    }
  };
  useNumberKeys(6, whack);
  const word = words[Math.min(s.word, words.length - 1)];
  const t = performance.now() / 1000;
  return (
    <div className="arcade">
      <p className="arcade-word" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {[...word].map((c, i) => (
          <span key={i} className={s.won || i < s.pos ? 'got' : i === s.pos ? 'next' : ''}>
            {c}
          </span>
        ))}
      </p>
      <Board3D className="sky">
        <Meadow grass={600} keep={(x, z) => HOLES.every(([hx, hy]) => Math.hypot(x - top(hx, hy)[0], z - top(hx, hy)[2]) > 1.5)} />
        {HOLES.map(([x, y], i) => {
          const mo = s.moles[i];
          return (
            <group key={i} position={top(x, y)}>
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ ground: true }}>
                <circleGeometry args={[1.05, 28]} />
                <meshStandardMaterial color="#3a2a16" />
              </mesh>
              <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ ground: true }}>
                <torusGeometry args={[1.08, 0.18, 8, 28]} />
                <meshStandardMaterial color="#8a6a3c" roughness={1} />
              </mesh>
              {mo.up > 0.02 && (
                <group position={[0, -1.1 + mo.up * 2, 0]} rotation={[0, Math.sin(t * 3 + mo.id) * 0.15, 0]}>
                  <mesh
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      whack(i);
                    }}
                  >
                    <boxGeometry args={[1.6, 1.6, 1.6]} />
                    <meshStandardMaterial color={LETTER_COLOURS[mo.id % LETTER_COLOURS.length]} roughness={0.45} />
                  </mesh>
                  {mo.up > 0.55 && (
                    <Html center position={[0, 0.81, 0]} zIndexRange={[5, 0]}>
                      <span className="arcade-letter" onPointerDown={() => whack(i)}>
                        {mo.ch}
                      </span>
                    </Html>
                  )}
                </group>
              )}
            </group>
          );
        })}
      </Board3D>
    </div>
  );
}

// ---------- Recycling: send each thing on the belt to the right bin ----------
type Waste = 'paper' | 'plastic' | 'glass' | 'metal';
const BINS: { id: Waste; colour: string; x: number; label: Record<Lang, string> }[] = [
  { id: 'paper', colour: '#2f7fd0', x: 80, label: { en: 'Paper', fr: 'Papier', ar: 'ورق' } },
  { id: 'plastic', colour: '#f5c518', x: 160, label: { en: 'Plastic', fr: 'Plastique', ar: 'بلاستيك' } },
  { id: 'glass', colour: '#3fb950', x: 240, label: { en: 'Glass', fr: 'Verre', ar: 'زجاج' } },
  { id: 'metal', colour: '#8f99a5', x: 320, label: { en: 'Metal', fr: 'Métal', ar: 'معدن' } },
];
function WasteItem({ kind }: { kind: Waste }) {
  if (kind === 'paper')
    return (
      <mesh position={[0, 0.15, 0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[1.1, 0.3, 0.8]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.9} />
      </mesh>
    );
  if (kind === 'metal')
    return (
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.9, 18]} />
        <meshStandardMaterial color="#c3c9d1" metalness={0.9} roughness={0.25} />
      </mesh>
    );
  const glass = kind === 'glass';
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[glass ? 0.38 : 0.3, glass ? 0.38 : 0.3, 1, 18]} />
        <meshStandardMaterial color={glass ? '#4fbf6a' : '#9fd6f5'} transparent opacity={0.6} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.18, 12]} />
        <meshStandardMaterial color={glass ? '#8a6a3a' : '#e5533d'} />
      </mesh>
    </group>
  );
}
function Recycle({ lang, onSolved, onWrong }: P) {
  const GOAL = 12;
  const kinds: Waste[] = ['paper', 'plastic', 'glass', 'metal'];
  const fresh = () => kinds[Math.floor(Math.random() * 4)];
  const g = useRef({ kind: fresh(), x: 20, fly: null as null | { from: number; to: number; t: number; kind: Waste }, sorted: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  useLoop((dt) => {
    s.x += (55 + s.sorted * 5) * dt;
    if (s.x > 390) {
      sfx('wrong');
      onWrong();
      Object.assign(s, { x: 20, kind: fresh() });
    }
    if (s.fly) {
      s.fly.t += dt * 2.2;
      if (s.fly.t >= 1) s.fly = null;
    }
    draw((n) => n + 1);
  }, !s.won || !!s.fly);
  const pick = (i: number) => {
    if (s.won) return;
    const bin = BINS[i];
    if (bin.id !== s.kind) {
      sfx('wrong');
      onWrong();
      return;
    }
    sfx('pop');
    s.fly = { from: s.x, to: bin.x, t: 0, kind: s.kind };
    s.sorted++;
    Object.assign(s, { x: 20, kind: fresh() });
    if (s.sorted >= GOAL) {
      s.won = true;
      onSolved();
    }
  };
  useNumberKeys(4, pick);
  const f = s.fly;
  return (
    <div className="arcade">
      <Score n={s.sorted} of={GOAL} />
      <Board3D
        onDown={(p) => {
          const i = BINS.findIndex((b) => Math.abs(b.x - p.x) < 36 && p.y > 150);
          if (i >= 0) pick(i);
        }}
      >
        <Floor color="#cfd6dc" roughness={0.8} />
        <mesh position={top(200, 92, 0.3)} receiveShadow userData={{ ground: true }}>
          <boxGeometry args={[21, 0.6, 2.4]} />
          <meshStandardMaterial color="#2c3440" roughness={0.6} />
        </mesh>
        {Array.from({ length: 11 }, (_, i) => (
          <mesh key={i} position={top(10 + i * 38, 92, 0.62)} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 2.3, 8]} />
            <meshStandardMaterial color="#8a95a3" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        <group position={top(s.x, 92, 0.62)} scale={1.6}>
          <WasteItem kind={s.kind} />
        </group>
        {f && (
          <group position={top(f.from + (f.to - f.from) * f.t, 92 + 98 * f.t, 0.62 + Math.sin(Math.PI * f.t) * 2)} scale={1.6 - f.t * 0.6}>
            <WasteItem kind={f.kind} />
          </group>
        )}
        {BINS.map((b, i) => (
          <group key={b.id} position={top(b.x, 196)}>
            <mesh
              position={[0, 0.7, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
                pick(i);
              }}
            >
              <cylinderGeometry args={[1.2, 1.0, 1.4, 24, 1, true]} />
              <meshStandardMaterial color={b.colour} roughness={0.5} side={DoubleSide} />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.0, 24]} />
              <meshStandardMaterial color="#20262e" />
            </mesh>
            <Html center position={[0, 0, 1.6]}>
              <span className="arcade-tag bin">
                {i + 1}. {b.label[lang]}
              </span>
            </Html>
          </group>
        ))}
      </Board3D>
    </div>
  );
}

// ---------- Maze: lead the robot to its battery ----------
const MW = 9;
const MH = 5;
/** A perfect maze (every cell reachable, no loops), carved by a seeded random walk. */
function carve(seed: number) {
  let a = seed * 9973 + 17;
  const rnd = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const right = Array.from({ length: MH }, () => Array(MW).fill(true));
  const down = Array.from({ length: MH }, () => Array(MW).fill(true));
  const seen = Array.from({ length: MH }, () => Array(MW).fill(false));
  const stack: Cell[] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as Cell[]
    )
      .map(([dx, dy]) => [x + dx, y + dy] as Cell)
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < MW && ny < MH && !seen[ny][nx]);
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = next[Math.floor(rnd() * next.length)];
    if (nx > x) right[y][x] = false;
    if (nx < x) right[y][nx] = false;
    if (ny > y) down[y][x] = false;
    if (ny < y) down[ny][x] = false;
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  return { right, down };
}
function Maze({ seed, onSolved }: P) {
  const LEVELS = 3;
  const [level, setLevel] = useState(0);
  const maze = useMemo(() => carve(seed + level * 31 + 1), [seed, level]);
  const [at, setAt] = useState<Cell>([0, 0]);
  const done = level >= LEVELS;
  devState({ maze, at, level });
  const cx = (x: number) => 40 + x * 40;
  const cy = (y: number) => 40 + y * 40;
  const go = (d: Dir) => {
    if (done) return;
    const [x, y] = at;
    const [dx, dy] = MOVE[d];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) return;
    const wall = dx > 0 ? maze.right[y][x] : dx < 0 ? maze.right[y][nx] : dy > 0 ? maze.down[y][x] : maze.down[ny][x];
    if (wall) return sfx('click');
    setAt([nx, ny]);
    if (nx === MW - 1 && ny === MH - 1) {
      sfx('pop');
      window.setTimeout(() => {
        if (level + 1 >= LEVELS) onSolved();
        setLevel(level + 1);
        setAt([0, 0]);
      }, 500);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = ({ ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W' } as Record<string, Dir>)[e.key];
      if (!d) return;
      e.preventDefault();
      go(d);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const pos = useRef<[number, number]>([cx(0), cy(0)]);
  const [rx, ry] = pos.current;
  pos.current = [rx + (cx(at[0]) - rx) * 0.35, ry + (cy(at[1]) - ry) * 0.35];
  const [, draw] = useState(0);
  useLoop(() => draw((n) => n + 1), !done);
  const walls: [number, number, number, number][] = [];
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      if (maze.right[y][x] && x < MW - 1) walls.push([cx(x) + 20, cy(y), 0.18, 2.18]);
      if (maze.down[y][x] && y < MH - 1) walls.push([cx(x), cy(y) + 20, 2.18, 0.18]);
    }
  walls.push([200, 20, 18.2, 0.2], [200, 220, 18.2, 0.2], [20, 120, 0.2, 10.2], [380, 120, 0.2, 10.2]);
  return (
    <div className="arcade">
      <Score n={Math.min(level, LEVELS)} of={LEVELS} />
      <Board3D>
        <Floor color="#dfe6ef" roughness={0.7} />
        {walls.map(([x, y, w, d], i) => (
          <mesh key={`${level}-${i}`} position={top(x, y, 0.45)}>
            <boxGeometry args={[w, 0.9, d]} />
            <meshStandardMaterial color="#5b6fa6" roughness={0.5} />
          </mesh>
        ))}
        <group position={top(cx(MW - 1), cy(MH - 1))}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.9, 18]} />
            <meshStandardMaterial color="#3fb950" emissive="#1f8a3a" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.16, 12]} />
            <meshStandardMaterial color="#c9ccd1" metalness={0.8} />
          </mesh>
        </group>
        <Thing id="robot" fit={2} position={top(pos.current[0], pos.current[1])} />
      </Board3D>
      <div className="arcade-pad" dir="ltr">
        {(['N', 'W', 'E', 'S'] as Dir[]).map((d) => {
          const I = ICON[d];
          return (
            <button key={d} type="button" className={`ibtn pad-${d}`} onClick={() => go(d)} aria-label={d}>
              <I className="i" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Dino run: jump over the rocks and ferns ----------
function DinoRun({ onSolved, onWrong }: P) {
  const GOAL = 10;
  const g = useRef({
    y: 0,
    vy: 0,
    obs: [
      { x: 460, fern: true },
      { x: 700, fern: false },
    ],
    passed: 0,
    hurt: 0,
    speed: 150,
    won: false,
    started: false,
    run: 0,
  });
  const [, draw] = useState(0);
  const s = g.current;
  devState(s);
  const jump = () => {
    s.started = true;
    if (s.y === 0) {
      s.vy = 340;
      sfx('click');
    }
  };
  useLoop((dt) => {
    if (!s.started) return draw((n) => n + 1);
    s.run += dt;
    s.hurt = Math.max(0, s.hurt - dt);
    s.vy -= 950 * dt;
    s.y = Math.max(0, s.y + s.vy * dt);
    if (s.y === 0) s.vy = 0;
    s.speed = 150 + s.passed * 8;
    for (const o of s.obs) {
      const was = o.x;
      o.x -= s.speed * dt;
      if (!s.hurt && Math.abs(o.x - 80) < 16 && s.y < 24) {
        s.hurt = 1;
        sfx('wrong');
        onWrong();
      }
      if (was >= 80 && o.x < 80 && !s.hurt) {
        s.passed++;
        sfx('pop');
      }
      if (o.x < -30) {
        o.x = Math.max(...s.obs.map((q) => q.x)) + 190 + Math.random() * 140;
        o.fern = Math.random() < 0.5;
      }
    }
    if (s.passed >= GOAL && !s.won) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      jump();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const scroll = (s.run * s.speed) / 20;
  return (
    <div className="arcade">
      <Score n={s.passed} of={GOAL} />
      <Board3D view="side" className="sky" onDown={jump}>
        <GroundStrip y={-4} color="#b89a62" depth={12} />
        <mesh position={[-6, -4 + 2.5, -12]}>
          <coneGeometry args={[5, 5, 7]} />
          <meshStandardMaterial color="#8a6a58" flatShading roughness={1} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => {
          const x = ((((i * 4.3 - scroll * 0.4) % 36) + 36) % 36) - 18;
          return <PineTree key={i} position={[x, -4, -5 - (i % 3)]} scale={0.6 + (i % 3) * 0.15} />;
        })}
        {Array.from({ length: 14 }, (_, i) => {
          const x = ((((i * 2.9 - scroll) % 30) + 30) % 30) - 15;
          return (
            <mesh key={i} position={[x, -3.98, 1.5 + (i % 3) * 0.6]} scale={[1, 0.4, 1]}>
              <sphereGeometry args={[0.12 + (i % 2) * 0.08, 6, 5]} />
              <meshStandardMaterial color="#8d7650" />
            </mesh>
          );
        })}
        {s.obs.map((o, i) =>
          o.fern ? (
            <group key={i} position={side(o.x, 200)}>
              {[-0.5, 0, 0.5].map((dx, k) => (
                <mesh key={k} position={[dx * 0.6, 0.5, 0]} rotation={[0, 0, dx]}>
                  <coneGeometry args={[0.3, 1.2, 6]} />
                  <meshStandardMaterial color="#3f8f3a" roughness={0.8} />
                </mesh>
              ))}
            </group>
          ) : (
            <Rock key={i} position={side(o.x, 192)} scale={0.9} color="#8f8a80" />
          ),
        )}
        <group position={side(80, 200 - s.y)} rotation={[0, Math.PI / 2, 0]}>
          <group visible={!s.hurt || Math.floor(performance.now() / 120) % 2 === 0} position={[0, s.y === 0 ? Math.abs(Math.sin(s.run * 14)) * 0.12 : 0, 0]}>
            <Thing id="trex" fit={3} />
          </group>
        </group>
      </Board3D>
    </div>
  );
}

const GAMES = {
  penalty: Penalty,
  lander: Lander,
  stacker: Stacker,
  letters: LetterMoles,
  recycle: Recycle,
  maze: Maze,
  'dino-run': DinoRun,
  caterpillar: Caterpillar,
  breakout: GermBreakout,
  flappy: FlappyPterosaur,
  tictactoe: BeatTheRobot,
  echo: ColourEcho,
  stalk: Stalk,
  tadpole: Tadpole,
  'sun-track': SunTrack,
  xray: Xray,
  'bug-hunt': BugHunt,
  dots: Dots,
  'krill-gulp': KrillGulp,
  pollinate: Pollinate,
  'fossil-dig': FossilDig,
  'steady-race': SteadyRace,
  'keep-up': KeepUp,
  camouflage: Camouflage,
  treasure: Treasure,
  pinhole: Pinhole,
  jigsaw: Jigsaw,
};

export function Arcade(props: P) {
  const Game = GAMES[props.puzzle.game];
  return <Game {...props} />;
}
