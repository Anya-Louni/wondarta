import type { CategoryId } from '../types/content';
import { getScene } from '../content/loader';
import { SceneShell } from '../three/SceneShell';
import { circleBounds } from '../three/Player';
import { Bubbles, Twinkles } from '../three/Environment';
import { FloorDisc, GlassWall } from '../three/props';
import { THEMES } from './themes';

export const MINI_RADIUS = 10;

/**
 * The reusable mini-scene template: one small walkable room, 1-2 hotspots from
 * the category's locked facts.json, and a theme that only supplies colours and
 * decor. Adding a category = new facts.json + a theme entry, nothing else.
 */
export function MiniScene({ sceneId }: { sceneId: Exclude<CategoryId, 'animals' | 'ocean'> }) {
  const scene = getScene(sceneId);
  const theme = THEMES[sceneId];
  const { Decor } = theme;
  return (
    <SceneShell
      hotspots={scene.hotspots}
      start={{ x: 0, z: 6.5, yaw: 0 }}
      bounds={circleBounds(MINI_RADIUS - 0.8)}
      exit={{ position: [0, 0, MINI_RADIUS - 1], rotationY: Math.PI }}
      sky={theme.sky}
      fog={[theme.sky.horizon, 18, 60]}
      lights={theme.lights}
      hotspotColor={theme.hotspotColor}
    >
      <FloorDisc radius={MINI_RADIUS} color={theme.floor} rim={theme.rim} />
      <GlassWall radius={MINI_RADIUS} color={theme.wall} />
      <Bubbles count={24} radius={MINI_RADIUS - 1} height={8} color={theme.bubble ?? '#ffffff'} />
      <Twinkles count={30} scale={[16, 6, 16]} position={[0, 3, 0]} size={3} speed={0.25} color={theme.bubble ?? '#ffffff'} />
      <Decor />
    </SceneShell>
  );
}
