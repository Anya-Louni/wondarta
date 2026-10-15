import { useMemo } from 'react';
import { Color, Float32BufferAttribute, PlaneGeometry } from 'three';
import { groundTexture } from './textures';

/** Cheap value noise (no dependency). */
function noise(x: number, z: number) {
  const s = Math.sin(x * 0.37 + z * 0.21) * 0.5 + Math.sin(x * 0.11 - z * 0.47) * 0.35 + Math.sin(x * 1.3 + z * 0.9) * 0.15;
  return s;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Distance from point to segment, used for painting paths. */
export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export interface Zone {
  x: number;
  z: number;
  r: number;
  color: string;
}

/**
 * One sculpted ground mesh: flat where you walk (so models sit correctly),
 * rolling hills beyond `flatRadius`, and vertex colours painting zones and
 * dirt paths. A single draw call.
 */
export function Terrain({
  size = 96,
  segments = 110,
  flatRadius = 25,
  base = '#8fd46b',
  zones = [],
  paths = [],
  pathColor = '#dcc58e',
  hill = '#79c35a',
  detail = 4,
}: {
  size?: number;
  segments?: number;
  flatRadius?: number;
  base?: string;
  zones?: Zone[];
  paths?: [number, number, number, number][];
  pathColor?: string;
  hill?: string;
  /** Metres covered by one repeat of the ground detail tile. */
  detail?: number;
}) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    const baseC = new Color(base);
    const hillC = new Color(hill);
    const pathC = new Color(pathColor);
    const zoneCs = zones.map((zn) => new Color(zn.color));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const n = noise(x, z);
      // hills rise outside the play area
      const rise = smooth(flatRadius, flatRadius + 14, r);
      pos.setY(i, rise * (4 + n * 3.5) + (r > flatRadius ? 0 : n * 0.03));
      c.copy(baseC).offsetHSL(0, 0, n * 0.03);
      zones.forEach((zn, k) => {
        const w = 1 - smooth(zn.r * 0.75, zn.r * 1.12, Math.hypot(x - zn.x, z - zn.z));
        if (w > 0) c.lerp(zoneCs[k], w * 0.92);
      });
      let pd = Infinity;
      for (const [ax, az, bx, bz] of paths) pd = Math.min(pd, segDist(x, z, ax, az, bx, bz));
      const pw = 1 - smooth(0.9, 1.6, pd + n * 0.25);
      if (pw > 0) c.lerp(pathC, pw);
      if (rise > 0) c.lerp(hillC, rise * 0.7).offsetHSL(0, 0, rise * n * 0.05);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [size, segments, flatRadius, base, zones, paths, pathColor, hill]);

  // One shared canvas tile, cloned so each scene can pick its own density.
  const map = useMemo(() => {
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(size / detail, size / detail);
    return t;
  }, [size, detail]);

  return (
    <mesh geometry={geo}>
      {/* the tile averages ~0.93 grey and multiplies the vertex colours, so the
          material colour lifts it back to the painted brightness */}
      <meshStandardMaterial vertexColors map={map} color={new Color(1.1, 1.1, 1.1)} roughness={0.95} />
    </mesh>
  );
}
