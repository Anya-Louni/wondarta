/**
 * Build-time guard for the locked content files (CONTENT ACCURACY SYSTEM).
 * Fails the build if any scene breaks the content contract. It checks structure,
 * NOT truth: factual review is a human step recorded in each file's `review` block.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LANGS = ['en', 'fr', 'ar'];
const CONTENT_TYPES = ['video', 'quiz', 'puzzle', 'narration', 'audio-match'];
const root = new URL('../src/content/scenes/', import.meta.url);
const errors = [];
const warnings = [];
const scenes = {};

for (const dir of readdirSync(root)) {
  scenes[dir] = JSON.parse(readFileSync(join(root.pathname.replace(/^\/([A-Z]:)/, '$1'), dir, 'facts.json'), 'utf8'));
}
const MODEL_IDS = new Set([
  ...JSON.parse(readFileSync(new URL('../src/models/modelIds.json', import.meta.url), 'utf8')),
  // downloaded models (src/models/real.tsx) can be used as pictures too
  ...JSON.parse(readFileSync(new URL('../src/models/realIds.json', import.meta.url), 'utf8')),
]);
const allHotspotIds = new Set(Object.values(scenes).flatMap((s) => s.hotspots.map((h) => h.id)));

function checkLText(v, where) {
  if (!v || typeof v !== 'object') return errors.push(`${where}: missing language-keyed text`);
  for (const l of LANGS) {
    if (typeof v[l] !== 'string' || !v[l].trim()) errors.push(`${where}: missing "${l}"`);
  }
}
function walk(v, where) {
  // any object that has an "en" key must be a full LText
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${where}[${i}]`));
  if (v && typeof v === 'object') {
    if ('model' in v && !MODEL_IDS.has(v.model)) errors.push(`${where}: unknown model "${v.model}"`);
    if ('emoji' in v) errors.push(`${where}: emoji media is not allowed, use a model id`);
    if ('en' in v && typeof v.en === 'string') return checkLText(v, where);
    for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  }
}

for (const [dir, s] of Object.entries(scenes)) {
  const at = `scenes/${dir}`;
  if (s.sceneId !== dir) errors.push(`${at}: sceneId "${s.sceneId}" != folder`);
  walk(s, at);
  if (s.review?.status !== 'reviewed') warnings.push(`${at}: review.status = ${s.review?.status} (needs human review before release)`);
  const factIds = new Set(s.facts.map((f) => f.id));
  if (factIds.size !== s.facts.length) errors.push(`${at}: duplicate fact ids`);
  let prev = null;
  s.hotspots.forEach((h, i) => {
    const w = `${at}/${h.id}`;
    if (!h.id.startsWith(`${dir}/`)) errors.push(`${w}: id must start with "${dir}/"`);
    if (!CONTENT_TYPES.includes(h.contentType)) errors.push(`${w}: bad contentType`);
    // two games in a row are fine as long as they are different kinds of game
    const kind = h.contentType + (h.puzzle ? `:${h.puzzle.type}:${h.puzzle.game ?? ''}` : '');
    if (prev === kind) errors.push(`${w}: "${kind}" repeats back to back`);
    prev = kind;
    if (h.sourceType !== 'curated') errors.push(`${w}: premade hotspots must be sourceType "curated"`);
    for (const id of h.factIds) if (!factIds.has(id)) errors.push(`${w}: unknown fact ${id}`);
    for (const id of h.linkedTopics) if (!allHotspotIds.has(id)) errors.push(`${w}: linkedTopic ${id} does not exist`);
    if (!h.linkedTopics.length) errors.push(`${w}: must link onward (no dead ends)`);
    const need = { quiz: 'quiz', puzzle: 'puzzle', video: 'video', 'audio-match': 'audioMatch' }[h.contentType];
    if (need && !h[need]) errors.push(`${w}: contentType ${h.contentType} but no "${need}" block`);
    if (h.quiz) {
      if (!factIds.has(h.quiz.factId)) errors.push(`${w}: quiz.factId unknown`);
      if (!(h.quiz.answerIndex >= 0 && h.quiz.answerIndex < h.quiz.choices.length)) errors.push(`${w}: quiz answerIndex out of range`);
    }
    for (const q of h.moreQuestions ?? []) {
      if (!factIds.has(q.factId)) errors.push(`${w}: moreQuestions factId ${q.factId} unknown`);
      if (!(q.answerIndex >= 0 && q.answerIndex < q.choices.length)) errors.push(`${w}: moreQuestions answerIndex out of range`);
    }
    if (h.origin) {
      if (!h.origin.pins?.length) errors.push(`${w}: origin has no map pins`);
      for (const pin of h.origin.pins ?? []) {
        if (Math.abs(pin.lat) > 90 || Math.abs(pin.lon) > 180) errors.push(`${w}: origin pin out of range`);
      }
      if (!h.origin.continents?.length) errors.push(`${w}: origin has no continents`);
    }
    const p = h.puzzle;
    if (p) {
      for (const id of p.factIds) if (!factIds.has(id)) errors.push(`${w}: puzzle fact ${id} unknown`);
      if ('answerIndex' in p && !(p.answerIndex >= 0 && p.answerIndex < p.choices.length)) errors.push(`${w}: puzzle answerIndex out of range`);
      if (p.type === 'odd-one-out' && !p.options.some((o) => o.id === p.answerId)) errors.push(`${w}: answerId missing`);
      if (p.type === 'pattern-series' && !p.choices.some((o) => o.id === p.answerId)) errors.push(`${w}: answerId missing`);
      if (p.type === 'sort-match') for (const it of p.items) if (!p.bins.some((b) => b.id === it.bin)) errors.push(`${w}: item ${it.id} bad bin`);
      if (p.type === 'cipher') for (const l of LANGS) if (!p.choices.some((c) => c[l] === p.plain[l])) errors.push(`${w}: cipher plain (${l}) not among choices`);
      if (p.type === 'name-that-x') p.rounds.forEach((r) => { if (!(r.answerIndex >= 0 && r.answerIndex < r.choices.length)) errors.push(`${w}: round ${r.id} answerIndex`); });
      if ((p.type === 'memory-pairs' || p.type === 'photo-to-label-match') && p.show > p.pairs.length) {
        errors.push(`${w}: ${p.type} shows ${p.show} pairs but only ${p.pairs.length} are written`);
      }
      if (p.type === 'memory-pairs' && p.show > 6) errors.push(`${w}: memory-pairs board of ${p.show} pairs is too big for young players (max 6)`);
      if (p.type === 'map-find') {
        for (const r of p.rounds) {
          if (!p.options.includes(r.answer)) errors.push(`${w}: map round ${r.id} answer "${r.answer}" is not one of the options`);
          if (!factIds.has(r.factId)) errors.push(`${w}: map round ${r.id} factId unknown`);
          if (!r.pins.length) errors.push(`${w}: map round ${r.id} has no pins`);
          for (const pin of r.pins) {
            if (Math.abs(pin.lat) > 90 || Math.abs(pin.lon) > 180) errors.push(`${w}: map round ${r.id} pin out of range`);
          }
        }
      }
      if (p.type === 'command-route') {
        const g = p.grid.join('');
        if ((g.match(/S/g) || []).length !== 1 || (g.match(/G/g) || []).length !== 1) errors.push(`${w}: grid needs one S and one G`);
      }
      if (p.type === 'construction') for (const t of p.targets) for (const n of t.needs) if (!p.parts.some((x) => x.id === n)) errors.push(`${w}: target ${t.id} needs unknown part ${n}`);
    }
    if (h.video) for (const f of h.video.frames) if (!factIds.has(f.factId)) errors.push(`${w}: video frame fact ${f.factId} unknown`);
    if (h.audioMatch) for (const id of h.audioMatch.factIds) if (!factIds.has(id)) errors.push(`${w}: audio fact ${id} unknown`);
    if (i === 0 && s.hotspots.length > 9) warnings.push(`${at}: many hotspots`);
  });
}

for (const w of warnings) console.warn(`  ⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✖ ${e}`);
  console.error(`\nContent validation failed: ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`✔ Content OK: ${Object.keys(scenes).length} scenes, ${allHotspotIds.size} hotspots.`);
