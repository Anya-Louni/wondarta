import type React from 'react';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Label3D } from './Label3D';
import { Check } from 'lucide-react';
import { AdditiveBlending, Group, Mesh, Sprite } from 'three';
import { flareTexture } from './textures';
import { player } from './playerState';

interface Props {
  position: [number, number, number];
  title: string;
  visited: boolean;
  active: boolean;
  onOpen: () => void;
  color?: string;
}

/**
 * Soft glowing lens-flare marker on a glass pedestal. Click it from anywhere,
 * or simply walk into it ("walk through it, don't click through it").
 */
export function Hotspot({ position, title, visited, active, onOpen, color = '#9fe3ff' }: Props) {
  const flare = useRef<Sprite>(null);
  const ring = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const [near, setNear] = useState(false);
  const [hover, setHover] = useState(false);
  const armed = useRef(true);

  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (flare.current) {
      const s = (active ? 2.2 : 1.6) + Math.sin(t * 2.2 + position[0]) * 0.18;
      flare.current.scale.setScalar(s);
      flare.current.material.rotation = t * 0.25;
    }
    if (ring.current) ring.current.rotation.z = t * 0.6;
    const d = Math.hypot(player.pos.x - position[0], player.pos.z - position[2]);
    const isNear = d < 9;
    if (isNear !== near) setNear(isNear);
    // walk-in trigger: open once per approach
    if (d < 1.4 && armed.current && !player.frozen) {
      armed.current = false;
      onOpen();
    }
    if (d > 3) armed.current = true;
  });

  const tint = visited ? '#c9ffb8' : color;
  return (
    <group
      ref={group}
      position={position}
      onClick={(e) => {
        if (e.delta > 6) return; // was a drag-to-look
        e.stopPropagation();
        onOpen();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
      }}
    >
      {/* glass pedestal */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.55, 0.7, 0.5, 24]} />
        <meshStandardMaterial color="#eaf7ff" roughness={0.04} metalness={0.1} transparent opacity={0.82} envMapIntensity={1.5} />
      </mesh>
      <mesh ref={ring} position={[0, 0.52, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.62, 0.035, 8, 48]} />
        <meshBasicMaterial color={tint} />
      </mesh>
      {/* invisible, generous click target */}
      <mesh position={[0, 1.4, 0]} visible={false}>
        <sphereGeometry args={[0.9, 8, 8]} />
      </mesh>
      <sprite ref={flare} position={[0, 1.55, 0]}>
        <spriteMaterial map={flareTexture()} color={tint} transparent blending={AdditiveBlending} depthWrite={false} />
      </sprite>
      {(near || hover) && (
        <Label3D position={[0, 2.7, 0]} distanceFactor={12}>
          <div className="plaque small" style={{ '--accent': color } as React.CSSProperties}>
            {visited ? <Check className="i" /> : <span className="dot" />}
            {title}
          </div>
        </Label3D>
      )}
    </group>
  );
}
