/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';
// @ts-expect-error -- emscripten build of piper-phonemize (espeak-ng), copied from @diffusionstudio/vits-web
import { createPiperPhonemize } from '../vendor/piper-phonemize.js';

/**
 * Wondarta's voice engine. Piper voices run with ONNX Runtime in this worker,
 * and each voice is loaded ONCE and kept in memory, so after the first
 * sentence Wondoo answers quickly. Voice files are downloaded once and kept in
 * the browser's private storage (the same folder the vits-web library uses).
 */
// Wondoo sounds like a kid: speak a little slower, then play it back faster.
// Same speed in the end, about four semitones higher.
const KID = 1.26;
const HF = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';
const PHONEMIZE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/';
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const PATH: Record<string, string> = {
  'en_US-kristin-medium': 'en/en_US/kristin/medium/en_US-kristin-medium.onnx',
  'fr_FR-siwis-medium': 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx',
  'ar_JO-kareem-medium': 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx',
};

type Config = { espeak: { voice: string }; audio: { sample_rate: number }; inference: { noise_scale: number; length_scale: number; noise_w: number }; speaker_id_map: Record<string, number> };
const voices = new Map<string, Promise<{ session: ort.InferenceSession; config: Config }>>();

async function cached(url: string, onProgress?: (loaded: number, total: number) => void): Promise<Blob> {
  const dir = await navigator.storage.getDirectory().then((d) => d.getDirectoryHandle('piper', { create: true }));
  const name = url.split('/').at(-1)!;
  try {
    return await (await dir.getFileHandle(name)).getFile();
  } catch {
    /* not downloaded yet */
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`voice download failed: ${res.status}`);
  const total = Number(res.headers.get('Content-Length') ?? 0);
  const reader = res.body!.getReader();
  const parts: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value as Uint8Array<ArrayBuffer>);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const blob = new Blob(parts);
  try {
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(blob);
    await w.close();
  } catch {
    /* storage full or private mode: still works, just downloads again next time */
  }
  return blob;
}

function loadVoice(id: string) {
  let v = voices.get(id);
  if (!v) {
    v = (async () => {
      const url = `${HF}/${PATH[id]}`;
      const config = JSON.parse(await (await cached(`${url}.json`)).text()) as Config;
      const model = await cached(url, (loaded, total) => postMessage({ type: 'progress', loaded, total }));
      const session = await ort.InferenceSession.create(await model.arrayBuffer());
      return { session, config };
    })();
    v.catch(() => voices.delete(id));
    voices.set(id, v);
  }
  return v;
}

// The phonemizer (text to sounds) takes over a second to start, so start it once and reuse it.
let phonemizer: Promise<{ callMain: (args: string[]) => void }> | null = null;
let onLine: ((line: string) => void) | null = null;
let queue = Promise.resolve();
function phonemeIds(text: string, voice: string): Promise<number[]> {
  phonemizer ??= createPiperPhonemize({
    print: (line: string) => onLine?.(line),
    printErr: () => undefined,
    locateFile: (f: string) => (f.endsWith('.wasm') ? `${PHONEMIZE}.wasm` : f.endsWith('.data') ? `${PHONEMIZE}.data` : f),
  });
  // one sentence at a time through the shared phonemizer
  const job = queue.then(
    () =>
      new Promise<number[]>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('phonemizer timeout')), 8000);
        onLine = (line) => {
          clearTimeout(timer);
          resolve(JSON.parse(line).phoneme_ids);
        };
        phonemizer!.then((m) => m.callMain(['-l', voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data'])).catch(reject);
      }),
  );
  queue = job.then(
    () => undefined,
    () => {
      phonemizer = null;
    },
  );
  return job;
}

function wav(samples: Float32Array, rate: number): ArrayBuffer {
  const v = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return v.buffer;
}

self.onmessage = async (e: MessageEvent<{ id: number; voice: string; text?: string }>) => {
  const { id, voice, text } = e.data;
  try {
    const { session, config } = await loadVoice(voice);
    if (!text) return postMessage({ type: 'ready', id });
    const ids = await phonemeIds(text, config.espeak.voice);
    const feeds: Record<string, ort.Tensor> = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([config.inference.noise_scale, config.inference.length_scale * KID, config.inference.noise_w]), [3]),
    };
    if (Object.keys(config.speaker_id_map ?? {}).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await session.run(feeds);
    const buf = wav(out.output.data as Float32Array, Math.round(config.audio.sample_rate * KID));
    postMessage({ type: 'audio', id, wav: buf }, [buf]);
  } catch (err) {
    postMessage({ type: 'error', id, message: String(err) });
  }
};
