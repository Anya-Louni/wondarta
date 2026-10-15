import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Vector3 } from 'three';
import { player } from './playerState';

export type Bounds = (x: number, z: number) => [number, number];

export const circleBounds =
  (r: number): Bounds =>
  (x, z) => {
    const d = Math.hypot(x, z);
    return d > r ? [(x / d) * r, (z / d) * r] : [x, z];
  };

interface Props {
  bounds: Bounds;
  speed?: number;
  eye?: number;
}

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyZ: [0, 1], // Z = forward on AZERTY
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], KeyQ: [-1, 0], // Q = left on AZERTY
  KeyD: [1, 0],
};

/** Left/right arrows turn instead of strafing: no mouse needed to steer. */
const TURN: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

const TURN_SPEED = 2.2; // radians per second
const SPRINT = 1.6;

/**
 * First-person walker: WASD/ZQSD to walk and strafe, arrow keys to walk and
 * turn (so the keyboard alone is enough), drag to look, tap the floor to walk
 * there (touch friendly). No pointer lock, so it stays kid- and trackpad-friendly.
 */
export function Player({ bounds, speed = 6.6, eye = 1.55 }: Props) {
  const { camera, gl } = useThree();
  const pressed = useRef(new Set<string>());
  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));
  const tmp = useRef(new Vector3());

  useEffect(() => {
    const typing = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    };
    const down = (e: KeyboardEvent) => {
      if (typing() || !(e.code in KEYS || e.code in TURN || e.code.startsWith('Shift'))) return;
      // a quick tap of an arrow should nudge the view, not just a held key
      if (e.code in TURN && !pressed.current.has(e.code)) player.yaw -= TURN[e.code] * 0.1;
      pressed.current.add(e.code);
      if (!e.code.startsWith('Shift')) player.target = null;
      if (e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const blur = () => pressed.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);

    // drag-to-look
    const el = gl.domElement;
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const pd = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const pm = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      player.yaw += dx * 0.0045;
      player.pitch = Math.max(-0.7, Math.min(0.45, player.pitch + dy * 0.003));
    };
    const pu = () => (dragging = false);
    el.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      el.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.05);
    let mx = 0;
    let mz = 0;
    let turn = 0;
    if (!player.frozen)
      for (const k of pressed.current) {
        if (k in KEYS) {
          mx += KEYS[k][0];
          mz += KEYS[k][1];
        }
        turn += TURN[k] ?? 0;
      }
    if (turn) {
      player.yaw -= turn * TURN_SPEED * step;
      player.target = null;
    }
    const fast = pressed.current.has('ShiftLeft') || pressed.current.has('ShiftRight');
    const run = speed * (fast ? SPRINT : 1);
    const p = player.pos;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      const s = (run * step) / len;
      // forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      p.x += (mx * cos - mz * sin) * s;
      p.z += (-mx * sin - mz * cos) * s;
    } else if (player.target && !player.frozen) {
      const d = tmp.current.subVectors(player.target, p).setY(0);
      const dist = d.length();
      if (dist < 0.15) player.target = null;
      else {
        d.normalize().multiplyScalar(Math.min(dist, speed * step));
        p.add(d);
        // gently turn toward where we walk
        const want = Math.atan2(-d.x, -d.z);
        let diff = want - player.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        player.yaw += diff * Math.min(1, step * 3);
      }
    }
    [p.x, p.z] = bounds(p.x, p.z);

    const bob = mx || mz || player.target ? Math.sin(state.clock.elapsedTime * 9) * 0.03 : 0;
    camera.position.set(p.x, eye + bob, p.z);
    euler.current.set(player.pitch, player.yaw, 0);
    camera.quaternion.setFromEuler(euler.current);
  });

  return null;
}
