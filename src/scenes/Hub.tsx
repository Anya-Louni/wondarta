import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Label3D } from '../three/Label3D';
import { CATEGORY_IDS, type CategoryId } from '../types/content';
import { CATEGORY_STYLE } from '../content/categories';
import { useApp } from '../state/store';
import { starTally } from '../content/loader';
import { sfx } from '../audio/sfx';
import { useLines } from '../i18n';
import { DoubleSide } from 'three';
import { Player, circleBounds, type Bounds } from '../three/Player';
import { Portal } from '../three/Portal';
import { Mascot } from '../three/Mascot';
import { Bubbles, Glow, GradientSky, SoftLights } from '../three/Environment';
import { placePlayer, walkTo, yawToward } from '../three/playerState';
import { groundTexture, hallFloorTexture } from '../three/textures';
import { Butterflies, DenGate, FountainLife, GardenRing, Planters } from './hubDecor';
import { Atmosphere, Clouds, GroundShadows } from '../three/World';
import { BakedShadows, FloorGlow, LeapingFish, rippleAt } from './hallLife';

/** The tiling grain that keeps the polished floor from looking like plastic. */
function floorGrain() {
  const t = groundTexture().clone();
  t.needsUpdate = true;
  t.repeat.set(14, 14);
  return t;
}

/**
 * Inside the colonnade, and outside the fountain: you can lean over the basin
 * but not wade through it.
 */
const hallBounds: Bounds = (x, z) => {
  const [cx, cz] = circleBounds(19.5)(x, z);
  const d = Math.hypot(cx, cz);
  if (d > 2.9 || d === 0) return [cx, cz];
  return [(cx / d) * 2.9, (cz / d) * 2.9];
};

const R = 16; // portal ring radius
const DEN_Z = 17.5;
/** Subject doorways fan around the front, evenly spaced, leaving the back for the den. */
const SPAN = 300; // degrees of arc the subjects occupy
const STEP = SPAN / CATEGORY_IDS.length;
const angleOf = (i: number) => ((-SPAN / 2 + STEP / 2 + i * STEP) * Math.PI) / 180;
/** The angle of each doorway, so the floor can draw a path to it. */
const SPOKES = [...CATEGORY_IDS.map((_, i) => angleOf(i)), Math.PI];

function portalLayout(): Record<CategoryId, { x: number; z: number; rotY: number }> {
  const out = {} as Record<CategoryId, { x: number; z: number; rotY: number }>;
  CATEGORY_IDS.forEach((id, i) => {
    const a = angleOf(i);
    const x = Math.sin(a) * R;
    const z = -Math.cos(a) * R;
    out[id] = { x, z, rotY: Math.atan2(-x, -z) };
  });
  return out;
}

// Wondoo says hello once per visit, by name once it knows it
let greeted = false;

export function Hub() {
  const { t } = useTranslation();
  const goTo = useApp((s) => s.goTo);
  const stars = useApp((s) => s.stars);
  const layout = useMemo(portalLayout, []);
  const tourDone = useApp((s) => s.tourDone);
  const line = useLines();
  useEffect(() => {
    if (!tourDone || greeted) return;
    const id = window.setTimeout(() => {
      greeted = true;
      useApp.getState().say(line('mascot.hello'));
    }, 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourDone]);

  useEffect(() => {
    const prev = useApp.getState().prevScene;
    // Step back out of the doorway you came through.
    let from: { x: number; z: number } | null = null;
    if (prev && prev in layout) from = layout[prev as CategoryId];
    if (prev === 'mascot-room') from = { x: 0, z: DEN_Z };
    if (from) {
      const k = (Math.hypot(from.x, from.z) - 3.4) / Math.hypot(from.x, from.z);
      const x = from.x * k;
      const z = from.z * k;
      placePlayer(x, z, yawToward(x, z, 0, 0));
    } else placePlayer(0, 9, 0);
  }, [layout]);

  const enter = (id: CategoryId | 'mascot-room') => {
    sfx('portal');
    goTo(id);
  };

  return (
    <>
      <GradientSky top="#2f9ff0" horizon="#e6f8ff" bottom="#cfeebd" />
      <SoftLights shadows />
      <BakedShadows />
      <Atmosphere />
      <GroundShadows size={44} far={4} opacity={0.5} />
      <FloorGlow />
      <Clouds />
      <fog attach="fog" args={['#dff4ff', 30, 90]} />
      <Player bounds={hallBounds} />

      {/* glossy atrium floor (also the tap-to-walk surface) */}
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        userData={{ floor: true }}
        onClick={(e) => {
          if (e.delta > 6) return;
          rippleAt(e.point.x, e.point.z);
          walkTo(e.point.x, e.point.z);
        }}
      >
        <circleGeometry args={[21, 72]} />
        {/* the medallion is the colour; the tiling grain only varies the gloss,
            so polished stone still looks like stone with your nose to it */}
        <meshStandardMaterial map={hallFloorTexture(SPOKES, Math.PI)} roughnessMap={floorGrain()} roughness={0.8} envMapIntensity={0.7} />
      </mesh>

      {/* bubbles drifting through the hall (one instanced draw call) */}
      <Bubbles count={44} radius={18} height={11} />

      {/* planted ring around the colonnade */}
      <GardenRing />
      <Butterflies />
      <Planters />

      {/* colonnade */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 20.5, 3, Math.cos(a) * 20.5]}>
            <cylinderGeometry args={[0.3, 0.35, 6, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} envMapIntensity={1.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 6.1, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[20.5, 0.35, 8, 72]} />
        <meshStandardMaterial color="#e9f7ff" roughness={0.2} envMapIntensity={1.5} />
      </mesh>
      {/* glass dome with ribs: the atrium reads as one grand room under the sky */}
      <mesh position={[0, 6.1, 0]} scale={[20.5, 8, 20.5]}>
        <sphereGeometry args={[1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#dff4ff" transparent opacity={0.12} roughness={0.05} depthWrite={false} side={2} envMapIntensity={1.5} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 6.1, 0]} rotation-y={(i / 12) * Math.PI} scale={[20.5, 8, 20.5]}>
          <torusGeometry args={[1, 0.006, 6, 64, Math.PI]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} envMapIntensity={1.5} />
        </mesh>
      ))}
      <mesh position={[0, 14.1, 0]}>
        <sphereGeometry args={[0.9, 24, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} emissive="#dff4ff" emissiveIntensity={0.4} envMapIntensity={1.5} />
      </mesh>

      {/* central bubble fountain */}
      <group>
        {/* a real basin: wall, floor and rim, so the water has depth and the
            fish have somewhere to be */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[2.4, 2.7, 0.7, 40, 1, true]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} side={DoubleSide} envMapIntensity={1.4} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[2.42, 40]} />
          <meshStandardMaterial color="#cdeeff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.7, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[2.38, 2.72, 40]} />
          <meshStandardMaterial color="#f4fcff" roughness={0.2} envMapIntensity={1.5} />
        </mesh>
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.12, 0.25, 2.6, 12]} />
          <meshStandardMaterial color="#bfeaff" transparent opacity={0.6} roughness={0} envMapIntensity={1.5} />
        </mesh>
        <FountainLife />
        <LeapingFish />
        <Glow color="#bff0ff" size={6} opacity={0.5} position={[0, 3.6, 0]} />
        <Label3D position={[0, 4.9, 0]} distanceFactor={14} zIndex={5}>
          <div className="plaque" style={{ fontSize: 24, color: '#0b6399', padding: '8px 18px' }}>
            {t('app.name')}
          </div>
        </Label3D>
      </group>


      {CATEGORY_IDS.map((id) => {
        const p = layout[id];
        const st = CATEGORY_STYLE[id];
        return (
          <Portal
            key={id}
            position={[p.x, 0, p.z]}
            rotationY={p.rotY}
            color={st.color}
            glow={st.glow}
            emblem={st.emblem}
            label={t(`categories.${id}`)}
            sub={(() => {
              const w = starTally(stars, id);
              return w.got ? `★ ${w.got}` : undefined;
            })()}
            onEnter={() => enter(id)}
          />
        );
      })}

      {/* Wondoo's Den: its own raised, warm alcove, apart from the subject portals */}
      <mesh position={[0, 0.06, DEN_Z - 0.6]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[3.2, 40]} />
        <meshStandardMaterial color="#ffe3b8" />
      </mesh>
      <pointLight position={[0, 2.5, DEN_Z - 2]} color="#ffb867" intensity={8} distance={8} />
      <DenGate />
      <Portal
        position={[0, 0, DEN_Z]}
        rotationY={Math.PI}
        variant="den"
        color="#ffb35c"
        glow="#fff0c9"
        emblem="nest"
        label={t('hub.mascotRoom')}
        onEnter={() => enter('mascot-room')}
      />

      <Mascot mode="follow" />
    </>
  );
}
