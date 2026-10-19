import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../types/content';

/**
 * "Hold the mic and talk": records up to 10 seconds, then the on-device
 * Whisper worker turns it into text. The first time, the model downloads
 * (progress is reported); after that it is cached by the browser.
 */
export type ListenState = { phase: 'idle' | 'recording' | 'loading' | 'thinking' | 'error'; progress: number };

let worker: Worker | null = null;
const files = new Map<string, { loaded: number; total: number }>();
function getWorker() {
  worker ??= new Worker(new URL('./listen.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

async function toPcm16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const audio = await ctx.decodeAudioData(buf);
    return audio.getChannelData(0).slice();
  } finally {
    void ctx.close();
  }
}

export function useListen(lang: Lang, onText: (text: string) => void) {
  const [state, setState] = useState<ListenState>({ phase: 'idle', progress: 0 });
  const rec = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef(0);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const transcribe = async (blob: Blob) => {
    setState({ phase: 'thinking', progress: 0 });
    const pcm = await toPcm16k(blob);
    const w = getWorker();
    w.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'progress') {
        files.set(m.file, { loaded: m.loaded, total: m.total });
        const all = [...files.values()];
        setState({ phase: 'loading', progress: all.reduce((s, f) => s + f.loaded, 0) / Math.max(1, all.reduce((s, f) => s + f.total, 0)) });
      } else if (m.type === 'ready') setState({ phase: 'thinking', progress: 1 });
      else if (m.type === 'text') {
        setState({ phase: 'idle', progress: 0 });
        if (m.text) cb.current(m.text);
      } else if (m.type === 'error') setState({ phase: 'error', progress: 0 });
    };
    w.postMessage({ audio: pcm, lang }, [pcm.buffer]);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const r = new MediaRecorder(stream);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => parts.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void transcribe(new Blob(parts, { type: r.mimeType }));
      };
      rec.current = r;
      r.start();
      setState({ phase: 'recording', progress: 0 });
      stopTimer.current = window.setTimeout(() => r.state === 'recording' && r.stop(), 10000);
    } catch {
      setState({ phase: 'error', progress: 0 });
    }
  };

  const stop = () => {
    window.clearTimeout(stopTimer.current);
    if (rec.current?.state === 'recording') rec.current.stop();
  };

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  return { state, start, stop, supported };
}
