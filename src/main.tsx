import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
// Humanist sans (OFL): IBM Plex Sans + IBM Plex Sans Arabic, bundled locally (no CDN).
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './styles/aero.css';
import i18n from './i18n';
import App from './App';
import { useApp } from './state/store';
import { player, walkTo } from './three/playerState';
import { modelThumb } from './models';
import MODEL_IDS from './models/modelIds.json';

// Dev-only handle for manual testing from the browser console.
if (import.meta.env.DEV) Object.assign(window, { __wondarta: { useApp, player, walkTo, modelThumb, MODEL_IDS } });

/** If anything breaks, the child sees a friendly card with one button, never a blank page. */
class Safety extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="slab oops" role="alert">
        <p>{i18n.t('app.oops')}</p>
        <button type="button" className="btn go" onClick={() => location.reload()}>
          {i18n.t('app.reload')}
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Safety>
      <App />
    </Safety>
  </StrictMode>,
);
