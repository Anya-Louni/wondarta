import { Group, type Material, type Texture } from 'three';
import { G, M, ball, eyes, flatShape, limb, mesh, pattern, rnd, tube } from './kit';

/**
 * Stylized "toy" animals. Every model faces +Z, stands on y = 0, and is
 * built from cached primitives (no downloads, a few hundred triangles each).
 */

type V3 = [number, number, number];

interface Quad {
  len: number;
  h: number;
  w: number;
  legH: number;
  legR: number;
  skin: Material;
  legSkin?: Material;
  hoof?: string;
}

/** Shared four-legged body. Returns the body centre height for attaching heads. */
function quadBody(o: Quad) {
  const g = new Group();
  const cy = o.legH + o.h * 0.42;
  g.add(ball(o.skin, [0, cy, 0], [o.w / 2, o.h / 2, o.len / 2]));
  const lx = o.w * 0.27;
  const lz = o.len * 0.3;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      g.add(limb(o.legSkin ?? o.skin, [sx * lx, cy, sz * lz], [sx * lx, 0.04, sz * lz], o.legR, 0.82));
      if (o.hoof) g.add(mesh(G.cyl(), M(o.hoof, { rough: 0.4 }), [sx * lx, 0.05, sz * lz], [o.legR * 0.85, 0.1, o.legR * 0.85]));
    }
  return { g, cy };
}

function tail(parent: Group, m: Material, from: V3, to: V3, r: number, tuft?: Material) {
  parent.add(limb(m, from, to, r, 0.5));
  if (tuft) parent.add(ball(tuft, to, r * 3));
}

// ---------------------------------------------------------------- savanna

export function elephant(opts: { color?: string; mammoth?: boolean } = {}) {
  const skin = M(opts.color ?? '#a3abb2', { rough: opts.mammoth ? 0.95 : 0.8 });
  const { g, cy } = quadBody({ len: 2.4, h: 1.6, w: 1.5, legH: 1.0, legR: 0.3, skin, hoof: opts.mammoth ? undefined : '#d9d2c3' });
  if (opts.mammoth) g.add(ball(skin, [0, cy + 0.75, 0.45], [0.6, 0.45, 0.6])); // shoulder hump
  const head = new Group();
  head.position.set(0, cy + 0.35, 1.2);
  head.add(ball(skin, [0, 0, 0], [0.62, opts.mammoth ? 0.75 : 0.65, 0.6]));
  const earScale: V3 = opts.mammoth ? [0.07, 0.28, 0.24] : [0.08, 0.62, 0.52];
  for (const s of [-1, 1]) {
    const ear = ball(skin, [s * 0.6, 0.05, -0.2], earScale);
    ear.rotation.y = s * 0.35;
    head.add(ear);
  }
  head.add(tube(skin, [[0, -0.1, 0.45], [0, -0.55, 0.66], [0, -1.0, 0.7], [0, -1.35, 0.62], [0.02, -1.48, 0.76]], 0.15));
  const ivory = M('#f4ecd6', { rough: 0.3, coat: 0.6 });
  for (const s of [-1, 1]) {
    head.add(
      tube(
        ivory,
        opts.mammoth
          ? [[s * 0.25, -0.3, 0.35], [s * 0.45, -0.85, 0.75], [s * 0.35, -0.9, 1.3], [s * 0.1, -0.45, 1.5]]
          : [[s * 0.25, -0.3, 0.4], [s * 0.3, -0.62, 0.62], [s * 0.26, -0.72, 0.9]],
        opts.mammoth ? 0.08 : 0.06,
      ),
    );
  }
  eyes(head, 0.36, 0.12, 0.5, 0.055);
  g.add(head);
  tail(g, skin, [0, cy + 0.2, -1.15], [0, cy - 0.6, -1.3], 0.05, skin);
  return g;
}

export function lion() {
  const fur = M('#d9a24e', { rough: 0.85 });
  const mane = M('#9c521c', { rough: 1 });
  const cream = M('#f1d9a8', { rough: 0.8 });
  const { g, cy } = quadBody({ len: 1.6, h: 0.75, w: 0.68, legH: 0.55, legR: 0.12, skin: fur });
  const head = new Group();
  head.position.set(0, cy + 0.42, 0.85);
  head.add(ball(mane, [0, 0, -0.08], [0.48, 0.5, 0.36]));
  head.add(mesh(G.torus(0.42), mane, [0, 0, 0.02], [0.36, 0.38, 0.3]));
  head.add(ball(fur, [0, 0, 0.08], 0.3));
  head.add(ball(cream, [0, -0.1, 0.3], [0.17, 0.13, 0.13]));
  head.add(ball(M('#3a2518', { rough: 0.4 }), [0, -0.02, 0.41], [0.06, 0.04, 0.04]));
  for (const s of [-1, 1]) head.add(ball(fur, [s * 0.2, 0.24, 0.02], [0.08, 0.08, 0.05]));
  eyes(head, 0.11, 0.06, 0.32, 0.04, '#c98a2b');
  g.add(head);
  g.add(limb(fur, [0, cy + 0.2, 0.45], [0, cy + 0.38, 0.8], 0.2));
  tail(g, fur, [0, cy + 0.1, -0.78], [0, cy - 0.1, -1.4], 0.035, mane);
  return g;
}

const zebraStripes = () =>
  pattern(
    'zebra',
    (c, s) => {
      c.fillStyle = '#f7f5ef';
      c.fillRect(0, 0, s, s);
      c.fillStyle = '#1b1b1f';
      for (let x = 0; x < s; x += 32) {
        c.beginPath();
        c.moveTo(x, 0);
        c.bezierCurveTo(x + 18, s * 0.3, x - 8, s * 0.7, x + 10, s);
        c.lineTo(x + 24, s);
        c.bezierCurveTo(x + 6, s * 0.7, x + 32, s * 0.3, x + 14, 0);
        c.fill();
      }
    },
    [2, 1],
  );

export function zebra() {
  const skin = M('#ffffff', { rough: 0.7, map: zebraStripes() });
  const dark = M('#1b1b1f', { rough: 0.7 });
  const { g, cy } = quadBody({ len: 1.5, h: 0.75, w: 0.62, legH: 0.8, legR: 0.08, skin, hoof: '#1b1b1f' });
  g.add(limb(skin, [0, cy + 0.15, 0.55], [0, cy + 0.85, 0.95], 0.17, 0.8));
  g.add(mesh(G.cyl(), dark, [0, cy + 0.6, 0.8], [0.04, 0.8, 0.12], [0.55, 0, 0]));
  const head = new Group();
  head.position.set(0, cy + 0.88, 1.02);
  head.rotation.x = 0.55;
  head.add(ball(skin, [0, 0, 0.12], [0.16, 0.18, 0.36]));
  head.add(ball(dark, [0, -0.02, 0.44], [0.12, 0.12, 0.1]));
  for (const s of [-1, 1]) head.add(mesh(G.cone(), skin, [s * 0.1, 0.2, -0.05], [0.05, 0.18, 0.04]));
  eyes(head, 0.14, 0.06, 0.1, 0.035);
  g.add(head);
  tail(g, dark, [0, cy + 0.1, -0.72], [0, cy - 0.45, -0.85], 0.03, dark);
  return g;
}

const giraffeSpots = () =>
  pattern(
    'giraffe',
    (c, s) => {
      c.fillStyle = '#f3dfb1';
      c.fillRect(0, 0, s, s);
      c.fillStyle = '#b8692e';
      for (let y = 0; y < s; y += 42)
        for (let x = (y / 42) % 2 ? 21 : 0; x < s + 42; x += 42) {
          c.beginPath();
          c.roundRect(x - 17 + rnd() * 4, y + 3 + rnd() * 4, 32, 34, 9);
          c.fill();
        }
    },
    [2, 2],
  );

export function giraffe() {
  const skin = M('#ffffff', { rough: 0.75, map: giraffeSpots() });
  const horn = M('#6b4526', { rough: 0.7 });
  const { g, cy } = quadBody({ len: 1.3, h: 0.8, w: 0.62, legH: 1.45, legR: 0.08, skin, hoof: '#3b2a1f' });
  g.add(limb(skin, [0, cy + 0.2, 0.42], [0, cy + 2.0, 0.95], 0.13, 0.62));
  const head = new Group();
  head.position.set(0, cy + 2.05, 1.0);
  head.add(ball(skin, [0, 0, 0.12], [0.14, 0.15, 0.3]));
  head.add(ball(M('#e9c690', { rough: 0.7 }), [0, -0.04, 0.38], [0.1, 0.1, 0.09]));
  for (const s of [-1, 1]) {
    head.add(limb(horn, [s * 0.06, 0.1, -0.02], [s * 0.08, 0.3, -0.04], 0.025));
    head.add(ball(horn, [s * 0.08, 0.31, -0.04], 0.04));
    head.add(mesh(G.cone(), skin, [s * 0.15, 0.1, -0.06], [0.05, 0.14, 0.03], [0, 0, s * -1.1]));
  }
  eyes(head, 0.12, 0.05, 0.08, 0.035);
  g.add(head);
  g.add(mesh(G.cyl(), M('#6b4526', { rough: 1 }), [0, cy + 1.2, 0.62], [0.03, 1.8, 0.07], [0.46, 0, 0]));
  tail(g, skin, [0, cy + 0.1, -0.62], [0, cy - 0.55, -0.72], 0.025, horn);
  return g;
}

export function rhino() {
  const skin = M('#8e9297', { rough: 0.85 });
  const horn = M('#cfc3ae', { rough: 0.45, coat: 0.3 });
  const { g, cy } = quadBody({ len: 2.0, h: 1.1, w: 1.1, legH: 0.55, legR: 0.22, skin, hoof: '#6f7378' });
  const head = new Group();
  head.position.set(0, cy - 0.05, 1.05);
  head.rotation.x = 0.25;
  head.add(ball(skin, [0, 0, 0.2], [0.38, 0.36, 0.62]));
  head.add(mesh(G.cone(), horn, [0, 0.32, 0.7], [0.11, 0.45, 0.11], [-0.35, 0, 0]));
  head.add(mesh(G.cone(), horn, [0, 0.3, 0.38], [0.08, 0.22, 0.08], [-0.2, 0, 0]));
  for (const s of [-1, 1]) head.add(mesh(G.cone(), skin, [s * 0.22, 0.38, -0.2], [0.07, 0.18, 0.05]));
  eyes(head, 0.3, 0.08, 0.3, 0.04);
  g.add(head);
  tail(g, skin, [0, cy + 0.2, -0.98], [0, cy - 0.25, -1.12], 0.03, M('#3b3b3b'));
  return g;
}

export function hippo() {
  const skin = M('#8f7d93', { rough: 0.6, coat: 0.25 });
  const pink = M('#d9a0a8', { rough: 0.6 });
  const { g, cy } = quadBody({ len: 2.0, h: 1.1, w: 1.2, legH: 0.35, legR: 0.2, skin });
  g.add(ball(pink, [0, cy - 0.3, 0.1], [0.5, 0.25, 0.85]));
  const head = new Group();
  head.position.set(0, cy + 0.1, 1.05);
  head.add(ball(skin, [0, 0.1, 0], [0.45, 0.42, 0.45]));
  head.add(ball(skin, [0, -0.08, 0.38], [0.48, 0.32, 0.36]));
  for (const s of [-1, 1]) {
    head.add(ball(M('#3a2f3d'), [s * 0.14, 0.12, 0.72], [0.05, 0.03, 0.02]));
    head.add(ball(skin, [s * 0.28, 0.45, -0.1], [0.08, 0.06, 0.05]));
    head.add(ball(skin, [s * 0.2, 0.33, 0.12], 0.11));
  }
  eyes(head, 0.2, 0.4, 0.2, 0.045);
  g.add(head);
  tail(g, skin, [0, cy + 0.15, -1.0], [0, cy - 0.15, -1.12], 0.04);
  return g;
}

// ---------------------------------------------------------------- forest

export function fox() {
  const fur = M('#e0782f', { rough: 0.85 });
  const white = M('#fbf3e6', { rough: 0.85 });
  const dark = M('#3b2a22', { rough: 0.8 });
  const { g, cy } = quadBody({ len: 1.0, h: 0.42, w: 0.38, legH: 0.34, legR: 0.055, skin: fur, legSkin: dark });
  g.add(ball(white, [0, cy - 0.02, 0.38], [0.14, 0.17, 0.12]));
  const head = new Group();
  head.position.set(0, cy + 0.25, 0.55);
  head.add(ball(fur, [0, 0, 0], [0.19, 0.17, 0.18]));
  head.add(mesh(G.cone(), fur, [0, -0.04, 0.24], [0.1, 0.26, 0.09], [Math.PI / 2, 0, 0]));
  head.add(ball(white, [0, -0.08, 0.2], [0.11, 0.06, 0.12]));
  head.add(ball(dark, [0, -0.03, 0.38], 0.03));
  for (const s of [-1, 1]) head.add(mesh(G.cone(), fur, [s * 0.1, 0.2, -0.02], [0.07, 0.16, 0.04]));
  eyes(head, 0.08, 0.05, 0.14, 0.028);
  g.add(head);
  const t = ball(fur, [0, cy + 0.02, -0.72], [0.12, 0.12, 0.34]);
  t.rotation.x = 0.4;
  g.add(t, ball(white, [0, cy - 0.1, -1.0], [0.08, 0.08, 0.1]));
  return g;
}

export function deer() {
  const fur = M('#a2703f', { rough: 0.85 });
  const light = M('#f1e1c6', { rough: 0.85 });
  const antler = M('#d8c7a6', { rough: 0.6 });
  const { g, cy } = quadBody({ len: 1.1, h: 0.55, w: 0.45, legH: 0.78, legR: 0.05, skin: fur, hoof: '#2e241c' });
  g.add(limb(fur, [0, cy + 0.1, 0.4], [0, cy + 0.6, 0.62], 0.1, 0.75));
  const head = new Group();
  head.position.set(0, cy + 0.66, 0.68);
  head.add(ball(fur, [0, 0, 0.08], [0.13, 0.13, 0.22]));
  head.add(ball(M('#2e241c'), [0, -0.03, 0.3], 0.035));
  for (const s of [-1, 1]) {
    head.add(ball(fur, [s * 0.16, 0.1, -0.02], [0.1, 0.05, 0.03]));
    head.add(limb(antler, [s * 0.06, 0.1, 0], [s * 0.2, 0.42, -0.05], 0.02));
    head.add(limb(antler, [s * 0.15, 0.3, -0.04], [s * 0.08, 0.5, 0.05], 0.015));
    head.add(limb(antler, [s * 0.2, 0.42, -0.05], [s * 0.32, 0.55, -0.08], 0.015));
  }
  eyes(head, 0.09, 0.05, 0.1, 0.028);
  g.add(head);
  g.add(ball(light, [0, cy + 0.05, -0.55], [0.07, 0.09, 0.05]));
  return g;
}

export function rabbit(color = '#b9a58f') {
  const fur = M(color, { rough: 0.9 });
  const white = M('#fbf8f2', { rough: 0.9 });
  const pink = M('#f2b7c0', { rough: 0.8 });
  const g = new Group();
  g.add(ball(fur, [0, 0.3, 0], [0.26, 0.3, 0.32]));
  g.add(ball(fur, [0, 0.62, 0.2], 0.19));
  g.add(ball(white, [0, 0.56, 0.36], [0.08, 0.06, 0.05]));
  g.add(ball(pink, [0, 0.6, 0.39], 0.025));
  for (const s of [-1, 1]) {
    const ear = ball(fur, [s * 0.08, 0.95, 0.15], [0.05, 0.22, 0.035]);
    ear.rotation.z = s * -0.15;
    g.add(ear);
    g.add(ball(pink, [s * 0.08, 0.95, 0.18], [0.03, 0.16, 0.01]));
    g.add(ball(fur, [s * 0.14, 0.06, 0.08], [0.07, 0.05, 0.16]));
  }
  g.add(ball(white, [0, 0.28, -0.32], 0.08));
  eyes(g, 0.1, 0.68, 0.33, 0.026);
  return g;
}

export function bat() {
  const fur = M('#4a3b52', { rough: 0.8 });
  const wing = M('#5e4a66', { rough: 0.7, side: 2 });
  const g = new Group();
  g.add(ball(fur, [0, 0.5, 0], [0.13, 0.18, 0.12]));
  g.add(ball(fur, [0, 0.72, 0.03], 0.1));
  for (const s of [-1, 1]) {
    g.add(mesh(G.cone(), fur, [s * 0.06, 0.84, 0.02], [0.035, 0.1, 0.03]));
    const w = flatShape([[0, 0.12], [0.2, 0.2], [0.42, 0.14], [0.55, 0.08], [0.45, -0.02], [0.36, 0.04], [0.28, -0.06], [0.18, 0.02], [0.08, -0.08], [0, -0.1]], wing);
    w.position.set(s * 0.08, 0.52, 0);
    w.scale.set(s, 1, 1);
    w.rotation.y = s * 0.25;
    g.add(w);
  }
  eyes(g, 0.04, 0.75, 0.1, 0.018);
  return g;
}

// ---------------------------------------------------------------- birds

function bird(o: { body: string; belly: string; beak: string; head?: string; upright?: number; size?: number }) {
  const g = new Group();
  const body = M(o.body, { rough: 0.75 });
  const belly = M(o.belly, { rough: 0.8 });
  const beak = M(o.beak, { rough: 0.35, coat: 0.4 });
  const head = M(o.head ?? o.body, { rough: 0.75 });
  const u = o.upright ?? 0.35;
  const b = ball(body, [0, 0.42, 0], [0.24, 0.3, 0.28]);
  b.rotation.x = -u;
  g.add(b);
  g.add(ball(belly, [0, 0.38, 0.1], [0.19, 0.24, 0.18]));
  for (const s of [-1, 1]) {
    const w = ball(body, [s * 0.22, 0.42, -0.04], [0.06, 0.2, 0.24]);
    w.rotation.x = -u;
    g.add(w);
    g.add(limb(beak, [s * 0.08, 0.14, 0.02], [s * 0.08, 0.02, 0.04], 0.02));
    g.add(ball(beak, [s * 0.08, 0.02, 0.08], [0.05, 0.02, 0.07]));
  }
  g.add(ball(head, [0, 0.76, 0.06], 0.17));
  g.add(mesh(G.cone(), body, [0, 0.3, -0.32], [0.12, 0.25, 0.04], [-1.9, 0, 0]));
  return { g, beak, headY: 0.76 };
}

export function owl() {
  const { g, beak } = bird({ body: '#8a6a4a', belly: '#e3d0ae', beak: '#5a4632', upright: 0.05 });
  const face = M('#efe0c2', { rough: 0.8 });
  for (const s of [-1, 1]) {
    g.add(ball(face, [s * 0.075, 0.77, 0.14], [0.08, 0.09, 0.04]));
    g.add(mesh(G.cone(), M('#8a6a4a', { rough: 0.8 }), [s * 0.11, 0.93, 0.02], [0.04, 0.12, 0.03], [0, 0, s * -0.3]));
  }
  g.add(mesh(G.cone(), beak, [0, 0.72, 0.21], [0.025, 0.07, 0.025], [Math.PI, 0, 0]));
  eyes(g, 0.075, 0.78, 0.17, 0.034, '#f5b82e');
  return g;
}

export function eagle() {
  const { g, beak } = bird({ body: '#5a3b22', belly: '#6b4a2e', beak: '#f2b632', head: '#f7f4ee', upright: 0.3 });
  const hook = mesh(G.cone(), beak, [0, 0.72, 0.24], [0.045, 0.14, 0.04], [Math.PI / 2 + 0.4, 0, 0]);
  g.add(hook);
  eyes(g, 0.09, 0.8, 0.13, 0.025, '#e0a522');
  return g;
}

export function parrot() {
  const { g, beak } = bird({ body: '#d9272e', belly: '#e84a3a', beak: '#2b2b2b', upright: 0.45 });
  for (const s of [-1, 1]) g.add(ball(M('#2f6fe0', { rough: 0.6 }), [s * 0.23, 0.3, -0.12], [0.05, 0.15, 0.16]));
  g.add(ball(M('#f7d531', { rough: 0.6 }), [0, 0.4, -0.22], [0.14, 0.1, 0.1]));
  g.add(ball(M('#ffffff'), [0, 0.78, 0.15], [0.1, 0.07, 0.04]));
  g.add(mesh(G.torus(0.35, Math.PI), beak, [0, 0.72, 0.2], [0.06, 0.06, 0.06], [0, Math.PI / 2, 0]));
  g.add(mesh(G.cone(), M('#2f6fe0'), [0, 0.1, -0.35], [0.06, 0.45, 0.03], [-2.3, 0, 0]));
  eyes(g, 0.1, 0.82, 0.12, 0.024);
  return g;
}

export function penguin() {
  const g = new Group();
  const black = M('#1f2530', { rough: 0.5, coat: 0.3 });
  const white = M('#f7f7f4', { rough: 0.6 });
  const orange = M('#f29a2e', { rough: 0.4 });
  g.add(ball(black, [0, 0.5, 0], [0.28, 0.48, 0.26]));
  g.add(ball(white, [0, 0.46, 0.08], [0.22, 0.4, 0.2]));
  g.add(ball(black, [0, 0.98, 0.02], 0.18));
  for (const s of [-1, 1]) {
    g.add(ball(white, [s * 0.06, 0.98, 0.14], [0.06, 0.07, 0.04]));
    const f = ball(black, [s * 0.28, 0.55, 0], [0.05, 0.26, 0.1]);
    f.rotation.z = s * 0.3;
    g.add(f, ball(orange, [s * 0.1, 0.03, 0.12], [0.08, 0.03, 0.12]));
  }
  g.add(mesh(G.cone(), orange, [0, 0.95, 0.24], [0.04, 0.12, 0.03], [Math.PI / 2, 0, 0]));
  eyes(g, 0.065, 1.0, 0.17, 0.022);
  return g;
}

export function feather() {
  const g = new Group();
  const vane = flatShape([[0, 0], [0.12, 0.2], [0.14, 0.5], [0.08, 0.8], [0, 0.95], [-0.08, 0.8], [-0.13, 0.5], [-0.11, 0.2]], M('#ece5d6', { rough: 0.8, side: 2 }));
  g.add(vane, limb(M('#b9a78a'), [0, -0.15, 0.01], [0, 0.95, 0.01], 0.012));
  g.rotation.z = 0.5;
  g.position.y = 0.3;
  return g;
}

// ---------------------------------------------------------------- reptiles, fish, amphibians

const diamonds = (base: string, spot: string) =>
  pattern(
    `diamonds${base}${spot}`,
    (c, s) => {
      c.fillStyle = base;
      c.fillRect(0, 0, s, s);
      c.fillStyle = spot;
      for (let y = 0; y < s; y += 64)
        for (let x = 0; x < s; x += 64) {
          c.beginPath();
          c.moveTo(x + 32, y + 8);
          c.lineTo(x + 56, y + 32);
          c.lineTo(x + 32, y + 56);
          c.lineTo(x + 8, y + 32);
          c.fill();
        }
    },
    [6, 1],
  );

export function snake() {
  const skin = M('#ffffff', { rough: 0.45, coat: 0.3, map: diamonds('#5c9e3a', '#3c7424') });
  const g = new Group();
  const pts: V3[] = [];
  for (let i = 0; i <= 12; i++) pts.push([Math.sin(i * 0.7) * 0.35, 0.08, -0.9 + i * 0.13]);
  pts.push([0, 0.25, 0.75], [0, 0.4, 0.85]);
  g.add(tube(skin, pts, 0.08, 64));
  const head = ball(M('#5c9e3a', { rough: 0.45, coat: 0.3 }), [0, 0.42, 0.93], [0.11, 0.08, 0.14]);
  g.add(head, mesh(G.cyl(), M('#d8263a'), [0, 0.4, 1.1], [0.008, 0.12, 0.008], [Math.PI / 2, 0, 0]));
  eyes(g, 0.07, 0.47, 0.98, 0.022);
  return g;
}

const shellTex = (base: string, line: string) =>
  pattern(`shell${base}`, (c, s) => {
    c.fillStyle = base;
    c.fillRect(0, 0, s, s);
    c.strokeStyle = line;
    c.lineWidth = 6;
    const r = 30;
    for (let y = 0; y < s + r; y += r * 1.5)
      for (let x = (y / (r * 1.5)) % 2 ? r * 0.87 : 0; x < s + r; x += r * 1.73) {
        c.beginPath();
        for (let k = 0; k < 6; k++) c.lineTo(x + r * Math.cos((k * Math.PI) / 3), y + r * Math.sin((k * Math.PI) / 3));
        c.closePath();
        c.stroke();
      }
  });

export function turtle(opts: { tortoise?: boolean } = {}) {
  const g = new Group();
  const shell = M('#ffffff', { rough: 0.5, coat: 0.5, map: opts.tortoise ? shellTex('#8a6a3a', '#5a4020') : shellTex('#5d7a3a', '#3e5626') });
  const skin = M(opts.tortoise ? '#9c8a6a' : '#8fae6a', { rough: 0.8 });
  g.add(mesh(G.halfSphere(), shell, [0, 0.14, 0], [0.5, opts.tortoise ? 0.5 : 0.32, 0.6]));
  g.add(mesh(G.cyl(), M('#e3cf93'), [0, 0.13, 0], [0.48, 0.03, 0.58]));
  g.add(ball(skin, [0, 0.22, 0.68], [0.13, 0.12, 0.16]));
  g.add(limb(skin, [0, 0.16, 0.45], [0, 0.22, 0.62], 0.08));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) g.add(ball(skin, [sx * 0.4, 0.07, sz * 0.38], opts.tortoise ? [0.09, 0.1, 0.09] : [0.14, 0.04, 0.09]));
  eyes(g, 0.075, 0.26, 0.8, 0.022);
  return g;
}

export function lizard() {
  const skin = M('#6fae4a', { rough: 0.5, coat: 0.3 });
  const g = new Group();
  g.add(ball(skin, [0, 0.12, 0], [0.13, 0.09, 0.4]));
  g.add(ball(skin, [0, 0.14, 0.45], [0.1, 0.08, 0.15]));
  g.add(tube(skin, [[0, 0.1, -0.35], [0.1, 0.07, -0.7], [0.3, 0.05, -0.95], [0.45, 0.04, -1.05]], 0.045));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      g.add(limb(skin, [sx * 0.1, 0.1, sz * 0.22], [sx * 0.26, 0.02, sz * 0.28], 0.03));
      g.add(ball(skin, [sx * 0.27, 0.02, sz * 0.3], [0.05, 0.015, 0.05]));
    }
  eyes(g, 0.08, 0.18, 0.5, 0.022, '#f2c230');
  return g;
}

export function fish() {
  const g = new Group();
  const skin = M('#f29a2e', { rough: 0.35, coat: 0.5 });
  const fin = M('#f6c16a', { rough: 0.4, side: 2 });
  g.add(ball(skin, [0, 0.35, 0], [0.12, 0.2, 0.44]));
  g.add(ball(M('#fbe7c8'), [0, 0.28, 0.05], [0.1, 0.12, 0.34]));
  for (const z of [-0.12, 0.04]) g.add(mesh(G.torus(0.05), M('#ffffff', { rough: 0.4 }), [0, 0.35, z], [0.125, 0.2, 0.05]));
  const t = flatShape([[0, 0], [0.22, 0.16], [0.18, 0], [0.22, -0.16]], fin);
  t.position.set(0, 0.35, -0.35);
  t.rotation.y = Math.PI / 2;
  g.add(t);
  const d = flatShape([[-0.15, 0], [0.12, 0], [-0.05, 0.15]], fin);
  d.position.set(0, 0.56, 0);
  d.rotation.y = Math.PI / 2;
  g.add(d);
  eyes(g, 0.1, 0.4, 0.25, 0.03);
  return g;
}

export function frog(opts: { scale?: number; tail?: boolean } = {}) {
  const g = new Group();
  const skin = M('#5cb85c', { rough: 0.35, coat: 0.6 });
  const belly = M('#d8f0a8', { rough: 0.6 });
  g.add(ball(skin, [0, 0.2, 0], [0.3, 0.2, 0.32]));
  g.add(ball(belly, [0, 0.14, 0.12], [0.24, 0.12, 0.22]));
  for (const s of [-1, 1]) {
    g.add(ball(skin, [s * 0.14, 0.38, 0.14], 0.09));
    g.add(ball(skin, [s * 0.27, 0.09, -0.12], [0.1, 0.08, 0.2]));
    g.add(ball(skin, [s * 0.3, 0.02, 0.05], [0.09, 0.02, 0.12]));
    g.add(limb(skin, [s * 0.15, 0.12, 0.2], [s * 0.2, 0.02, 0.3], 0.035));
  }
  g.add(mesh(G.torus(0.04, Math.PI), M('#2d5a2d'), [0, 0.2, 0.3], [0.14, 0.06, 0.1], [0, 0, Math.PI]));
  eyes(g, 0.14, 0.4, 0.2, 0.045);
  if (opts.tail) g.add(mesh(G.cone(), skin, [0, 0.14, -0.4], [0.08, 0.3, 0.03], [-Math.PI / 2, 0, 0]));
  g.scale.setScalar(opts.scale ?? 1);
  return g;
}

export function tadpole() {
  const g = new Group();
  const skin = M('#4d5a3a', { rough: 0.4, coat: 0.5 });
  g.add(ball(skin, [0, 0.2, 0.1], [0.16, 0.13, 0.19]));
  g.add(tube(M('#6b7a55', { rough: 0.5, opacity: 0.85 }), [[0, 0.2, -0.05], [0.06, 0.2, -0.3], [-0.05, 0.2, -0.5], [0.04, 0.2, -0.66]], 0.035));
  eyes(g, 0.09, 0.26, 0.22, 0.025);
  return g;
}

export function frogspawn() {
  const g = new Group();
  const jelly = M('#dff1f7', { rough: 0.05, coat: 1, opacity: 0.55 });
  const dot = M('#1d2b36', { rough: 0.3 });
  for (let i = 0; i < 14; i++) {
    const p: V3 = [(rnd() - 0.5) * 0.7, 0.12 + rnd() * 0.35, (rnd() - 0.5) * 0.6];
    g.add(ball(jelly, p, 0.12), ball(dot, p, 0.035));
  }
  return g;
}

export function butterfly() {
  const g = new Group();
  const wingMap = pattern('butterfly', (c, s) => {
    c.fillStyle = '#1b1b1f';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#f28c28';
    c.beginPath();
    c.ellipse(s / 2, s / 2, s * 0.38, s * 0.36, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(s * 0.12 + i * s * 0.14, s * 0.1, 7, 0, Math.PI * 2);
      c.fill();
    }
  });
  const wing = M('#ffffff', { rough: 0.6, side: 2, map: wingMap });
  g.add(mesh(G.capsule(), M('#1b1b1f'), [0, 0.4, 0], [0.05, 0.28, 0.05], [Math.PI / 2, 0, 0]));
  for (const s of [-1, 1]) {
    const up = flatShape([[0, 0], [0.3, 0.3], [0.42, 0.12], [0.3, -0.05]], wing);
    up.position.set(0, 0.42, 0.03);
    up.scale.set(s, 1, 1);
    up.rotation.set(-Math.PI / 2, s * 0.45, 0, 'XYZ');
    const low = flatShape([[0, 0], [0.26, -0.05], [0.22, -0.25], [0.06, -0.22]], wing);
    low.position.copy(up.position);
    low.scale.set(s, 1, 1);
    low.rotation.copy(up.rotation);
    g.add(up, low);
    g.add(limb(M('#1b1b1f'), [s * 0.02, 0.42, 0.12], [s * 0.08, 0.58, 0.24], 0.008));
  }
  return g;
}

// ---------------------------------------------------------------- prehistoric

export function trex() {
  const skin = M('#5f8d4e', { rough: 0.6, coat: 0.2 });
  const belly = M('#c9d99a', { rough: 0.7 });
  const g = new Group();
  const b = ball(skin, [0, 1.3, 0], [0.45, 0.5, 0.85]);
  b.rotation.x = -0.25;
  g.add(b, ball(belly, [0, 1.18, 0.25], [0.35, 0.38, 0.55]));
  g.add(tube(skin, [[0, 1.3, -0.6], [0, 1.2, -1.2], [0, 1.0, -1.8], [0, 0.85, -2.3]], 0.2, 24));
  g.add(limb(skin, [0, 1.55, 0.55], [0, 1.95, 0.85], 0.28, 0.9));
  const head = new Group();
  head.position.set(0, 2.05, 1.05);
  head.add(ball(skin, [0, 0.05, 0.1], [0.3, 0.3, 0.55]));
  head.add(ball(belly, [0, -0.2, 0.15], [0.26, 0.1, 0.48]));
  for (let i = 0; i < 6; i++)
    for (const s of [-1, 1]) head.add(mesh(G.cone(), M('#ffffff'), [s * 0.2, -0.12, 0.2 + i * 0.08], [0.02, 0.06, 0.02], [Math.PI, 0, 0]));
  eyes(head, 0.22, 0.2, 0.25, 0.045, '#f2c230');
  g.add(head);
  for (const s of [-1, 1]) {
    g.add(ball(skin, [s * 0.3, 1.1, 0], [0.18, 0.4, 0.3]));
    g.add(limb(skin, [s * 0.3, 0.85, 0], [s * 0.32, 0.08, 0.15], 0.1, 0.8));
    g.add(ball(skin, [s * 0.32, 0.06, 0.28], [0.12, 0.06, 0.22]));
    g.add(limb(skin, [s * 0.3, 1.45, 0.65], [s * 0.35, 1.25, 0.85], 0.04));
  }
  return g;
}

export function diplodocus() {
  const skin = M('#8aa06a', { rough: 0.65 });
  const { g, cy } = quadBody({ len: 2.2, h: 1.1, w: 1.0, legH: 1.0, legR: 0.18, skin });
  g.add(tube(skin, [[0, cy + 0.2, 0.9], [0, cy + 1.0, 1.6], [0, cy + 1.9, 2.0], [0, cy + 2.4, 2.3]], 0.14, 24));
  const head = ball(skin, [0, cy + 2.45, 2.45], [0.15, 0.12, 0.25]);
  g.add(head);
  eyes(g, 0.1, cy + 2.52, 2.55, 0.03);
  g.add(tube(skin, [[0, cy, -1.0], [0, cy - 0.2, -1.8], [0.3, cy - 0.5, -2.8], [0.8, cy - 0.8, -3.4]], 0.12, 24));
  return g;
}

export function triceratops() {
  const skin = M('#b07a4a', { rough: 0.6, coat: 0.2 });
  const frill = M('#d99a5a', { rough: 0.6, side: 2 });
  const horn = M('#f2ead6', { rough: 0.4 });
  const { g, cy } = quadBody({ len: 2.0, h: 1.1, w: 1.1, legH: 0.6, legR: 0.2, skin });
  const head = new Group();
  head.position.set(0, cy + 0.1, 1.15);
  head.add(ball(skin, [0, 0, 0.15], [0.38, 0.35, 0.55]));
  head.add(mesh(G.cyl(), frill, [0, 0.35, -0.2], [0.75, 0.06, 0.6], [-1.1, 0, 0]));
  for (const s of [-1, 1]) head.add(mesh(G.cone(), horn, [s * 0.2, 0.42, 0.25], [0.07, 0.6, 0.07], [0.9, 0, 0]));
  head.add(mesh(G.cone(), horn, [0, 0.12, 0.7], [0.06, 0.25, 0.06], [0.6, 0, 0]));
  head.add(mesh(G.cone(), M('#8a5a34'), [0, -0.05, 0.72], [0.1, 0.15, 0.1], [2.2, 0, 0]));
  eyes(head, 0.3, 0.12, 0.35, 0.04);
  g.add(head);
  tail(g, skin, [0, cy, -0.95], [0, cy - 0.4, -1.8], 0.12);
  return g;
}

export function mammoth() {
  return elephant({ color: '#7a4e2d', mammoth: true });
}

// ---------------------------------------------------------------- ocean

/** Blue whale: long tapered body, broad flukes, pleated throat. */
export function whale() {
  const g = new Group();
  const skin = M('#4f7fae', { rough: 0.45, coat: 0.35 });
  const belly = M('#cfe0ec', { rough: 0.5 });
  const fin = M('#416d99', { rough: 0.5, side: 2 });
  g.add(ball(skin, [0, 0.5, 0], [0.3, 0.3, 0.95]));
  g.add(ball(skin, [0, 0.5, -0.85], [0.16, 0.16, 0.35]));
  g.add(ball(belly, [0, 0.36, 0.1], [0.24, 0.16, 0.72]));
  // pleats under the throat
  for (const x of [-0.12, 0, 0.12]) g.add(mesh(G.cyl(), M('#b9d2e2'), [x, 0.3, 0.45], [0.012, 0.5, 0.012], [Math.PI / 2, 0, 0]));
  const flukeL = flatShape([[0, 0], [0.34, 0.16], [0.44, 0.02], [0.3, -0.06]], fin);
  flukeL.position.set(0, 0.5, -1.15);
  flukeL.rotation.set(-Math.PI / 2, 0, 0);
  const flukeR = flukeL.clone();
  flukeR.scale.x = -1;
  g.add(flukeL, flukeR);
  const dorsal = flatShape([[-0.1, 0], [0.12, 0], [-0.02, 0.12]], fin);
  dorsal.position.set(0, 0.78, -0.5);
  dorsal.rotation.y = Math.PI / 2;
  g.add(dorsal);
  for (const s of [-1, 1]) {
    const flip = flatShape([[0, 0], [0.3, -0.1], [0.34, -0.2], [0.05, -0.1]], fin);
    flip.position.set(s * 0.26, 0.42, 0.35);
    flip.rotation.set(-Math.PI / 2.2, 0, s < 0 ? Math.PI : 0);
    g.add(flip);
  }
  eyes(g, 0.24, 0.56, 0.62, 0.035);
  return g;
}

/** Octopus: domed mantle and eight curling arms. */
export function octopus() {
  const g = new Group();
  const skin = M('#c3567f', { rough: 0.4, coat: 0.4 });
  const suck = M('#f2b3cb', { rough: 0.5 });
  g.add(mesh(G.halfSphere(), skin, [0, 0.42, 0], [0.34, 0.42, 0.34]));
  g.add(ball(skin, [0, 0.42, 0], [0.34, 0.2, 0.34]));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a);
    const z = Math.sin(a);
    const curl = i % 2 ? 0.5 : 0.34;
    g.add(
      tube(
        skin,
        [
          [x * 0.2, 0.4, z * 0.2],
          [x * 0.38, 0.24, z * 0.38],
          [x * 0.52, 0.1, z * 0.52],
          [x * (0.52 + curl * 0.5), 0.05, z * (0.52 + curl * 0.5)],
        ],
        0.055,
        14,
      ),
    );
    g.add(ball(suck, [x * (0.56 + curl * 0.5), 0.045, z * (0.56 + curl * 0.5)], 0.035));
  }
  eyes(g, 0.16, 0.5, 0.27, 0.06, '#ffd96b');
  return g;
}

/** Jellyfish: translucent bell with trailing tentacles. */
export function jellyfish() {
  const g = new Group();
  const bell = M('#d9b8ff', { rough: 0.1, coat: 1, opacity: 0.75 });
  const frill = M('#f0dcff', { rough: 0.2, opacity: 0.8 });
  g.add(mesh(G.halfSphere(), bell, [0, 0.62, 0], [0.34, 0.3, 0.34]));
  g.add(mesh(G.torus(0.04), frill, [0, 0.62, 0], [0.34, 0.34, 0.2], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.2;
    const z = Math.sin(a) * 0.2;
    g.add(tube(frill, [[x, 0.6, z], [x * 1.3, 0.4, z * 1.3], [x * 0.7, 0.2, z * 0.7], [x * 1.2, 0.03, z * 1.2]], 0.018, 16));
  }
  return g;
}

/** Clownfish: orange with three white bands and black-edged fins. */
export function clownfish() {
  const g = new Group();
  const body = M('#f4772b', { rough: 0.3, coat: 0.6 });
  const band = M('#ffffff', { rough: 0.3 });
  const fin = M('#1d2733', { rough: 0.45, side: 2 });
  g.add(ball(body, [0, 0.35, 0], [0.13, 0.2, 0.4]));
  for (const [z, w] of [
    [0.18, 0.05],
    [-0.02, 0.06],
    [-0.24, 0.04],
  ] as const) {
    g.add(ball(band, [0, 0.35, z], [0.132, 0.202, w]));
  }
  const t = flatShape([[0, 0], [0.2, 0.15], [0.16, 0], [0.2, -0.15]], fin);
  t.position.set(0, 0.35, -0.34);
  t.rotation.y = Math.PI / 2;
  g.add(t);
  const d = flatShape([[-0.14, 0], [0.12, 0], [-0.04, 0.12]], fin);
  d.position.set(0, 0.54, 0);
  d.rotation.y = Math.PI / 2;
  g.add(d);
  eyes(g, 0.1, 0.4, 0.24, 0.035);
  return g;
}

/** Sea star: five tapering arms with a pebbled top. */
export function starfish() {
  const g = new Group();
  const skin = M('#f2994a', { rough: 0.7 });
  const dots = M('#ffd9a8', { rough: 0.7 });
  g.add(ball(skin, [0, 0.06, 0], [0.18, 0.06, 0.18]));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const x = Math.cos(a);
    const z = Math.sin(a);
    g.add(limb(skin, [x * 0.12, 0.05, z * 0.12], [x * 0.46, 0.03, z * 0.46], 0.09, 0.25));
    g.add(ball(dots, [x * 0.26, 0.09, z * 0.26], 0.03));
  }
  return g;
}

/** Crab: shell, claws and eyestalks. */
export function crab() {
  const g = new Group();
  const shell = M('#e0533d', { rough: 0.4, coat: 0.4 });
  const pale = M('#ffb9a3', { rough: 0.5 });
  g.add(ball(shell, [0, 0.16, 0], [0.3, 0.14, 0.24]));
  g.add(ball(pale, [0, 0.1, 0.04], [0.24, 0.07, 0.18]));
  for (const s of [-1, 1]) {
    g.add(limb(shell, [s * 0.24, 0.16, 0.1], [s * 0.42, 0.14, 0.24], 0.035));
    g.add(ball(shell, [s * 0.5, 0.15, 0.3], [0.1, 0.07, 0.06]));
    g.add(ball(pale, [s * 0.57, 0.12, 0.33], [0.07, 0.03, 0.05]));
    for (let i = 0; i < 3; i++) {
      const z = 0.06 - i * 0.12;
      g.add(limb(shell, [s * 0.24, 0.14, z], [s * 0.44, 0.02, z - 0.06], 0.022));
    }
    g.add(limb(shell, [s * 0.08, 0.26, 0.12], [s * 0.1, 0.33, 0.14], 0.016));
    g.add(ball(M('#141b22', { rough: 0.15, coat: 1 }), [s * 0.1, 0.35, 0.14], 0.033));
  }
  return g;
}

/** Branching coral head: the reef builder itself. */
export function coral() {
  const g = new Group();
  const a = M('#ff7fa8', { rough: 0.65 });
  const b = M('#ffb36b', { rough: 0.65 });
  g.add(ball(M('#f0cba8', { rough: 0.9 }), [0, 0.05, 0], [0.3, 0.07, 0.3]));
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + rnd() * 0.6;
    const r = 0.1 + rnd() * 0.16;
    const h = 0.32 + rnd() * 0.4;
    const m = i % 2 ? a : b;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    g.add(tube(m, [[x * 0.4, 0.04, z * 0.4], [x, h * 0.5, z], [x * 1.5, h, z * 1.5]], 0.045, 12));
    g.add(ball(m, [x * 1.5, h, z * 1.5], 0.06));
    if (i % 3 === 0) {
      g.add(tube(m, [[x, h * 0.5, z], [x * 1.9, h * 0.75, z * 0.6], [x * 2.3, h * 0.95, z * 0.4]], 0.032, 10));
      g.add(ball(m, [x * 2.3, h * 0.95, z * 0.4], 0.045));
    }
  }
  return g;
}

/** Sea anemone: a column of soft tentacles, the clownfish's home. */
export function anemone() {
  const g = new Group();
  const column = M('#c86fb0', { rough: 0.6 });
  const tip = M('#ffd9f2', { rough: 0.5 });
  g.add(mesh(G.taper(0.8), column, [0, 0.14, 0], [0.22, 0.28, 0.22]));
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const r = 0.1 + (i % 3) * 0.05;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const h = 0.34 + (i % 4) * 0.06;
    g.add(tube(column, [[x * 0.6, 0.26, z * 0.6], [x * 1.4, h, z * 1.4], [x * 2, h + 0.06, z * 2]], 0.022, 10));
    g.add(ball(tip, [x * 2, h + 0.07, z * 2], 0.03));
  }
  return g;
}

/** Kelp frond: a tall ribbon of seaweed. */
export function kelp() {
  const g = new Group();
  const leaf = M('#3f8f5c', { rough: 0.7, side: 2 });
  const stem = M('#2f7248', { rough: 0.7 });
  g.add(tube(stem, [[0, 0, 0], [0.06, 0.5, 0.04], [-0.04, 1, 0.02], [0.05, 1.5, 0]], 0.022, 18));
  for (let i = 0; i < 7; i++) {
    const y = 0.2 + i * 0.19;
    const s = i % 2 ? 1 : -1;
    const blade = flatShape([[0, 0], [0.16, 0.1], [0.3, 0.02], [0.14, -0.05]], leaf);
    blade.position.set(s * 0.03, y, 0);
    blade.rotation.set(0, s > 0 ? 0.4 : Math.PI - 0.4, 0.2 * s);
    g.add(blade);
  }
  return g;
}

// ---------------------------------------------------------------- atlas animals

/** Giant panda: round black-and-white bear, sitting with a bamboo shoot. */
export function panda() {
  const g = new Group();
  const white = M('#f6f4ef', { rough: 0.7 });
  const black = M('#23242a', { rough: 0.6 });
  const bamboo = M('#6fbf4a', { rough: 0.6 });
  g.add(ball(white, [0, 0.52, 0], [0.46, 0.44, 0.42]));
  g.add(ball(white, [0, 0.95, 0.06], [0.33, 0.31, 0.3]));
  // ears, eye patches, muzzle
  for (const s of [-1, 1]) {
    g.add(ball(black, [s * 0.24, 1.2, -0.02], 0.11));
    g.add(ball(black, [s * 0.14, 0.99, 0.25], [0.09, 0.11, 0.05]));
    g.add(limb(black, [s * 0.34, 0.62, 0.02], [s * 0.42, 0.2, 0.06], 0.12, 0.7));
    g.add(ball(black, [s * 0.2, 0.14, 0.2], [0.14, 0.1, 0.18]));
  }
  g.add(ball(white, [0, 0.93, 0.3], [0.13, 0.1, 0.08]));
  g.add(ball(black, [0, 0.96, 0.36], [0.06, 0.05, 0.05]));
  g.add(mesh(G.torus(0.18), black, [0, 0.62, 0], [0.47, 0.45, 0.2], [Math.PI / 2, 0, 0]));
  eyes(g, 0.14, 1.0, 0.28, 0.035);
  // a bamboo shoot in both paws
  g.add(limb(bamboo, [0.08, 0.28, 0.34], [0.3, 0.92, 0.4], 0.028));
  for (const y of [0.55, 0.78]) g.add(ball(bamboo, [0.08 + (y - 0.28) * 0.34, y, 0.34 + (y - 0.28) * 0.09], [0.12, 0.03, 0.04]));
  return g;
}

/** Red kangaroo: heavy tail, long feet, joey-sized pouch. */
export function kangaroo() {
  const g = new Group();
  const fur = M('#c8794b', { rough: 0.75 });
  const pale = M('#e8c7a6', { rough: 0.75 });
  g.add(ball(fur, [0, 0.62, 0], [0.24, 0.34, 0.28]));
  g.add(ball(pale, [0, 0.52, 0.16], [0.16, 0.22, 0.14]));
  g.add(ball(fur, [0, 1.02, 0.1], [0.16, 0.17, 0.2]));
  g.add(ball(fur, [0, 1.0, 0.28], [0.09, 0.08, 0.1]));
  // ears
  for (const s of [-1, 1]) {
    g.add(mesh(G.capsule(), fur, [s * 0.1, 1.24, 0.02], [0.045, 0.16, 0.045], [0.1, 0, s * 0.25]));
    // little arms
    g.add(limb(fur, [s * 0.18, 0.72, 0.1], [s * 0.2, 0.5, 0.26], 0.045));
  }
  // haunches and long feet
  for (const s of [-1, 1]) {
    g.add(ball(fur, [s * 0.18, 0.42, -0.02], [0.14, 0.2, 0.2]));
    g.add(limb(fur, [s * 0.18, 0.3, 0.0], [s * 0.16, 0.08, 0.1], 0.07));
    g.add(mesh(G.box(), fur, [s * 0.16, 0.05, 0.18], [0.12, 0.08, 0.42]));
  }
  // tail
  g.add(tube(fur, [[0, 0.5, -0.2], [0, 0.32, -0.5], [0, 0.14, -0.78], [0, 0.07, -0.98]], 0.09, 20));
  eyes(g, 0.08, 1.05, 0.24, 0.033);
  return g;
}

/**
 * Field cricket: dark and glossy, with antennae longer than its body (the easy
 * way to tell a cricket from a grasshopper) and big jumping back legs.
 */
export function cricket() {
  const g = new Group();
  const shell = M('#2b211c', { rough: 0.35, coat: 0.6 });
  const wing = M('#4a3a2e', { rough: 0.4, coat: 0.4 });
  const leg = M('#3a2c24', { rough: 0.5 });
  g.add(ball(shell, [0, 0.14, 0.22], [0.1, 0.09, 0.1]));
  g.add(ball(shell, [0, 0.13, 0.08], [0.11, 0.08, 0.1]));
  g.add(ball(wing, [0, 0.15, -0.14], [0.12, 0.07, 0.24]));
  // cerci: the two little tails
  for (const s of [-1, 1]) g.add(limb(leg, [s * 0.03, 0.12, -0.36], [s * 0.08, 0.1, -0.5], 0.008));
  // antennae, longer than the whole body
  for (const s of [-1, 1]) {
    g.add(tube(leg, [[s * 0.03, 0.2, 0.3], [s * 0.12, 0.34, 0.5], [s * 0.26, 0.36, 0.72], [s * 0.4, 0.3, 0.92]], 0.006, 16));
  }
  for (const s of [-1, 1]) {
    // front and middle legs
    g.add(limb(leg, [s * 0.08, 0.1, 0.16], [s * 0.18, 0.02, 0.26], 0.012));
    g.add(limb(leg, [s * 0.09, 0.1, 0.04], [s * 0.2, 0.02, 0.02], 0.012));
    // big jumping hind legs: thick thigh, thin shin
    g.add(limb(leg, [s * 0.09, 0.12, -0.06], [s * 0.16, 0.26, -0.26], 0.03, 0.6));
    g.add(limb(leg, [s * 0.16, 0.26, -0.26], [s * 0.2, 0.02, -0.36], 0.012));
  }
  eyes(g, 0.06, 0.18, 0.29, 0.022);
  return g;
}

export type AnyTexture = Texture;
