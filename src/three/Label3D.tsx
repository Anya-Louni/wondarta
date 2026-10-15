import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Vector3 } from 'three';

const tmp = new Vector3();
const dir = new Vector3();

/**
 * DOM label anchored in 3D (real HTML, so Arabic shaping and RTL just work).
 * Hidden when behind the camera or beyond `maxDistance`, which drei's <Html>
 * doesn't do on its own without occlusion raycasts.
 */
export function Label3D({
  position,
  children,
  distanceFactor = 14,
  maxDistance = 40,
  zIndex = 10,
}: {
  position: [number, number, number];
  children: ReactNode;
  distanceFactor?: number;
  maxDistance?: number;
  zIndex?: number;
}) {
  const anchor = useRef<Group>(null);
  const el = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    if (!anchor.current || !el.current) return;
    anchor.current.getWorldPosition(tmp);
    camera.getWorldDirection(dir);
    const to = tmp.sub(camera.position);
    const visible = to.dot(dir) > 0.5 && to.length() < maxDistance;
    el.current.style.visibility = visible ? 'visible' : 'hidden';
  });
  return (
    <group ref={anchor} position={position}>
      <Html center distanceFactor={distanceFactor} zIndexRange={[zIndex, 0]}>
        <div ref={el}>{children}</div>
      </Html>
    </group>
  );
}
