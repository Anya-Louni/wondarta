import { create } from 'zustand';

/**
 * Graphics quality, decided at runtime instead of guessed at build time.
 *
 * The scenes are fill-rate bound: a big or high-DPI window can ask for six
 * times the pixels of a small one, which is where the stutter came from. So we
 * cap the total pixels we ever render, let drei's PerformanceMonitor tune the
 * pixel ratio inside that cap, and drop to the `low` tier (fewer decorative
 * extras) when the machine still can't keep up. Nothing here changes the
 * content, only the trimmings.
 */

export type Tier = 'high' | 'low';
export type Mode = 'auto' | 'smooth';

/** Never render more pixels than this, however large the window is. */
const MAX_PIXELS = 2_300_000;
const KEY = 'wondarta.gfx';

/** Clamp a pixel ratio so the drawing buffer stays within MAX_PIXELS. */
function capDpr(dpr: number) {
  const area = Math.max(1, innerWidth * innerHeight);
  return Math.max(0.7, Math.min(dpr, Math.sqrt(MAX_PIXELS / area)));
}

function savedMode(): Mode {
  try {
    return localStorage.getItem(KEY) === 'smooth' ? 'smooth' : 'auto';
  } catch {
    return 'auto';
  }
}

/** Phones, small laptops and anything reporting few cores start low. */
function coldStart(mode: Mode): { tier: Tier; dpr: number } {
  const n = navigator as Navigator & { deviceMemory?: number };
  const cores = n.hardwareConcurrency ?? 8;
  const mem = n.deviceMemory ?? 8;
  // A touch screen alone doesn't mean a slow machine; a small touch screen does.
  const smallTouch = !!matchMedia?.('(pointer: coarse)').matches && innerWidth < 900;
  const weak = mode === 'smooth' || cores <= 4 || mem <= 4 || smallTouch;
  return weak ? { tier: 'low', dpr: capDpr(1) } : { tier: 'high', dpr: capDpr(1.25) };
}

const startMode = savedMode();
const start = coldStart(startMode);

/**
 * Multisampling is decided once, at context creation: swapping it later would
 * throw away the WebGL context (and every uploaded texture) mid-session.
 */
export const ANTIALIAS = start.tier === 'high';

interface QualityState {
  tier: Tier;
  dpr: number;
  mode: Mode;
  /** True once we've had to drop: stops us bouncing back up and thrashing. */
  demoted: boolean;
  setDpr: (dpr: number) => void;
  /** Re-clamp after a window resize, keeping the ratio the monitor settled on. */
  reclamp: () => void;
  demote: () => void;
  setMode: (mode: Mode) => void;
}

export const useQuality = create<QualityState>((set, get) => ({
  tier: start.tier,
  dpr: start.dpr,
  mode: startMode,
  demoted: start.tier === 'low',
  setDpr: (dpr) => {
    const cap = get().tier === 'low' ? 1 : 1.25;
    const next = capDpr(Math.min(cap, Math.max(0.7, Math.round(dpr * 20) / 20)));
    if (next !== get().dpr) set({ dpr: next });
  },
  reclamp: () => get().setDpr(get().dpr),
  demote: () => {
    if (!get().demoted) set({ tier: 'low', dpr: capDpr(Math.min(get().dpr, 1)), demoted: true });
  },
  setMode: (mode) => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* private browsing: the choice just won't stick */
    }
    const fresh = coldStart(mode);
    set({ mode, tier: fresh.tier, dpr: fresh.dpr, demoted: fresh.tier === 'low' });
  },
}));
