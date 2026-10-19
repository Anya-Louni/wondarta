/// <reference lib="webworker" />
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

/**
 * Speech to text, on the device. Whisper (MIT licence) is downloaded once and
 * cached by the browser; the child's voice never leaves the computer.
 * Runs in a worker so the 3D world keeps moving while it thinks.
 */
const MODEL = 'onnx-community/whisper-base';
const LANG: Record<string, string> = { en: 'english', fr: 'french', ar: 'arabic' };
let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

async function load() {
  const gpu = 'gpu' in navigator && !!(await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter().catch(() => null));
  return pipeline('automatic-speech-recognition', MODEL, {
    device: gpu ? 'webgpu' : 'wasm',
    dtype: gpu ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
    progress_callback: (p: { status: string; loaded?: number; total?: number; file?: string }) => {
      if (p.status === 'progress' && p.total) postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
    },
  }) as Promise<AutomaticSpeechRecognitionPipeline>;
}

self.onmessage = async (e: MessageEvent<{ audio: Float32Array; lang: string }>) => {
  try {
    asr ??= load();
    const run = await asr;
    postMessage({ type: 'ready' });
    const out = (await run(e.data.audio, { language: LANG[e.data.lang] ?? 'english', task: 'transcribe' })) as { text: string };
    postMessage({ type: 'text', text: out.text.trim() });
  } catch (err) {
    asr = null;
    postMessage({ type: 'error', message: String(err) });
  }
};
