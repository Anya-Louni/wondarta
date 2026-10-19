import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGameOn } from './activities/puzzles/Board3D';
import { PerformanceMonitor } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { useApp } from './state/store';
import { player } from './three/playerState';
import { ANTIALIAS, useQuality } from './three/quality';
import { Hub } from './scenes/Hub';
import { LivingWorld } from './scenes/LivingWorld';
import { Aquarium } from './scenes/Aquarium';
import { MiniScene } from './scenes/MiniScene';
import { MascotRoom } from './scenes/MascotRoom';
import { Hud } from './ui/Hud';
import { Welcome } from './ui/Welcome';
import { FishToast, JournalPanel } from './ui/Journal';
import { VoiceWarm } from './ui/VoiceWarm';
import { WonderTour } from './ui/WonderTour';
import { WonderWorld } from './scenes/Wonder';
import { InfoCard } from './ui/InfoCard';
import { AskPanel } from './ui/AskPanel';
import { MascotRoomUI } from './ui/MascotRoomUI';

class GlBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Keeps the frame rate ahead of the picture: drei samples the real refresh
 * rate, and we spend what's left on resolution. It only starts watching a few
 * seconds after a scene mounts, so loading hitches don't get mistaken for a
 * slow machine, and a sustained shortfall drops the whole tier.
 */
function AutoQuality() {
  const setDpr = useQuality((s) => s.setDpr);
  const demote = useQuality((s) => s.demote);
  const reclamp = useQuality((s) => s.reclamp);
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setWatching(true), 3000);
    window.addEventListener('resize', reclamp);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', reclamp);
    };
  }, [reclamp]);
  if (!watching) return null;
  return (
    <PerformanceMonitor
      ms={300}
      iterations={6}
      flipflops={4}
      factor={0.7}
      bounds={(refresh) => [Math.min(48, refresh * 0.7), refresh]}
      onChange={({ factor }) => setDpr(0.8 + factor * 0.5)}
      onFallback={demote}
    />
  );
}

/** Dev only: expose the renderer, scene and camera for checks from the console. */
function DevHandle() {
  const three = useThree();
  if (import.meta.env.DEV) Object.assign(window, { __gl: three.gl, __scene: three.scene, __camera: three.camera, __app: useApp });
  return null;
}

function SceneSwitch() {
  const scene = useApp((s) => s.scene);
  switch (scene) {
    case 'hub':
      return <Hub />;
    case 'mascot-room':
      return <MascotRoom />;
    case 'animals':
      return <LivingWorld />;
    case 'ocean':
      return <Aquarium />;
    case 'wonder':
      return <WonderWorld />;
    default:
      return <MiniScene key={scene} sceneId={scene as Exclude<typeof scene, 'animals' | 'ocean' | 'wonder'>} />;
  }
}

export default function App() {
  const { t } = useTranslation();
  const scene = useApp((s) => s.scene);
  const openHotspot = useApp((s) => s.openHotspot);
  const gameOn = useGameOn() > 0;
  const askOpen = useApp((s) => s.askOpen);
  const tourDone = useApp((s) => s.tourDone);
  const journalOpen = useApp((s) => s.journalOpen);
  const wonder = useApp((s) => s.wonder);
  const recordVisit = useApp((s) => s.recordVisit);
  const dpr = useQuality((s) => s.dpr);

  useEffect(() => recordVisit(), [recordVisit]);
  // Don't let a walk-in hotspot trigger while the kid is typing a question.
  useEffect(() => {
    player.frozen = askOpen;
  }, [askOpen]);

  return (
    <>
      <GlBoundary fallback={<div className="toast">{t('app.glError')}</div>}>
        <Canvas
          frameloop={gameOn ? 'never' : 'always'}
          shadows="percentage"
          dpr={dpr}
          gl={{ antialias: ANTIALIAS, powerPreference: 'high-performance', toneMappingExposure: 1.05 }}
          camera={{ fov: 62, near: 0.1, far: 400, position: [0, 1.55, 6] }}
          style={{ position: 'fixed', inset: 0, touchAction: 'none' }}
        >
          <AutoQuality />
          {import.meta.env.DEV && <DevHandle />}
          <Suspense fallback={null}>
            <SceneSwitch key={scene} />
          </Suspense>
        </Canvas>
      </GlBoundary>

      <Hud />
      {openHotspot && <InfoCard key={openHotspot} hotspotId={openHotspot} />}
      {askOpen && <AskPanel />}
      {journalOpen && <JournalPanel />}
      <FishToast />
      <VoiceWarm />
      {scene === 'mascot-room' && !askOpen && <MascotRoomUI />}
      {scene === 'wonder' && !askOpen && <WonderTour key={JSON.stringify(wonder)} />}
      {scene === 'hub' && !askOpen && !openHotspot && !tourDone && <Welcome />}
      <div key={scene} className="fade-screen" aria-hidden />
    </>
  );
}
