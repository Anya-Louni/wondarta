import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, Shovel } from 'lucide-react';
import type { ArcadePuzzle, Lang } from '../../types/content';
import { sfx } from '../../audio/sfx';
import { seeded, type PuzzleProps } from './types';
import { BODY_PARTS, useBodyShots, useSprite, type BodyPart, type Face } from './sprites';

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
  return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const Score = ({ n, of }: { n: number; of: number }) => (
  <p className="arcade-score" dir="ltr">
    {Math.min(n, of)} / {of}
  </p>
);

/** A picture of one of the world's 3D models, centred on (0, 0). */
function Sprite({ id, size, face = 'right', flip, ...rest }: { id: string; size: number; face?: Face; flip?: boolean } & React.SVGProps<SVGImageElement>) {
  const href = useSprite(id, face);
  return href ? <image href={href} x={-size / 2} y={-size / 2} width={size} height={size} transform={flip ? 'scale(-1 1)' : undefined} {...rest} /> : null;
}

// ---------- swim and eat: the whale and the tadpole share this ----------
function Swim({ onSolved, onWrong, cls, hero, good, bad, mouth = 26 }: P & { mouth?: number; cls: string; hero: (got: number) => ReactNode; good: ReactNode; bad: ReactNode }) {
  const GOAL = 12;
  const g = useRef({ x: 90, y: 120, tx: 90, ty: 120, items: [] as { x: number; y: number; v: number; bad: boolean; id: number }[], next: 0, n: 0, got: 0, ouch: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
  useLoop((dt) => {
    s.x += (s.tx - s.x) * Math.min(1, dt * 6);
    s.y += (s.ty - s.y) * Math.min(1, dt * 6);
    s.ouch = Math.max(0, s.ouch - dt);
    s.next -= dt;
    if (s.next <= 0) {
      s.next = 0.42;
      s.items.push({ x: W + 10, y: 22 + Math.random() * (H - 44), v: 60 + Math.random() * 50, bad: Math.random() < 0.2, id: s.n++ });
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
  return (
    <div className="arcade">
      <Score n={s.got} of={GOAL} />
      <svg viewBox={`0 0 ${W} ${H}`} className={`arcade-board ${cls}`} onPointerMove={(e) => Object.assign(s, { tx: at(e).x - mouth, ty: at(e).y })} onPointerDown={(e) => Object.assign(s, { tx: at(e).x - mouth, ty: at(e).y })}>
        {s.items.map((it) => (
          <g key={it.id} transform={`translate(${it.x} ${it.y})`}>
            {it.bad ? bad : good}
          </g>
        ))}
        <g transform={`translate(${s.x} ${s.y})`} opacity={s.ouch ? 0.5 : 1}>
          {hero(s.got)}
        </g>
      </svg>
    </div>
  );
}

const KrillGulp = (p: P) => (
  <Swim
    {...p}
    cls="sea"
    mouth={50}
    good={
      <>
        <ellipse rx="5" ry="2.2" fill="#ff9d8a" />
        <path d="M4 0 L8 -2 M4 0 L8 2" stroke="#ff9d8a" strokeWidth="1" />
      </>
    }
    bad={
      <g transform="rotate(20)">
        <rect x="-4" y="-8" width="8" height="16" rx="2" fill="#dfe7ea" stroke="#78909c" />
        <rect x="-2" y="-11" width="4" height="3" fill="#e5533d" />
      </g>
    }
    hero={() => <Sprite id="whale" size={136} style={{ filter: "saturate(1.6) brightness(0.85)" }} />}
  />
);

// A tadpole changes as it eats: tadpole, then froglet with legs and a short tail, then frog.
const Tadpole = (p: P) => (
  <Swim
    {...p}
    cls="pond"
    mouth={18}
    good={
      <>
        <circle r="4" fill="#5fae3d" />
        <circle cx="4" cy="-3" r="2.5" fill="#7cc653" />
      </>
    }
    bad={<Sprite id="fish" size={40} face="left" />}
    hero={(got) => {
      const stage = Math.min(4, Math.floor(got / 3));
      return <Sprite id={stage < 2 ? 'tadpole' : stage < 4 ? 'froglet' : 'frog'} size={46 + stage * 6} />;
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
function Pollinate({ onSolved }: P) {
  const g = useRef({ x: 200, y: 120, tx: 200, ty: 120, last: -1, carrying: false, fruit: FLOWERS.map(() => false), won: false });
  const [, draw] = useState(0);
  const s = g.current;
  const all = s.fruit.every(Boolean);
  useLoop((dt) => {
    s.x += (s.tx - s.x) * Math.min(1, dt * 5);
    s.y += (s.ty - s.y) * Math.min(1, dt * 5);
    FLOWERS.forEach((f, i) => {
      if (i === s.last || Math.hypot(f.x - s.x, f.y - 18 - s.y) > 16) return;
      // pollen from the flower before lands here, and this flower's pollen comes along
      if (s.carrying && !s.fruit[i]) {
        s.fruit[i] = true;
        sfx('pop');
      }
      s.carrying = true;
      s.last = i;
    });
    if (s.fruit.every(Boolean) && !s.won && Math.hypot(HIVE.x - s.x, HIVE.y - 14 - s.y) < 18) {
      s.won = true;
      onSolved();
    }
    draw((n) => n + 1);
  }, !s.won);
  return (
    <div className="arcade">
      <Score n={s.fruit.filter(Boolean).length} of={FLOWERS.length} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board meadow" onPointerMove={(e) => Object.assign(s, { tx: at(e).x, ty: at(e).y })} onPointerDown={(e) => Object.assign(s, { tx: at(e).x, ty: at(e).y })}>
        <g className={all ? 'arcade-glow' : ''}>
          <path d={`M${HIVE.x - 16} ${HIVE.y} a16 22 0 0 1 32 0 Z`} fill="#e9a93b" stroke="#b67a1c" />
          <path d={`M${HIVE.x - 14} ${HIVE.y - 8} h28 M${HIVE.x - 10} ${HIVE.y - 15} h20`} stroke="#b67a1c" />
          <circle cx={HIVE.x} cy={HIVE.y - 4} r="3.5" fill="#5a3a12" />
        </g>
        {FLOWERS.map((f, i) => (
          <g key={i}>
            <g transform={`translate(${f.x} ${f.y + 4})`}>
              <Sprite id={f.id} size={100} face="front" />
            </g>
            {s.fruit[i] && <circle cx={f.x + 12} cy={f.y + 6} r="6" fill="#e5533d" stroke="#b8392a" className="flower-part" />}
          </g>
        ))}
        <g transform={`translate(${s.x} ${s.y})`}>
          <Sprite id="bee" size={52} flip={s.tx < s.x} />
          {s.carrying && <circle cx="-2" cy="8" r="2.6" fill="#f5b700" stroke="#c98a00" />}
        </g>
      </svg>
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
      <svg viewBox="0 0 400 200" className="arcade-board meadow">
        <path d="M20 112 H380 M20 178 H380" stroke="#fff" strokeWidth="2" strokeDasharray="8 8" opacity="0.7" />
        <path d="M352 60 V186" stroke="#3a2a10" strokeWidth="3" />
        <path d="M352 60 h26 v16 h-26 Z" fill="#e5533d" />
        <g transform={`translate(${hare} 96) ${napping ? 'rotate(-12)' : ''}`}>
          <g transform="translate(0 -8)">
            <Sprite id="rabbit" size={84} />
          </g>
          {napping && (
            <text x="24" y="-22" fontSize="13" fill="#3a2a10" fontWeight="700">
              z z z
            </text>
          )}
        </g>
        <g transform={`translate(${tort} 164) ${trip ? 'rotate(14)' : ''}`}>
          <g transform="translate(0 -8)">
            <Sprite id="tortoise" size={84} />
          </g>
        </g>
      </svg>
      <button type="button" className={`btn go arcade-tap${trip ? ' shake' : ''}`} onClick={tap} aria-label={puzzle.prompt[lang as Lang]} disabled={done}>
        <Footprints className="i" />
      </button>
    </div>
  );
}

// ---------- badminton: keep the shuttlecock up ----------
function KeepUp({ onSolved, onWrong }: P) {
  const GOAL = 10;
  const g = useRef({ x: 200, y: 30, vx: 30, vy: 0, rx: 200, hits: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
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
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board court" onPointerMove={(e) => (s.rx = clamp(at(e).x, 30, W - 30))} onPointerDown={(e) => (s.rx = clamp(at(e).x, 30, W - 30))}>
        <path d={`M200 ${H} V150`} stroke="#fff" strokeWidth="2" opacity="0.6" />
        <g transform={`translate(${s.x} ${s.y}) rotate(${(Math.atan2(s.vy, s.vx) * 180) / Math.PI - 90})`}>
          <Sprite id="shuttlecock" size={36} face="front" />
        </g>
        <g transform={`translate(${s.rx} 206)`}>
          <ellipse rx="32" ry="7" fill="none" stroke="#e5533d" strokeWidth="3" />
          <path d="M-22 0 H22 M-12 -6 V6 M0 -7 V7 M12 -6 V6" stroke="#e5533d" opacity="0.5" />
          <path d="M32 2 L52 14" stroke="#3a2a10" strokeWidth="4" strokeLinecap="round" />
        </g>
      </svg>
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
  const skin = `hsl(${h} 45% ${l}%)`;
  return (
    <div className="arcade">
      <Score n={round} of={3} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board">
        <rect width={W} height={H} fill={`hsl(${target.h} 45% ${target.l}%)`} />
        {[40, 120, 215, 300, 360, 80, 260].map((x, i) => (
          <ellipse key={x} cx={x} cy={30 + ((i * 67) % 190)} rx={22 + (i % 3) * 8} ry={12 + (i % 2) * 6} fill={`hsl(${target.h} 40% ${target.l + (i % 2 ? 5 : -5)}%)`} />
        ))}
        <defs>
          <mask id="octo-shape">
            <g transform="translate(200 128)" style={{ filter: 'brightness(0) invert(1)' }}>
              <Sprite id="octopus" size={170} face="front" />
            </g>
          </mask>
        </defs>
        <rect width={W} height={H} fill={skin} mask="url(#octo-shape)" style={{ transition: 'fill 0.15s' }} />
        <g transform="translate(200 128)" style={{ mixBlendMode: 'multiply', filter: 'grayscale(1) brightness(1.5)', transition: 'opacity 0.5s' }} opacity={hidden ? 0.3 : 1}>
          <Sprite id="octopus" size={170} face="front" />
        </g>
      </svg>
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
const MOVE: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const ICON = { N: ArrowUp, E: ArrowRight, S: ArrowDown, W: ArrowLeft };
const START: [number, number] = [4, 2];
const ROUTES: [Dir, number][][] = [
  [['N', 2], ['E', 3], ['S', 1]],
  [['W', 3], ['S', 2], ['E', 1]],
  [['E', 2], ['N', 1], ['W', 4]],
  [['S', 2], ['W', 2], ['N', 3]],
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
      const d = ({ ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W' } as Record<string, Dir>)[e.key];
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
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board map">
        {Array.from({ length: 45 }, (_, i) => (
          <circle key={i} cx={40 + (i % 9) * 40} cy={40 + Math.floor(i / 9) * 40} r="3" fill="#b89b6a" />
        ))}
        <path d="M60 150 q20 -30 40 0 q20 30 40 0" stroke="#7fb6d9" strokeWidth="6" fill="none" opacity="0.6" />
        <path d="M290 60 l10 -22 l10 22 Z M306 66 l10 -22 l10 22 Z" fill="#6fae4e" opacity="0.7" />
        <g transform="translate(366 30)">
          <path d="M0 -16 L4 0 L0 16 L-4 0 Z" fill="#e5533d" />
          <text y="-19" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5a3a12">
            {LETTER[lang].N}
          </text>
        </g>
        {holes.map((h, i) => (
          <ellipse key={i} cx={px(h)[0]} cy={px(h)[1]} rx="9" ry="5" fill="#8a6a3c" />
        ))}
        <polyline points={path.map((p) => px(p).join(',')).join(' ')} fill="none" stroke="#e5533d" strokeWidth="3" strokeDasharray="5 5" />
        <path d={`M${px(START)[0]} ${px(START)[1]} v-18 h12 v8 h-12`} stroke="#e5533d" strokeWidth="2" fill="#e5533d" />
        {found ? (
          <g transform={`translate(${px(goal)[0]} ${px(goal)[1]})`} className="flower-part">
            <rect x="-13" y="-8" width="26" height="17" rx="3" fill="#b6782c" stroke="#5a3a12" />
            <path d="M-13 -2 H13" stroke="#5a3a12" />
            <circle r="3" fill="#ffd24a" />
          </g>
        ) : (
          <circle cx={px(here)[0]} cy={px(here)[1]} r="8" fill="#2f7fd0" stroke="#fff" strokeWidth="2" />
        )}
      </svg>
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
function Candle({ dashed }: { dashed?: boolean }) {
  return dashed ? (
    <path d="M-6 25 V-10 H6 V25 Z M0 -10 C-7 -18 0 -22 0 -28 C0 -22 7 -18 0 -10" fill="none" stroke="#fff" strokeDasharray="3 3" />
  ) : (
    <>
      <rect x="-6" y="-10" width="12" height="35" rx="2" fill="#f6efe0" stroke="#c9b98e" />
      <path d="M0 -10 C-7 -18 0 -22 0 -28 C0 -22 7 -18 0 -10" fill="#ffb300" />
    </>
  );
}
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
  const move = (e: RPointerEvent<SVGSVGElement>) => setY(clamp(at(e).y, 42, 198));
  return (
    <div className="arcade">
      <Score n={round} of={3} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board" onPointerMove={move} onPointerDown={move}>
        <rect width="200" height={H} fill="#fdf3d6" />
        <rect x="200" width="200" height={H} fill="#1d2433" />
        <path d={`M200 0 V116 M200 124 V${H}`} stroke="#5a4a3a" strokeWidth="6" />
        <path d={`M330 12 V${H - 12}`} stroke="#e8edf5" strokeWidth="4" />
        <path d={`M70 ${y - 28} L330 ${240 - (y - 28)} M70 ${y + 25} L330 ${240 - (y + 25)}`} stroke="#ffb300" strokeWidth="1.5" opacity="0.8" />
        <g transform={`translate(70 ${y})`}>
          <Candle />
        </g>
        <g transform={`translate(330 ${target}) scale(1 -1)`}>
          <Candle dashed />
        </g>
        <g transform={`translate(330 ${img}) scale(1 -1)`} opacity={on ? 1 : 0.75}>
          <Candle />
        </g>
      </svg>
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
            style={{ backgroundPosition: `${((piece % COLS) / (COLS - 1)) * 100}% ${(Math.floor(piece / COLS) / (ROWS - 1)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- lioness: creep while the zebra grazes, freeze when it looks ----------
function Stalk({ onSolved, onWrong }: P) {
  const g = useRef({ x: 30, hold: false, phase: 'graze' as 'graze' | 'warn' | 'look', left: 2.2, won: false });
  const [, draw] = useState(0);
  const s = g.current;
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
  return (
    <div className="arcade">
      <progress className="arcade-bar" value={(s.x - 30) / 255} max={1} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board savanna" onPointerDown={() => (s.hold = true)} onPointerUp={() => (s.hold = false)} onPointerLeave={() => (s.hold = false)}>
        <rect y="170" width={W} height="70" fill="#c9a94f" />
        <g transform="translate(335 150)">
          <g transform="translate(0 -16)">
            <Sprite id="zebra" size={124} flip={s.phase === 'look'} />
          </g>
          {s.phase !== 'graze' && (
            <text x="-40" y="-70" fontSize="26" fontWeight="800" fill={s.phase === 'look' ? '#e5533d' : '#f5b700'}>
              !
            </text>
          )}
        </g>
        <g transform={`translate(${s.x} 176)`}>
          <g transform="translate(0 -16)">
            <Sprite id="lion" size={112} />
          </g>
        </g>
        {Array.from({ length: 34 }, (_, i) => (
          <path key={i} d={`M${i * 12 + 4} 240 q${(i % 3) * 3 - 3} -30 ${(i % 5) - 2} -${46 + (i % 4) * 9}`} stroke="#8fae3c" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />
        ))}
      </svg>
    </div>
  );
}

// ---------- sunflower: face the sun to grow ----------
function SunTrack({ lang, onSolved }: P) {
  const NEED = 11;
  const g = useRef({ t: 0, px: 320, grown: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
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
  const move = (e: RPointerEvent<SVGSVGElement>) => !s.won && (s.px = at(e).x);
  return (
    <div className="arcade">
      <progress className="arcade-bar" value={s.grown / NEED} max={1} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board" onPointerMove={move} onPointerDown={move} style={{ background: night ? '#27365a' : 'linear-gradient(#bfe6fb, #e9f7ff)', transition: 'background 0.6s' }}>
        {!night && <circle cx={sun.x} cy={sun.y} r="17" fill="#ffd24a" stroke="#f5b700" strokeWidth="3" />}
        <rect y="196" width={W} height="44" fill="#9bd67a" />
        <text x="384" y="190" textAnchor="end" fontSize="13" fontWeight="700" fill="#5a3a12">
          {LETTER[lang].E}
        </text>
        <text x="16" y="190" fontSize="13" fontWeight="700" fill="#5a3a12">
          {LETTER[lang].W}
        </text>
        <g transform={`translate(200 202) rotate(${lean * 16}) translate(0 ${-tall / 2})`} opacity={facing || s.won ? 1 : 0.75}>
          <Sprite id="sunflower" size={tall} face="front" />
        </g>
      </svg>
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
function BugHunt({ onSolved }: P) {
  const GOAL = 10;
  const mk = (id: number) => ({ id, x: 30 + Math.random() * 340, y: 30 + Math.random() * 180, a: Math.random() * 6.28, v: 45 + Math.random() * 40 });
  const g = useRef({ bugs: [0, 1, 2, 3].map(mk), n: 4, got: 0, won: false });
  const [, draw] = useState(0);
  const s = g.current;
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
  const tap = (e: RPointerEvent<SVGSVGElement>) => {
    const p = at(e);
    const hit = s.bugs.find((b) => Math.hypot(b.x - p.x, b.y - p.y) < 22);
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
  return (
    <div className="arcade">
      <Score n={s.got} of={GOAL} />
      <svg viewBox={`0 0 ${W} ${H}`} className="arcade-board" onPointerDown={tap}>
        <rect width={W} height={H} fill="#1f6b4a" />
        <path d="M0 40 H120 V110 H260 V60 H400 M60 240 V170 H200 V200 H330 V130 H400 M140 0 V70 M300 240 V190" stroke="#3fa877" strokeWidth="3" fill="none" />
        {[[120, 110], [260, 60], [200, 170], [330, 130], [140, 70], [60, 170]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#d9c86a" />
        ))}
        <rect x="160" y="88" width="70" height="46" rx="4" fill="#22303c" stroke="#8aa0b0" />
        <rect x="286" y="150" width="34" height="24" rx="3" fill="#22303c" stroke="#8aa0b0" />
        {s.bugs.map((b) => (
          <g key={b.id} transform={`translate(${b.x} ${b.y}) rotate(${(b.a * 180) / Math.PI + 90})`}>
            <Sprite id="monarch" size={44} face="top" style={{ filter: 'grayscale(0.8) sepia(0.6) brightness(0.95)' }} />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------- writing: join the dots in the order the strokes are written ----------
type Pt = [number, number];
const GLYPHS: Pt[][][] = [
  // the Chinese character for mountain: middle stroke first
  [[[200, 40], [200, 180]], [[130, 100], [130, 180], [270, 180]], [[270, 100], [270, 180]]],
  // the Arabic letter ba: the bowl is drawn from right to left, then the dot underneath
  [[[300, 80], [296, 130], [250, 150], [150, 150], [104, 130], [100, 80]], [[200, 200]]],
  // the Latin letter A: left to right
  [[[130, 200], [200, 40], [270, 200]], [[160, 140], [240, 140]]],
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
              <polyline points={drawn.map((p) => p.join(',')).join(' ')} fill="none" stroke="#1d2433" strokeWidth={done ? 14 : 8} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke-width 0.3s' }} />
              {stroke.length === 1 && n > first && <circle cx={stroke[0][0]} cy={stroke[0][1]} r={done ? 9 : 6} fill="#1d2433" />}
              {!done &&
                stroke.map((p, k) => (
                  <g key={k} opacity={first + k < n ? 0.25 : 1}>
                    <circle cx={p[0]} cy={p[1]} r={first + k === n ? 13 : 10} fill={first + k === n ? '#ffd24a' : '#fff'} stroke="#2f7fd0" strokeWidth="2" className={first + k === n ? 'arcade-glow' : ''} />
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

const GAMES = {
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
