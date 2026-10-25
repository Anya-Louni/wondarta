import { useApp } from '../state/store';

/**
 * Interaction sounds.
 *
 * Kenney's CC0 "Interface Sounds" and "UI Audio" packs (https://kenney.nl/assets),
 * mapped in public/audio/manifest.json. If a file fails to load, the sound is
 * synthesized with WebAudio instead.
 */

export type Sfx = 'click' | 'correct' | 'wrong' | 'portal' | 'pop' | 'giggle' | 'open';

let ctx: AudioContext | null = null;
let manifest: Partial<Record<Sfx, string>> | null = null;
const buffers = new Map<string, AudioBuffer>();

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

async function loadManifest() {
  if (manifest) return manifest;
  try {
    const res = await fetch('./audio/manifest.json');
    const json = (await res.json()) as { files?: Partial<Record<Sfx, string>> | [] };
    manifest = Array.isArray(json.files) ? {} : (json.files ?? {});
  } catch {
    manifest = {};
  }
  return manifest;
}
void loadManifest();

async function playFile(c: AudioContext, path: string) {
  let buf = buffers.get(path);
  if (!buf) {
    const res = await fetch(`./audio/${path}`);
    buf = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(path, buf);
  }
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = 0.5;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start();
}

function tone(c: AudioContext, freqs: number[], dur: number, type: OscillatorType = 'sine', gain = 0.12, gap = 0.07) {
  freqs.forEach((f, i) => {
    const t = c.currentTime + i * gap;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  });
}

const SYNTH: Record<Sfx, (c: AudioContext) => void> = {
  click: (c) => tone(c, [880], 0.08, 'triangle', 0.08),
  open: (c) => tone(c, [660, 990], 0.18, 'sine', 0.08, 0.05),
  pop: (c) => tone(c, [520, 1040], 0.1, 'sine', 0.1, 0.03),
  correct: (c) => tone(c, [523, 659, 784, 1047], 0.3, 'sine', 0.12),
  wrong: (c) => tone(c, [330, 262], 0.25, 'triangle', 0.1, 0.12),
  portal: (c) => tone(c, [392, 523, 659, 784, 1047, 1319], 0.5, 'sine', 0.07, 0.05),
  giggle: (c) => tone(c, [900, 1100, 950, 1200], 0.09, 'sine', 0.08, 0.06),
};

export function sfx(name: Sfx) {
  if (!useApp.getState().sound) return;
  const c = ac();
  if (!c) return;
  const file = manifest?.[name];
  if (file) playFile(c, file).catch(() => SYNTH[name](c));
  else SYNTH[name](c);
}
