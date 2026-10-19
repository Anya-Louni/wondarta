import { Vector3 } from 'three';

/**
 * Mutable per-frame player state shared by 3D systems (mascot follow,
 * hotspot/portal proximity). Kept outside React state on purpose: it changes
 * every frame and must not trigger re-renders.
 */
export const player = {
  pos: new Vector3(0, 0, 0),
  yaw: 0,
  pitch: -0.05,
  target: null as Vector3 | null,
  /** Frozen while a card or panel is open so keys typed in inputs don't walk. */
  frozen: false,
};

/** Walk (tap-to-walk / linked-topic focus) toward a point on the floor. */
export function walkTo(x: number, z: number) {
  player.target = new Vector3(x, 0, z);
}

export function placePlayer(x: number, z: number, yaw: number) {
  player.pos.set(x, 0, z);
  player.yaw = yaw;
  player.pitch = -0.05;
  player.target = null;
}

/** Yaw that makes the player look from (fx,fz) toward (tx,tz). Camera looks down -Z at yaw 0. */
export function yawToward(fx: number, fz: number, tx: number, tz: number) {
  return Math.atan2(-(tx - fx), -(tz - fz));
}

// ---------------- mascot reactions ----------------

export type MascotReaction = 'happy' | 'sad' | 'squish' | 'wave' | 'think' | 'surprised';
type Listener = (r: MascotReaction) => void;
const listeners = new Set<Listener>();

export const mascotBus = {
  emit(r: MascotReaction) {
    listeners.forEach((l) => l(r));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
