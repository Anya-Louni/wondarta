import type { CategoryId, Fact, GlossaryEntry, Hotspot, Lang, LText, SceneFacts } from '../types/content';
import { CATEGORY_IDS } from '../types/content';

/**
 * Loads the locked, human-reviewed facts.json files. These are bundled at build
 * time (never fetched or generated at runtime), which is what makes them the
 * "safe browser" source of truth for narration, hotspots and base quizzes.
 */
const modules = import.meta.glob<SceneFacts>('./scenes/*/facts.json', { eager: true, import: 'default' });

const scenes = new Map<string, SceneFacts>();
const hotspots = new Map<string, { scene: SceneFacts; hotspot: Hotspot }>();

for (const [path, data] of Object.entries(modules)) {
  const id = path.split('/')[2];
  if (data.sceneId !== id) throw new Error(`facts.json in ${id} declares sceneId ${data.sceneId}`);
  scenes.set(id, data);
  for (const h of data.hotspots) hotspots.set(h.id, { scene: data, hotspot: h });
}
for (const c of CATEGORY_IDS) if (!scenes.has(c)) throw new Error(`Missing locked content for category "${c}"`);

export function getScene(id: CategoryId): SceneFacts {
  return scenes.get(id)!;
}

/** Hotspots that end in a result, and so can earn stars (videos and plain reading cannot). */
export const canEarnStars = (h: Hotspot) => h.contentType === 'quiz' || h.contentType === 'puzzle' || h.contentType === 'audio-match';

/** Stars earned and stars possible, for one world or (no id) the whole encyclopedia. */
export function starTally(stars: Record<string, number>, sceneId?: string) {
  let got = 0;
  let max = 0;
  for (const [id, scene] of scenes) {
    if (sceneId && id !== sceneId) continue;
    for (const h of scene.hotspots) {
      if (!canEarnStars(h)) continue;
      max += 3;
      got += stars[h.id] ?? 0;
    }
  }
  return { got, max };
}

export function findHotspot(id: string) {
  return hotspots.get(id) ?? null;
}

export function factsForHotspot(scene: SceneFacts, h: Hotspot): Fact[] {
  return h.factIds.map((id) => scene.facts.find((f) => f.id === id)!).filter(Boolean);
}

export function tx(text: LText | undefined, lang: Lang): string {
  if (!text) return '';
  return text[lang] || text.en;
}

// ---------------- dictionary lookup ----------------

const ARABIC_MARKS = /[ً-ٰٟـ]/g; // tashkeel + tatweel
const AR_PREFIXES = ['وال', 'بال', 'فال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل'];

export function normalizeWord(w: string, lang: Lang): string {
  let s = w.toLocaleLowerCase(lang).replace(ARABIC_MARKS, '');
  s = s.replace(/[’']/g, "'").replace(/^[«"“(']+|[»"”).,!?;:،؛']+$/g, '');
  if (lang === 'ar') s = s.replace(/[أإآ]/g, 'ا');
  return s;
}

function candidates(word: string, lang: Lang): string[] {
  const base = normalizeWord(word, lang);
  const out = [base];
  if (lang === 'fr') {
    const m = base.match(/^(?:l|d|j|qu|n|s|c|m|t)'(.+)$/);
    if (m) out.push(m[1]);
  }
  if (lang === 'ar') for (const p of AR_PREFIXES) if (base.startsWith(p) && base.length - p.length >= 2) out.push(base.slice(p.length));
  return out;
}

export function lookupWord(word: string, lang: Lang, sceneId?: string): GlossaryEntry | null {
  const cands = candidates(word, lang);
  const order = [...scenes.values()].sort((a, b) => Number(b.sceneId === sceneId) - Number(a.sceneId === sceneId));
  for (const s of order) {
    for (const g of s.glossary) {
      const terms = g.terms[lang].map((t) => normalizeWord(t, lang));
      if (cands.some((c) => terms.includes(c))) return g;
    }
  }
  return null;
}

/** All locked facts for a set of explored hotspot ids (used by Mascot Room chat). */
export function factsForExplored(ids: string[]): { hotspotId: string; title: LText; facts: Fact[] }[] {
  const out: { hotspotId: string; title: LText; facts: Fact[] }[] = [];
  for (const id of ids) {
    const hit = hotspots.get(id);
    if (hit) out.push({ hotspotId: id, title: hit.hotspot.title, facts: factsForHotspot(hit.scene, hit.hotspot) });
  }
  return out;
}
