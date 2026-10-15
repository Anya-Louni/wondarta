import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * LLM keys are read WITHOUT the VITE_ prefix so they are never inlined into
 * the client bundle. In dev, requests to /api/groq and /api/gemini go through
 * this proxy, which attaches the key server-side.
 *
 * A static production build has no proxy, so the mascot simply "sleeps" for
 * LLM features while every scene and every curated fact keeps working. When
 * wrapped with Tauri, the same /api/* calls can be served by a Rust command
 * that holds the keys (see README "Tauri").
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './', // relative asset paths: works from file:// and inside Tauri's webview
    plugins: [react()],
    server: {
      proxy: {
        '/api/groq': {
          target: 'https://api.groq.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/groq/, '/openai/v1'),
          headers: env.GROQ_API_KEY ? { Authorization: `Bearer ${env.GROQ_API_KEY}` } : {},
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/gemini/, '/v1beta'),
          headers: env.GEMINI_API_KEY ? { 'x-goog-api-key': env.GEMINI_API_KEY } : {},
        },
      },
    },
    define: {
      // Only booleans leak to the client, never the keys themselves.
      __HAS_GROQ__: JSON.stringify(Boolean(env.GROQ_API_KEY)),
      __HAS_GEMINI__: JSON.stringify(Boolean(env.GEMINI_API_KEY)),
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three/')) return 'three';
            if (id.includes('@react-three')) return 'r3f';
          },
        },
      },
    },
  };
});
