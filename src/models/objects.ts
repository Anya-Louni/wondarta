import { Group, LatheGeometry, Mesh, Shape, ExtrudeGeometry, Vector2 } from 'three';
import { G, M, ball, flatShape, limb, mesh, pattern, tube } from './kit';

/** Props, gear and portal emblems. Same conventions as animals: face +Z, stand on y = 0. */

type V3 = [number, number, number];

const lathe = (pts: [number, number][], m: ReturnType<typeof M>, segs = 32) =>
  new Mesh(new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), segs), m);

export function moon() {
  const g = new Group();
  const rock = M('#f1ebcb', { rough: 0.9, emissive: '#fff4c8', emissiveIntensity: 0.25 });
  g.add(ball(rock, [0, 0.5, 0], 0.45));
  const crater = M('#d6cfaa', { rough: 1 });
  for (const [x, y, z, r] of [[0.15, 0.62, 0.38, 0.08], [-0.2, 0.4, 0.36, 0.06], [0.05, 0.3, 0.42, 0.05], [-0.1, 0.7, 0.35, 0.05]] as const)
    g.add(ball(crater, [x, y, z], [r, r, r * 0.4]));
  return g;
}

export function shuttlecock() {
  const g = new Group();
  g.add(mesh(G.halfSphere(), M('#f7f5ef', { rough: 0.6 }), [0, 0.12, 0], [0.12, -0.12, 0.12]));
  g.add(mesh(G.cyl(), M('#e0393e'), [0, 0.13, 0], [0.12, 0.02, 0.12]));
  const skirt = lathe([[0.11, 0.14], [0.3, 0.62], [0.29, 0.63], [0.1, 0.15]], M('#ffffff', { rough: 0.7, side: 2 }), 16);
  g.add(skirt);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.add(limb(M('#d8d2c4'), [Math.cos(a) * 0.11, 0.14, Math.sin(a) * 0.11], [Math.cos(a) * 0.3, 0.63, Math.sin(a) * 0.3], 0.006));
  }
  g.rotation.x = -0.4;
  return g;
}

export function paddle() {
  const g = new Group();
  g.add(mesh(G.cyl(), M('#d8263a', { rough: 0.8 }), [0, 0.62, 0], [0.34, 0.03, 0.36], [Math.PI / 2, 0, 0]));
  g.add(mesh(G.cyl(), M('#1b1b1f', { rough: 0.8 }), [0, 0.62, -0.02], [0.33, 0.02, 0.35], [Math.PI / 2, 0, 0]));
  g.add(mesh(G.capsule(), M('#b98552', { rough: 0.5, coat: 0.4 }), [0, 0.2, 0], [0.09, 0.3, 0.06]));
  g.add(ball(M('#f7f5ef', { rough: 0.3, coat: 0.5 }), [0.4, 0.3, 0.1], 0.07));
  return g;
}

export function curlingStone() {
  const g = new Group();
  const granite = pattern('granite', (c, s) => {
    c.fillStyle = '#8d9096';
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = ['#6d7076', '#b7b9bd', '#55575c'][i % 3];
      c.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
  g.add(lathe([[0, 0.02], [0.32, 0.02], [0.4, 0.1], [0.42, 0.2], [0.38, 0.3], [0.3, 0.34], [0, 0.34]], M('#ffffff', { rough: 0.35, coat: 0.6, map: granite })));
  g.add(mesh(G.cyl(), M('#d8263a', { rough: 0.3, coat: 0.6 }), [0, 0.36, 0], [0.18, 0.04, 0.18]));
  g.add(limb(M('#d8263a', { rough: 0.3, coat: 0.6 }), [0, 0.4, -0.05], [0, 0.48, 0.15], 0.04));
  g.add(limb(M('#d8263a', { rough: 0.3, coat: 0.6 }), [0, 0.48, 0.15], [0, 0.48, 0.38], 0.04));
  return g;
}

export function cricketBat() {
  const g = new Group();
  const wood = M('#e8c98e', { rough: 0.5, coat: 0.3 });
  g.add(mesh(G.capsule(), wood, [0, 0.45, 0], [0.2, 0.6, 0.07]));
  g.add(mesh(G.cyl(), M('#1b1b1f', { rough: 0.9 }), [0, 1.02, 0], [0.045, 0.35, 0.045]));
  g.add(ball(M('#b31b2a', { rough: 0.35, coat: 0.6 }), [0.35, 0.09, 0.15], 0.09));
  g.rotation.z = -0.25;
  return g;
}

export function soccerBall() {
  const map = pattern('soccer', (c, s) => {
    c.fillStyle = '#fbfbf7';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#1b1b1f';
    const pent = (x: number, y: number, r: number) => {
      c.beginPath();
      for (let k = 0; k < 5; k++) c.lineTo(x + r * Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 5), y + r * Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 5));
      c.fill();
    };
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) pent(32 + x * 64 + (y % 2) * 32, 42 + y * 86, 20);
  });
  const g = new Group();
  g.add(ball(M('#ffffff', { rough: 0.35, coat: 0.5, map }), [0, 0.35, 0], 0.35));
  return g;
}

export function heartOrgan() {
  const g = new Group();
  const red = M('#d7263d', { rough: 0.35, coat: 0.6 });
  g.add(ball(red, [-0.18, 0.62, 0], [0.3, 0.32, 0.28]), ball(red, [0.18, 0.62, 0], [0.3, 0.32, 0.28]));
  const tip = mesh(G.cone(), red, [0, 0.3, 0], [0.4, 0.5, 0.3], [Math.PI, 0, 0]);
  g.add(tip);
  const vessel = M('#3a6fd8', { rough: 0.4, coat: 0.4 });
  g.add(tube(vessel, [[0.05, 0.8, 0], [0.1, 1.05, -0.05], [0.3, 1.1, -0.05]], 0.07));
  g.add(tube(red, [[-0.12, 0.8, 0], [-0.15, 1.08, 0.02], [-0.02, 1.2, 0.02]], 0.08));
  return g;
}

export function brain() {
  const g = new Group();
  const pink = M('#f2a0b4', { rough: 0.5, coat: 0.4 });
  for (const s of [-1, 1]) g.add(ball(pink, [s * 0.2, 0.5, 0], [0.24, 0.3, 0.42]));
  const fold = M('#d97e98', { rough: 0.6 });
  for (let i = 0; i < 5; i++)
    for (const s of [-1, 1]) g.add(mesh(G.torus(0.08, Math.PI), fold, [s * 0.22, 0.55, -0.3 + i * 0.15], [0.2, 0.22, 0.2], [0, Math.PI / 2, 0]));
  g.add(limb(pink, [0, 0.35, -0.15], [0, 0.05, -0.2], 0.07));
  return g;
}

export function lungs() {
  const g = new Group();
  const pink = M('#f08c9c', { rough: 0.5, coat: 0.3 });
  for (const s of [-1, 1]) g.add(ball(pink, [s * 0.22, 0.5, 0], [0.18, 0.36, 0.16]));
  const pipe = M('#e3d6d0', { rough: 0.5 });
  g.add(limb(pipe, [0, 0.72, 0], [0, 1.02, 0], 0.05));
  for (const s of [-1, 1]) g.add(limb(pipe, [0, 0.74, 0], [s * 0.17, 0.62, 0], 0.035));
  return g;
}

export function book(color = '#2f6fe0', open = false) {
  const g = new Group();
  const cover = M(color, { rough: 0.5, coat: 0.3 });
  const page = M('#fbf6ea', { rough: 0.8 });
  if (open) {
    for (const s of [-1, 1]) {
      g.add(mesh(G.box(), cover, [s * 0.3, 0.03, 0], [0.62, 0.04, 0.8], [0, 0, s * 0.1]));
      g.add(mesh(G.box(), page, [s * 0.29, 0.08, 0], [0.56, 0.06, 0.74], [0, 0, s * 0.1]));
    }
    return g;
  }
  g.add(mesh(G.box(), cover, [0, 0.4, 0], [0.12, 0.8, 0.6]));
  g.add(mesh(G.box(), page, [0.01, 0.4, 0], [0.1, 0.74, 0.56]));
  return g;
}

export function robot() {
  const g = new Group();
  const shell = M('#f2f5f8', { rough: 0.25, coat: 0.8 });
  const accent = M('#ff5ac8', { rough: 0.25, coat: 0.8 });
  const screen = M('#1b2a44', { rough: 0.2, coat: 1 });
  g.add(mesh(G.capsule(), shell, [0, 0.45, 0], [0.5, 0.3, 0.4]));
  g.add(ball(shell, [0, 0.95, 0], [0.32, 0.26, 0.28]));
  g.add(ball(screen, [0, 0.95, 0.12], [0.24, 0.16, 0.18]));
  for (const s of [-1, 1]) {
    g.add(ball(M('#7ce3ff', { emissive: '#7ce3ff', emissiveIntensity: 1.2 }), [s * 0.09, 0.97, 0.28], [0.045, 0.06, 0.02]));
    g.add(limb(shell, [s * 0.3, 0.55, 0], [s * 0.42, 0.3, 0.08], 0.06));
    g.add(ball(accent, [s * 0.43, 0.28, 0.09], 0.07));
    g.add(ball(M('#8a97a8', { rough: 0.3, metal: 0.4 }), [s * 0.15, 0.08, 0], [0.12, 0.08, 0.14]));
  }
  g.add(limb(M('#8a97a8', { metal: 0.5, rough: 0.3 }), [0, 1.18, 0], [0, 1.38, 0], 0.015));
  g.add(ball(accent, [0, 1.4, 0], 0.06));
  return g;
}

export function palette() {
  const g = new Group();
  const s = new Shape();
  s.absellipse(0, 0, 0.55, 0.42, 0, Math.PI * 2, false, 0);
  const hole = new Shape();
  hole.absellipse(0.25, -0.12, 0.08, 0.08, 0, Math.PI * 2, false, 0);
  s.holes.push(hole);
  const board = new Mesh(new ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), M('#d9a86a', { rough: 0.45, coat: 0.4 }));
  const tilt = new Group();
  tilt.rotation.x = -0.45;
  tilt.position.y = 0.5;
  tilt.add(board);
  const blobs: [string, number, number][] = [['#e0393e', -0.3, 0.15], ['#f7d531', -0.05, 0.25], ['#2f6fe0', 0.2, 0.18], ['#3fae4a', -0.28, -0.12], ['#8a4fc0', 0.05, -0.02]];
  for (const [c, x, y] of blobs) tilt.add(ball(M(c, { rough: 0.2, coat: 0.8 }), [x, y, 0.09], [0.07, 0.07, 0.035]));
  g.add(tilt);
  return g;
}

export function compass() {
  const g = new Group();
  g.add(mesh(G.cyl(), M('#c9a25a', { rough: 0.25, metal: 0.7 }), [0, 0.06, 0], [0.45, 0.12, 0.45]));
  g.add(mesh(G.cyl(), M('#fbf6ea', { rough: 0.6 }), [0, 0.125, 0], [0.4, 0.01, 0.4]));
  const red = M('#d8263a', { rough: 0.3, coat: 0.6 });
  const blue = M('#2f4a8a', { rough: 0.3, coat: 0.6 });
  g.add(mesh(G.cone(), red, [0, 0.14, -0.16], [0.06, 0.32, 0.02], [-Math.PI / 2, 0, 0]));
  g.add(mesh(G.cone(), blue, [0, 0.14, 0.16], [0.06, 0.32, 0.02], [Math.PI / 2, 0, 0]));
  g.add(mesh(G.cyl(), M('#dff6ff', { rough: 0, coat: 1, opacity: 0.3 }), [0, 0.15, 0], [0.4, 0.02, 0.4]));
  g.rotation.x = 0.9;
  g.position.y = 0.35;
  return g;
}

export function scroll() {
  const g = new Group();
  const paper = M('#f3e3bc', { rough: 0.8, side: 2 });
  g.add(mesh(G.cyl(), paper, [0, 0.5, 0], [0.4, 0.8, 0.01], [0, 0, 0]));
  for (const y of [0.1, 0.9]) g.add(mesh(G.cyl(), M('#b98552', { rough: 0.5 }), [0, y, 0.02], [0.06, 0.95, 0.06], [0, 0, Math.PI / 2]));
  const ink = M('#6b4526');
  for (let i = 0; i < 5; i++) g.add(mesh(G.cyl(), ink, [0, 0.72 - i * 0.1, 0.02], [0.004, 0.5 - (i % 2) * 0.15, 0.004], [0, 0, Math.PI / 2]));
  return g;
}

export function lock() {
  const g = new Group();
  const gold = M('#e0b43a', { rough: 0.25, metal: 0.8 });
  g.add(mesh(G.capsule(), gold, [0, 0.35, 0], [0.5, 0.2, 0.2]));
  g.add(mesh(G.torus(0.2, Math.PI), M('#b9c0c8', { rough: 0.2, metal: 0.9 }), [0, 0.55, 0], [0.16, 0.2, 0.16]));
  g.add(ball(M('#3b2a1f'), [0, 0.35, 0.1], [0.04, 0.06, 0.02]));
  return g;
}

export function finishFlag() {
  const g = new Group();
  const map = pattern('checker', (c, s) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
      c.fillStyle = (x + y) % 2 ? '#1b1b1f' : '#ffffff';
      c.fillRect((x * s) / 6, (y * s) / 4, s / 6, s / 4);
    }
  });
  g.add(limb(M('#b9c0c8', { metal: 0.6, rough: 0.3 }), [0, 0, 0], [0, 1.6, 0], 0.03));
  const f = flatShape([[0, 0], [0.8, 0], [0.8, 0.5], [0, 0.5]], M('#ffffff', { map, side: 2, rough: 0.7 }));
  f.position.set(0.02, 1.08, 0);
  g.add(f);
  return g;
}

export function acorn() {
  const g = new Group();
  g.add(ball(M('#a86a32', { rough: 0.4, coat: 0.5 }), [0, 0.3, 0], [0.2, 0.27, 0.2]));
  g.add(mesh(G.halfSphere(), M('#6b4a2a', { rough: 1 }), [0, 0.42, 0], [0.23, 0.14, 0.23]));
  g.add(limb(M('#6b4a2a'), [0, 0.55, 0], [0.02, 0.65, 0], 0.025));
  return g;
}

export function sunflower() {
  const g = new Group();
  const stem = M('#3fae4a', { rough: 0.6 });
  g.add(limb(stem, [0, 0, 0], [0, 1.4, 0.05], 0.04));
  for (const s of [-1, 1]) g.add(ball(M('#5ccf45', { rough: 0.5 }), [s * 0.2, 0.7, 0], [0.2, 0.05, 0.1]));
  const head = new Group();
  head.position.set(0, 1.45, 0.08);
  head.rotation.x = -0.3;
  const petal = M('#f7c52a', { rough: 0.5 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p = ball(petal, [Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0], [0.12, 0.05, 0.02]);
    p.rotation.z = a;
    head.add(p);
  }
  head.add(mesh(G.cyl(), M('#6b3f1f', { rough: 0.9 }), [0, 0, 0.02], [0.17, 0.05, 0.17], [Math.PI / 2, 0, 0]));
  g.add(head);
  return g;
}

export function speaker() {
  const g = new Group();
  g.add(mesh(G.capsule(), M('#f2f5f8', { rough: 0.25, coat: 0.8 }), [0, 0.5, 0], [0.5, 0.45, 0.35]));
  g.add(mesh(G.cyl(), M('#2b3a50', { rough: 0.6 }), [0, 0.58, 0.16], [0.16, 0.04, 0.16], [Math.PI / 2, 0, 0]));
  g.add(mesh(G.cyl(), M('#2b3a50', { rough: 0.6 }), [0, 0.3, 0.16], [0.08, 0.04, 0.08], [Math.PI / 2, 0, 0]));
  return g;
}

export function flask() {
  const g = new Group();
  const glass = M('#dff6ff', { rough: 0, coat: 1, opacity: 0.35 });
  g.add(lathe([[0, 0], [0.3, 0.02], [0.32, 0.12], [0.1, 0.5], [0.08, 0.75], [0.1, 0.78]], glass));
  g.add(lathe([[0, 0.02], [0.28, 0.04], [0.26, 0.18], [0, 0.2]], M('#3fd08a', { rough: 0.1, coat: 1, emissive: '#1f8a5a', emissiveIntensity: 0.4 })));
  return g;
}

export function lens() {
  const g = new Group();
  g.add(mesh(G.torus(0.12), M('#c9a25a', { rough: 0.25, metal: 0.7 }), [0, 0.6, 0], 0.3));
  g.add(mesh(G.cyl(), M('#dff6ff', { rough: 0, coat: 1, opacity: 0.35 }), [0, 0.6, 0], [0.3, 0.02, 0.3], [Math.PI / 2, 0, 0]));
  g.add(limb(M('#3b2a1f', { rough: 0.5 }), [0.2, 0.38, 0], [0.45, 0.02, 0], 0.05));
  return g;
}

export function atom() {
  const g = new Group();
  g.add(ball(M('#ff6f91', { rough: 0.2, coat: 1 }), [0, 0.6, 0], 0.16));
  const ring = M('#7ce3ff', { rough: 0.2, coat: 1, emissive: '#2aa6e6', emissiveIntensity: 0.4 });
  for (let i = 0; i < 3; i++) {
    const r = mesh(G.torus(0.03), ring, [0, 0.6, 0], 0.5, [Math.PI / 2, (i * Math.PI) / 3, 0]);
    r.rotation.set(Math.PI / 2 + 0.6 * Math.cos((i * 2 * Math.PI) / 3), 0.6 * Math.sin((i * 2 * Math.PI) / 3), 0);
    g.add(r);
  }
  return g;
}

export function bust() {
  const g = new Group();
  const marble = M('#f1ece4', { rough: 0.35, coat: 0.4 });
  g.add(mesh(G.cyl(), marble, [0, 0.12, 0], [0.3, 0.24, 0.3]));
  g.add(ball(marble, [0, 0.42, 0], [0.38, 0.22, 0.24]));
  g.add(limb(marble, [0, 0.5, 0], [0, 0.72, 0.02], 0.09));
  g.add(ball(marble, [0, 0.88, 0.04], [0.17, 0.21, 0.19]));
  g.add(ball(marble, [0, 0.97, -0.03], [0.18, 0.14, 0.18]));
  return g;
}

export function globe() {
  const g = new Group();
  g.add(mesh(G.cyl(), M('#c9a25a', { rough: 0.3, metal: 0.6 }), [0, 0.04, 0], [0.25, 0.08, 0.25]));
  g.add(limb(M('#c9a25a', { rough: 0.3, metal: 0.6 }), [0, 0.08, 0], [0, 0.3, 0], 0.03));
  g.add(ball(M('#3aa0ff', { rough: 0.25, coat: 0.8 }), [0, 0.62, 0], 0.34));
  const land = M('#4cc26a', { rough: 0.5 });
  for (const p of [[0.18, 0.72, 0.24], [-0.22, 0.6, 0.22], [0.05, 0.45, 0.3], [-0.1, 0.82, 0.25], [0.28, 0.58, 0.1]] as V3[]) g.add(ball(land, p, [0.12, 0.09, 0.06]));
  g.add(mesh(G.torus(0.02, Math.PI * 1.2), M('#c9a25a', { rough: 0.3, metal: 0.6 }), [0, 0.62, 0], 0.4, [0, Math.PI / 2, 0]));
  return g;
}

export function star(color = '#ffd257') {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const m = new Mesh(
    new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }),
    M(color, { rough: 0.2, coat: 1, emissive: color, emissiveIntensity: 0.35 }),
  );
  m.scale.setScalar(0.4);
  m.position.set(0, 0.45, -0.06);
  const g = new Group();
  g.add(m);
  return g;
}

export function nest() {
  const g = new Group();
  g.add(mesh(G.torus(0.35), M('#a86f3c', { rough: 1 }), [0, 0.15, 0], [0.5, 0.5, 0.35], [Math.PI / 2, 0, 0]));
  const egg = M('#bfe8ff', { rough: 0.3, coat: 0.6 });
  g.add(ball(egg, [-0.1, 0.2, 0], [0.12, 0.15, 0.12]), ball(egg, [0.12, 0.2, 0.05], [0.12, 0.15, 0.12]));
  return g;
}
