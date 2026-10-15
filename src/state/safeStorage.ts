/** localStorage/sessionStorage can throw (private mode, blocked site data). Never let that break the app. */
function wrap(get: () => Storage | undefined) {
  return {
    getItem(k: string): string | null {
      try { return get()?.getItem(k) ?? null; } catch { return null; }
    },
    setItem(k: string, v: string) {
      try { get()?.setItem(k, v); } catch { /* ignore */ }
    },
    removeItem(k: string) {
      try { get()?.removeItem(k); } catch { /* ignore */ }
    },
  };
}
export const safeLocal = wrap(() => window.localStorage);
export const safeSession = wrap(() => window.sessionStorage);
