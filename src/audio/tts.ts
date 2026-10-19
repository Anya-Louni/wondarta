import { create } from 'zustand';
import type { Lang } from '../types/content';
import { useApp } from '../state/store';

/**
 * Wondarta's own voices. Narration no longer depends on which voices a
 * computer happens to have installed: each language has a neural voice that
 * runs inside the app (Piper voices through ONNX Runtime, in a background
 * thread). The voice downloads the first time it is needed, then stays cached
 * in the browser, so it also works offline afterwards.
 *
 *   en  en_US-kristin-medium   public domain (LibriVox reading)
 *   fr  fr_FR-siwis-medium     CC BY 4.0 (SIWIS French speech corpus)
 *   ar  ar_JO-kareem-medium    Modern Standard Arabic (see CREDITS.md)
 *
 * Dialects (Darija and others) must still be human recordings, never TTS.
 * The device's own speech engine is only a fallback if a voice fails to load.
 */

const VOICE = { en: 'en_US-kristin-medium', fr: 'fr_FR-siwis-medium', ar: 'ar_JO-kareem-medium' } as const;
const BCP47: Record<Lang, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar' };

/** "Wondoo is warming up its voice" while a voice downloads for the first time. */
export const useVoiceLoad = create<{ lang: Lang | null; progress: number }>(() => ({ lang: null, progress: 0 }));

// one engine for all voices; it keeps each voice loaded after first use
let engine: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, { ok: (wav: ArrayBuffer | null) => void; fail: (e: Error) => void; lang: Lang }>();
function synth(lang: Lang, text?: string): Promise<ArrayBuffer | null> {
  if (!engine) {
    engine = new Worker(new URL('./voice.worker.ts', import.meta.url), { type: 'module' });
    engine.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'progress') {
        const lang = [...waiting.values()][0]?.lang ?? null;
        useVoiceLoad.setState({ lang, progress: m.total ? m.loaded / m.total : 0 });
        return;
      }
      const w = waiting.get(m.id);
      if (!w) return;
      waiting.delete(m.id);
      useVoiceLoad.setState({ lang: null });
      if (m.type === 'error') w.fail(new Error(m.message));
      else w.ok(m.wav ?? null);
    };
  }
  const id = ++nextId;
  return new Promise((ok, fail) => {
    waiting.set(id, { ok, fail, lang });
    engine!.postMessage({ id, voice: VOICE[lang], text });
  });
}

/** Start loading a language's voice in the background (e.g. when the child picks a language). */
export function warmVoice(lang: Lang) {
  if (warmed.has(lang)) return;
  warmed.add(lang);
  // one tiny sentence primes the engine, so the first real one comes out fast (it is never played)
  synth(lang, { en: "Hi.", fr: "Salut.", ar: "مرحبا." }[lang]).catch(() => warmed.delete(lang));
}
const warmed = new Set<Lang>();

let current: HTMLAudioElement | null = null;
let ticket = 0;

/** Narration always has a voice now; kept so callers can stay simple. */
export function hasVoice(_lang: Lang): boolean {
  return true;
}

export function stopSpeaking() {
  ticket++;
  current?.pause();
  current = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

// Short sentences come back faster and sound more natural than one long block.
function chunks(text: string): string[] {
  const parts = text.match(/[^.!?؟。]+[.!?؟。]*\s*/g) ?? [text];
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.length + p.length < 90) out[out.length - 1] = last + p;
    else out.push(p);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

async function speakNeural(text: string, lang: Lang, rate: number, onEnd?: () => void) {
  const mine = ++ticket;
  // make the next sentence while the current one plays
  const parts = chunks(text);
  let next = synth(lang, parts[0]);
  for (let i = 0; i < parts.length; i++) {
    const buf = await next;
    if (mine !== ticket || !buf) return;
    if (i + 1 < parts.length) next = synth(lang, parts[i + 1]);
    const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    audio.playbackRate = rate;
    current = audio;
    await new Promise<void>((done) => {
      audio.onended = () => done();
      audio.onerror = () => done();
      audio.play().catch(() => done());
    });
    URL.revokeObjectURL(audio.src);
    if (mine !== ticket) return;
  }
  current = null;
  onEnd?.();
}

function speakDevice(text: string, tag: string, rate: number, onEnd?: () => void): boolean {
  if (!('speechSynthesis' in window)) return false;
  const all = window.speechSynthesis.getVoices();
  const voice = all.find((x) => x.lang.toLowerCase().startsWith(tag.toLowerCase().split('-')[0]));
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  u.pitch = 1.1;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

/** Read text aloud in one of the app's languages. */
export function speak(text: string, lang: Lang | string, opts: { rate?: number; onEnd?: () => void } = {}): boolean {
  if (!useApp.getState().sound || !text.trim()) return false;
  stopSpeaking();
  const rate = opts.rate ?? 0.95;
  if (lang in VOICE) {
    const l = lang as Lang;
    speakNeural(text, l, rate, opts.onEnd).catch(() => {
      useVoiceLoad.setState({ lang: null });
      // the device voice is only the safety net if the app's voice could not load
      if (!speakDevice(text, BCP47[l], rate, opts.onEnd)) opts.onEnd?.();
    });
    return true;
  }
  return speakDevice(text, lang, rate, opts.onEnd);
}

/** Play a real human recording from public/audio/. */
export function playClip(path: string, onEnd?: () => void): boolean {
  if (!useApp.getState().sound) return false;
  stopSpeaking();
  const a = new Audio(path);
  current = a;
  if (onEnd) a.onended = onEnd;
  a.play().catch(() => onEnd?.());
  return true;
}
