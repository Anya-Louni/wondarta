import { useMemo, useRef, type ComponentProps } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { AdditiveBlending, BackSide, Color, InstancedMesh, Object3D } from 'three';
import { glowTexture } from './textures';
import { useQuality } from './quality';

/** Soft continuous sky gradient that behaves like light (Frutiger Aero), plus a sun glow. */
export function GradientSky({ top = '#3fa9f5', horizon = '#dff6ff', bottom = '#bdeba0' }: { top?: string; horizon?: string; bottom?: string }) {
  const uniforms = useMemo(
    () => ({ top: { value: new Color(top) }, horizon: { value: new Color(horizon) }, bottom: { value: new Color(bottom) } }),
    [top, horizon, bottom],
  );
  return (
    <mesh scale={200} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;
          void main(){
            float y = vP.y;
            vec3 c = y > 0.0 ? mix(horizon, top, pow(y, 0.6)) : mix(horizon, bottom, pow(-y, 0.5));
            float sun = pow(max(dot(vP, normalize(vec3(0.4, 0.55, -0.7))), 0.0), 60.0);
            gl_FragColor = vec4(c + sun * vec3(1.0, 0.97, 0.85), 1.0);
          }`}
      />
    </mesh>
  );
}

/** Standard soft lighting: hemisphere sky/ground + a warm key light. No shadows (cheap). */
export function SoftLights({ sky = '#e8f7ff', ground = '#9fd88a', keyLight = '#fff6e0', intensity = 1, shadows = false }) {
  return (
    <>
      <hemisphereLight args={[sky, ground, 0.55 * intensity]} />
      <directionalLight
        position={shadows ? [14, 16, 9] : [8, 14, 6]}
        intensity={1.7 * intensity}
        color={keyLight}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}

/**
 * Rising translucent bubbles (instanced: one draw call). Transparent spheres
 * are fill-rate hungry, so the low tier keeps fewer and rounder-but-coarser
 * ones.
 */
export function Bubbles({ count = 40, radius = 12, height = 10, color = '#ffffff', center = [0, 0, 0] as [number, number, number] }) {
  const low = useQuality((s) => s.tier === 'low');
  count = low ? Math.ceil(count * 0.4) : count;
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        a: Math.random() * Math.PI * 2,
        r: Math.sqrt(Math.random()) * radius,
        y: Math.random() * height,
        s: 0.06 + Math.random() * 0.18,
        v: 0.3 + Math.random() * 0.6,
      })),
    [count, radius, height],
  );
  useFrame((st, dt) => {
    const m = ref.current;
    if (!m) return;
    seeds.forEach((b, i) => {
      b.y += b.v * dt;
      if (b.y > height) b.y = 0;
      const wob = Math.sin(st.clock.elapsedTime * 1.5 + i) * 0.2;
      dummy.position.set(center[0] + Math.cos(b.a) * b.r + wob, center[1] + b.y, center[2] + Math.sin(b.a) * b.r);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, low ? 8 : 14, low ? 6 : 10]} />
      <meshStandardMaterial color={color} transparent opacity={0.35} roughness={0} envMapIntensity={1.5} />
    </instancedMesh>
  );
}

/** drei's Sparkles, minus the sparkle on machines that need the frames more. */
export function Twinkles(props: ComponentProps<typeof Sparkles>) {
  const low = useQuality((s) => s.tier === 'low');
  return low ? null : <Sparkles {...props} />;
}

/** Additive glow disc (bloom look without a post-processing pass). */
export function Glow({ color = '#ffffff', size = 2, opacity = 0.8, position = [0, 0, 0] as [number, number, number] }) {
  return (
    <sprite position={position} scale={size}>
      <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} />
    </sprite>
  );
}
