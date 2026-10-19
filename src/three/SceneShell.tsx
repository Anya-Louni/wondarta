import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Hotspot as HotspotData } from '../types/content';
import { tx } from '../content/loader';
import { useApp } from '../state/store';
import { sfx } from '../audio/sfx';
import { Player, type Bounds } from './Player';
import { Hotspot } from './Hotspot';
import { Portal } from './Portal';
import { Mascot } from './Mascot';
import { GradientSky, SoftLights } from './Environment';
import { Atmosphere, Clouds, GroundShadows } from './World';
import { placePlayer, walkTo } from './playerState';
import type { Vector3 } from 'three';

export interface ShellProps {
  hotspots: HotspotData[];
  start: { x: number; z: number; yaw: number };
  bounds: Bounds;
  exit: { position: [number, number, number]; rotationY: number };
  sky?: { top?: string; horizon?: string; bottom?: string };
  fog?: [string, number, number];
  lights?: { sky?: string; ground?: string; keyLight?: string; intensity?: number };
  hotspotColor?: string;
  /** contact-shadow area (metres) */
  shadowSize?: number;
  clouds?: boolean;
  /** where Wondoo should fly instead of following (Wonder tours) */
  mascotChase?: { current: Vector3 | null };
  children: ReactNode;
}

/**
 * The shared scene runtime. Every subject scene (the flagship Living World and
 * all nine mini-scenes) is a SceneShell + its own decor. Player, mascot,
 * hotspots, exit portal and tap-to-walk all come from here, so a fix lands
 * everywhere at once.
 */
export function SceneShell({ hotspots, start, bounds, exit, sky, fog, lights, hotspotColor, shadowSize = 24, clouds = true, mascotChase, children }: ShellProps) {
  const { t } = useTranslation();
  const lang = useApp((s) => s.lang);
  const explored = useApp((s) => s.explored);
  const openId = useApp((s) => s.openHotspot);
  const open = useApp((s) => s.open);
  const goTo = useApp((s) => s.goTo);
  const focus = useApp((s) => s.focusHotspot);

  useEffect(() => {
    placePlayer(start.x, start.z, start.yaw);
    // Arriving via a linked topic: walk to that hotspot; walking into it opens it.
    const target = hotspots.find((h) => h.id === focus);
    if (target) walkTo(target.position[0], target.position[2]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <GradientSky {...sky} />
      <SoftLights {...lights} />
      <Atmosphere sky={sky?.horizon} ground={sky?.bottom} />
      <GroundShadows size={shadowSize} />
      {clouds && <Clouds />}
      {fog && <fog attach="fog" args={fog} />}
      <Player bounds={bounds} />

      {/* invisible tap-to-walk floor */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]}
        onClick={(e) => {
          if (e.delta > 6) return;
          walkTo(e.point.x, e.point.z);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {children}

      {hotspots.map((h) => (
        <Hotspot
          key={h.id}
          position={h.position}
          title={tx(h.title, lang)}
          visited={explored.includes(h.id)}
          active={openId === h.id}
          color={hotspotColor}
          onOpen={() => {
            if (useApp.getState().openHotspot !== h.id) open(h.id);
          }}
        />
      ))}

      <Portal
        position={exit.position}
        rotationY={exit.rotationY}
        color="#7cc8f0"
        glow="#e8f8ff"
        home
        label={t('hud.backToHall')}
        onEnter={() => {
          sfx('portal');
          goTo('hub');
        }}
      />
      <Mascot mode="follow" chase={mascotChase} />
    </>
  );
}
