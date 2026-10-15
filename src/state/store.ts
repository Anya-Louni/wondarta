import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang, SceneId } from '../types/content';
import { safeLocal, safeSession } from './safeStorage';

export type ProviderState = 'ok' | 'unconfigured' | 'exhausted';

export interface MascotSpeech {
  text: string;
  /** changes on every new line so the bubble re-animates */
  key: number;
}

const today = () => new Date().toISOString().slice(0, 10);

/** "Ask about anything" is capped per free session. Business logic only, no payments. */
export const FREE_ASKS_PER_SESSION = 3;
const ASK_KEY = 'wondarta.asksUsed';

interface State {
  // --- persisted (cross-session relationship memory) ---
  lang: Lang;
  explored: string[];
  /** Best star rating (1-3) earned on each playable hotspot. */
  stars: Record<string, number>;
  visitDays: string[];
  sound: boolean;
  /** Placeholder for a future subscription tier. */
  plan: 'free' | 'unlimited';
  /** The explorer's first name. Kept on this device only, never sent to an AI. */
  name: string;
  tourDone: boolean;

  // --- session ---
  scene: SceneId;
  prevScene: SceneId | null;
  /** Hotspot to walk to / open after a scene change (linked topics). */
  focusHotspot: string | null;
  openHotspot: string | null;
  askOpen: boolean;
  asksUsed: number;
  mascotSpeech: MascotSpeech | null;
  bedtime: boolean;
  providers: { groq: ProviderState; gemini: ProviderState };
  sceneFlags: Record<string, boolean>;
  roomMode: 'play' | 'chat';

  setLang: (l: Lang) => void;
  goTo: (scene: SceneId, focusHotspot?: string | null) => void;
  open: (hotspotId: string) => void;
  close: () => void;
  markExplored: (hotspotId: string) => void;
  /** Record a result; only ever raises the stored rating. */
  award: (hotspotId: string, stars: number) => void;
  recordVisit: () => void;
  toggleSound: () => void;
  setAskOpen: (v: boolean) => void;
  consumeAsk: () => boolean;
  asksLeft: () => number;
  say: (text: string | null) => void;
  setBedtime: (v: boolean) => void;
  setProvider: (p: 'groq' | 'gemini', s: ProviderState) => void;
  setFlag: (k: string, v: boolean) => void;
  setRoomMode: (m: 'play' | 'chat') => void;
  setName: (n: string) => void;
  setTourDone: (v: boolean) => void;
  /** Grown-up action: forget the name, stars and visited cards on this device. */
  resetProgress: () => void;
}

let speechKey = 0;

/** Letters (any alphabet), spaces, hyphens and apostrophes; 16 characters at most. */
export const cleanName = (n: string) => n.replace(/[^\p{L}\p{M} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      lang: 'en',
      explored: [],
      stars: {},
      visitDays: [],
      sound: true,
      plan: 'free',
      name: '',
      tourDone: false,

      scene: 'hub',
      prevScene: null,
      focusHotspot: null,
      openHotspot: null,
      askOpen: false,
      asksUsed: Number(safeSession.getItem(ASK_KEY) ?? 0) || 0,
      mascotSpeech: null,
      bedtime: false,
      providers: {
        groq: __HAS_GROQ__ || window.__WONDARTA_API_BASE__ ? 'ok' : 'unconfigured',
        gemini: __HAS_GEMINI__ || window.__WONDARTA_API_BASE__ ? 'ok' : 'unconfigured',
      },
      sceneFlags: {},
      roomMode: 'play',

      setLang: (lang) => set({ lang }),
      goTo: (scene, focusHotspot = null) =>
        set({ scene, prevScene: get().scene, focusHotspot, openHotspot: null, askOpen: false, mascotSpeech: null }),
      open: (openHotspot) => set({ openHotspot, focusHotspot: null }),
      close: () => set({ openHotspot: null, mascotSpeech: null }),
      markExplored: (id) => {
        if (!get().explored.includes(id)) set({ explored: [...get().explored, id] });
      },
      award: (id, n) => {
        const best = Math.max(get().stars[id] ?? 0, Math.min(3, Math.max(1, Math.round(n))));
        if (best !== get().stars[id]) set({ stars: { ...get().stars, [id]: best } });
      },
      recordVisit: () => {
        const d = today();
        if (!get().visitDays.includes(d)) set({ visitDays: [...get().visitDays, d].slice(-400) });
      },
      toggleSound: () => set({ sound: !get().sound }),
      setAskOpen: (askOpen) => set({ askOpen, openHotspot: askOpen ? null : get().openHotspot }),
      consumeAsk: () => {
        if (get().plan === 'unlimited') return true;
        if (get().asksUsed >= FREE_ASKS_PER_SESSION) return false;
        const asksUsed = get().asksUsed + 1;
        safeSession.setItem(ASK_KEY, String(asksUsed));
        set({ asksUsed });
        return true;
      },
      asksLeft: () => (get().plan === 'unlimited' ? Infinity : Math.max(0, FREE_ASKS_PER_SESSION - get().asksUsed)),
      say: (text) => set({ mascotSpeech: text ? { text, key: ++speechKey } : null }),
      setBedtime: (bedtime) => set({ bedtime }),
      setProvider: (p, s) => set({ providers: { ...get().providers, [p]: s } }),
      setFlag: (k, v) => set({ sceneFlags: { ...get().sceneFlags, [k]: v } }),
      setRoomMode: (roomMode) => set({ roomMode }),
      setName: (name) => set({ name: cleanName(name) }),
      setTourDone: (tourDone) => set({ tourDone }),
      resetProgress: () => set({ name: '', tourDone: false, explored: [], stars: {}, visitDays: [], scene: 'hub', openHotspot: null, mascotSpeech: null }),
    }),
    {
      name: 'wondarta',
      version: 1,
      storage: createJSONStorage(() => safeLocal),
      partialize: (s) => ({ lang: s.lang, explored: s.explored, stars: s.stars, visitDays: s.visitDays, sound: s.sound, plan: s.plan, name: s.name, tourDone: s.tourDone }),
    },
  ),
);

/** The mascot is "asleep" for LLM features when the kid put it to bed, or a provider is out of free quota. */
export function llmAwake(p: 'groq' | 'gemini'): boolean {
  const s = useApp.getState();
  return !s.bedtime && s.providers[p] === 'ok';
}
