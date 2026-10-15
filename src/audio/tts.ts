import type { Lang } from '../types/content';
import { useApp } from '../state/store';

/**
 * Narration via the browser-native Web Speech API (free, offline-capable,
 * no assets). Used for English, French and Modern Standard Arabic (فصحى).
 *
 * NOTE: TTS is only acceptable for MSA. Any dialect narration (Darija,
 * Egyptian, Levantine, Gulf...) must come from real human recordings produced
 * by the Localization/Voice role, never synthesized: TTS voices do not model
 * dialects and would teach kids a wrong accent. Recordings would live in
 * public/audio/voice/<lang>/<hotspot-id>.ogg and take priority over TTS.
 *
 * Voice availability depends on the OS (e.g. Windows ships "Microsoft Hoda"
 * for Arabic only if the Arabic speech pack is installed).
 */

const BCP47: Record<Lang, string[]> = {
  en: ['en-GB', 'en-US', 'en'],
  fr: ['fr-FR', 'fr-CA', 'fr'],
  ar: ['ar-SA', 'ar-EG', 'ar'],
};

function voices(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis?.getVoices() ?? [];
  } catch {
    return [];
  }
}

export function voiceFor(tag: string): SpeechSynthesisVoice | null {
  const vs = voices();
  const want = tag.toLowerCase();
  return (
    vs.find((v) => v.lang.toLowerCase() === want) ??
    vs.find((v) => v.lang.toLowerCase().startsWith(want.split('-')[0])) ??
    null
  );
}

export function hasVoice(lang: Lang): boolean {
  return BCP47[lang].some((t) => voiceFor(t));
}

// Some browsers load voices asynchronously.
try {
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => void 0);
} catch {
  /* ignore */
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

/** Speak in the UI language (narration) or an explicit BCP-47 tag (audio-match clips). */
export function speak(text: string, langOrTag: Lang | string, opts: { rate?: number; onEnd?: () => void } = {}): boolean {
  if (!useApp.getState().sound || !('speechSynthesis' in window)) return false;
  const tags = (BCP47 as Record<string, string[]>)[langOrTag] ?? [langOrTag];
  const voice = tags.map(voiceFor).find(Boolean) ?? null;
  if (!voice) return false;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = opts.rate ?? 0.95;
  u.pitch = 1.1;
  if (opts.onEnd) u.onend = opts.onEnd;
  window.speechSynthesis.speak(u);
  return true;
}
