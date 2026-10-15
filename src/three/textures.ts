import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/**
 * All glow/flare/emoji textures are drawn on a canvas at runtime:
 * zero image downloads, tiny bundle, crisp at any size.
 */

const cache = new Map<string, CanvasTexture>();

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Soft round glow with a lens-flare star: the hotspot marker. */
export function flareTexture() {
  return make('flare', 256, (g, s) => {
    const h = s / 2;
    const rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.12, 'rgba(255,255,240,0.95)');
    rg.addColorStop(0.3, 'rgba(180,235,255,0.45)');
    rg.addColorStop(1, 'rgba(120,200,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
    // four-point star streaks
    g.globalCompositeOperation = 'lighter';
    for (const [w, hgt] of [
      [s, 6],
      [6, s],
    ]) {
      const lg = g.createRadialGradient(h, h, 0, h, h, h);
      lg.addColorStop(0, 'rgba(255,255,255,0.9)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(h - w / 2, h - hgt / 2, w, hgt);
    }
  });
}

/** Generic soft glow disc, tinted by the material color. */
export function glowTexture() {
  return make('glow', 128, (g, s) => {
    const h = s / 2;
    const rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
  });
}

/** Radial glossy floor: bright center fading to the rim color. */
export function floorTexture(center: string, rim: string) {
  return make(`floor:${center}:${rim}`, 512, (g, s) => {
    const h = s / 2;
    const rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, center);
    rg.addColorStop(1, rim);
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 3;
    for (let r = 40; r < h; r += 46) {
      g.beginPath();
      g.arc(h, h, r, 0, Math.PI * 2);
      g.stroke();
    }
  });
}

/**
 * Tiling ground detail: soft blotches plus fine blade strokes, all in greys
 * that *multiply* the terrain's vertex colours. One canvas, repeated across
 * the whole ground, so what we walk on reads as grass up close instead of
 * flat paint. Every mark is drawn nine times, once per neighbouring tile
 * offset, so nothing is clipped at the edges and the tile seams disappear.
 */
export function groundTexture() {
  const t = make('ground', 512, (g, s) => {
    const r = (n: number) => Math.random() * n;
    /**
     * Run `draw` at this tile, plus the neighbouring offsets a mark of radius
     * `reach` could bleed into — so marks continue across the seam without
     * paying for nine copies of every single one.
     */
    const wrapped = (x: number, y: number, reach: number, draw: (dx: number, dy: number) => void) => {
      const xs = x < reach ? [0, s] : x > s - reach ? [0, -s] : [0];
      const ys = y < reach ? [0, s] : y > s - reach ? [0, -s] : [0];
      for (const dx of xs) for (const dy of ys) draw(dx, dy);
    };
    g.fillStyle = '#efefef';
    g.fillRect(0, 0, s, s);
    // broad patches: low- then mid-frequency, so the ground is never uniform
    for (const [n, rad, a] of [
      [30, 96, 0.16],
      [90, 34, 0.2],
    ] as const) {
      for (let i = 0; i < n; i++) {
        const x = r(s);
        const y = r(s);
        const light = Math.random() > 0.5;
        wrapped(x, y, rad, (dx, dy) => {
          const rg = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
          rg.addColorStop(0, `rgba(${light ? '255,255,255' : '96,96,96'},${a})`);
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = rg;
          g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
        });
      }
    }
    // fine blades
    g.lineCap = 'round';
    for (let i = 0; i < 2200; i++) {
      const x = r(s);
      const y = r(s);
      const len = 5 + r(11);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const ex = Math.cos(ang) * len;
      const ey = Math.sin(ang) * len;
      g.strokeStyle = Math.random() > 0.45 ? 'rgba(74,74,74,0.18)' : 'rgba(255,255,255,0.2)';
      g.lineWidth = 1 + r(1.2);
      wrapped(x, y, len, (dx, dy) => {
        g.beginPath();
        g.moveTo(x + dx, y + dy);
        g.lineTo(x + dx + ex, y + dy + ey);
        g.stroke();
      });
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * The Great Hall's floor, drawn as one inlaid medallion instead of a plain
 * gradient: marble veining, concentric bands, a sunburst compass at the
 * centre, and a pale wedge of light running out to each doorway so the floor
 * itself tells you where to walk.
 *
 * The disc's UVs map straight onto the canvas, so canvas x/y are world x/z:
 * an angle here is the same angle out in the hall.
 *
 * @param spokes  directions (radians, as `Math.atan2(x, -z)`) to run a wedge to
 * @param warm    one direction that gets the warm amber wedge (Wondoo's Den)
 */
export function hallFloorTexture(spokes: number[], warm: number) {
  const key = `hall-mosaic2:${spokes.map((s) => s.toFixed(2)).join(',')}:${warm.toFixed(2)}`;
  const t = make(key, 1024, (g, s) => {
    const c = s / 2;
    const R = s / 2;
    // world radius 21 m maps to R, so metres are easy to think in
    const m = R / 21;
    const ring = (r: number, w: number, style: string) => {
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.lineWidth = w;
      g.strokeStyle = style;
      g.stroke();
    };

    const bg = g.createRadialGradient(c, c, 0, c, c, R);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.4, '#e4f4ff');
    bg.addColorStop(0.8, '#bfe6f8');
    bg.addColorStop(1, '#8fcdea');
    g.fillStyle = bg;
    g.fillRect(0, 0, s, s);

    // mosaic: rings of small tiles in soft pastels. Colours run in slow
    // spirals so the floor has a pattern, but every tile stays pale enough
    // that the doorways and the animals are still what you look at.
    const TILES = ['#f7fcff', '#d3ecfa', '#8fcdee', '#a8e0bd', '#f9d98c', '#f4b3a6', '#c7b6ee', '#7fd3d6'];
    const tileLen = 0.82 * m;
    for (let ri = 0, r0 = 3.5 * m; r0 < 20.6 * m; ri++, r0 += tileLen) {
      const r1 = r0 + tileLen;
      const n = Math.max(12, Math.round((2 * Math.PI * ((r0 + r1) / 2)) / tileLen / 11) * 11);
      const off = (ri % 2) * 0.5; // brick bond: each ring is offset by half a tile
      for (let i = 0; i < n; i++) {
        const a0 = ((i + off) / n) * Math.PI * 2;
        const a1 = ((i + 1 + off) / n) * Math.PI * 2;
        // eleven slow spiral arms, one per doorway, alternating with plain tiles
        const arm = Math.floor(((i / n) * 11 + ri * 0.35) % 11);
        const accent = (arm + ri) % 3 === 0;
        const base = accent ? TILES[2 + ((arm + Math.floor(ri / 3)) % 6)] : TILES[(i + ri) % 2];
        g.beginPath();
        g.arc(c, c, r1, a0, a1);
        g.arc(c, c, r0, a1, a0, true);
        g.closePath();
        g.fillStyle = base;
        g.fill();
        // each tile a touch lighter or darker than its neighbour, like fired glaze
        g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${Math.random() * 0.22})` : `rgba(70,130,170,${Math.random() * 0.07})`;
        g.fill();
        g.lineWidth = 0.055 * m;
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.stroke();
      }
    }

    // wedges of light out to the doorways
    for (const a of spokes) {
      const isWarm = Math.abs(Math.atan2(Math.sin(a - warm), Math.cos(a - warm))) < 0.01;
      const dx = Math.sin(a);
      const dy = -Math.cos(a); // canvas y follows world z, so this points at the doorway
      const half = 0.075; // radians: a walkway, not a spotlight
      const grad = g.createLinearGradient(c, c, c + dx * R, c + dy * R);
      grad.addColorStop(0, isWarm ? 'rgba(255, 206, 130, 0.85)' : 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.7, isWarm ? 'rgba(255, 216, 150, 0.7)' : 'rgba(163, 222, 248, 0.6)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, R * 0.98, Math.atan2(dy, dx) - half, Math.atan2(dy, dx) + half);
      g.closePath();
      g.fill();
      g.lineWidth = 0.09 * m;
      g.strokeStyle = isWarm ? 'rgba(214, 150, 60, 0.4)' : 'rgba(86, 173, 214, 0.45)';
      g.stroke();
    }

    // concentric bands
    ring(3.4 * m, 0.5 * m, 'rgba(255,255,255,0.9)');
    ring(3.8 * m, 0.12 * m, 'rgba(86, 173, 214, 0.5)');
    ring(9.5 * m, 0.1 * m, 'rgba(86, 173, 214, 0.35)');
    ring(12.6 * m, 0.55 * m, 'rgba(255,255,255,0.75)');
    ring(12.6 * m, 0.09 * m, 'rgba(86, 173, 214, 0.3)');
    ring(17.2 * m, 0.14 * m, 'rgba(86, 173, 214, 0.35)');

    // centre medallion: a sunburst compass under the fountain
    const med = g.createRadialGradient(c, c, 0, c, c, 3.4 * m);
    med.addColorStop(0, 'rgba(255,255,255,0.95)');
    med.addColorStop(1, 'rgba(203, 238, 255, 0.85)');
    g.fillStyle = med;
    g.beginPath();
    g.arc(c, c, 3.4 * m, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const long = i % 4 === 0;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * 1.5 * m, c + Math.sin(a) * 1.5 * m);
      g.lineTo(c + Math.cos(a) * (long ? 3.3 : 2.6) * m, c + Math.sin(a) * (long ? 3.3 : 2.6) * m);
      g.lineWidth = (long ? 0.16 : 0.07) * m;
      g.strokeStyle = long ? 'rgba(86, 173, 214, 0.75)' : 'rgba(86, 173, 214, 0.4)';
      g.stroke();
    }
    ring(1.4 * m, 0.12 * m, 'rgba(86, 173, 214, 0.6)');
    ring(3.42 * m, 0.2 * m, 'rgba(86, 173, 214, 0.55)');
  });
  // the floor is always seen at a grazing angle, where mipmaps alone smear
  t.anisotropy = 8;
  return t;
}
