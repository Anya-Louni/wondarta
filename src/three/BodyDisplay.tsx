import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { FrontSide, Group, Mesh, MeshStandardMaterial } from 'three';

/**
 * A museum case: real organs (BodyParts3D, from MRI scans) standing in their
 * true places inside a glass anatomy torso, turning slowly. Every file shares one body
 * frame in metres, so they assemble with no hand placement at all.
 */
const ORGANS = ['brain', 'lungs', 'heart', 'liver', 'stomach', 'kidneys', 'small-intestine', 'large-intestine'] as const;
const url = (id: string) => `./models/body/${id}.glb`;

function Part({ id }: { id: string }) {
  const { scene } = useGLTF(url(id));
  const obj = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={obj} />;
}

function Glass() {
  const { scene } = useGLTF(url('torso'));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const glass = new MeshStandardMaterial({ color: '#e4f6ff', transparent: true, opacity: 0.12, roughness: 0.15, depthWrite: false, side: FrontSide });
    c.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = glass;
        o.renderOrder = 2;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={obj} />;
}

export function BodyDisplay({ position, scale = 2.4, withGlass = true }: { position: [number, number, number]; scale?: number; withGlass?: boolean }) {
  const spin = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.25;
  });
  return (
    <group position={position}>
      {/* pedestal */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.9, 1.05, 0.5, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} envMapIntensity={1.4} />
      </mesh>
      <group ref={spin} position={[0, 0.5, 0]} scale={scale}>
        {/* the body frame's origin is the feet: drop the torso (hips at 0.86 m) onto the
            pedestal, and pull it back so the spin axis runs through the middle of the chest */}
        <group position={[0, -0.86, -0.1]}>
          <Suspense fallback={null}>
            {ORGANS.map((id) => (
              <Part key={id} id={id} />
            ))}
            {withGlass && <Glass />}
          </Suspense>
        </group>
      </group>
    </group>
  );
}
