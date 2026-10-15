/// <reference types="vite/client" />

declare const __HAS_GROQ__: boolean;
declare const __HAS_GEMINI__: boolean;

interface ImportMetaEnv {
  readonly VITE_GROQ_MODEL?: string;
  readonly VITE_GEMINI_MODEL?: string;
}

interface Window {
  /** Production/Tauri: base URL of a proxy that serves /groq and /gemini with keys attached. */
  __WONDARTA_API_BASE__?: string;
}
