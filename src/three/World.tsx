import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Color, Group, ShaderMaterial } from 'three';
import { useQuality } from './quality';

/**
 * Image-based lighting without downloading an HDR: a few glowing panels are
 * rendered once into a cube map (frames=1). Glossy materials (Wondoo, glass,
 * lacquered models) pick up soft sky reflections, the Frutiger Aero sheen.
 */
export function Atmosphere({ sky = '#cfeeff', ground = '#bfe9a8', warm = '#fff1d6', intensity = 1 }: { sky?: string; ground?: string; warm?: string; intensity?: number }) {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={0.45 * intensity}>
      <Lightformer form="rect" intensity={1.3} color={sky} scale={[30, 30, 1]} position={[0, 14, 0]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={0.5} color={ground} scale={[30, 30, 1]} position={[0, -6, 0]} rotation-x={-Math.PI / 2} />
      <Lightformer form="circle" intensity={4} color={warm} scale={5} position={[10, 8, 8]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.4} color="#9fd8ff" scale={[12, 6, 1]} position={[-12, 5, -6]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={1.2} color="#ffffff" scale={6} position={[0, 4, 14]} target={[0, 0, 0]} />
    </Environment>
  );
}

/**
 * Soft contact shadows, rendered for the first ~2 s (so async Kenney models
 * are captured) and then frozen, costing nothing per frame after that. `far` keeps floating things (Wondoo, flares) from casting.
 */
export function GroundShadows({ size = 30, far = 1.4, opacity = 0.42, y = 0.012 }: { size?: number; far?: number; opacity?: number; y?: number }) {
  const low = useQuality((s) => s.tier === 'low');
  // Each captured frame is a full depth pass of the whole scene, and those
  // passes are what made walking into a room stutter. 60 frames still catches
  // the Kenney models as they stream in, and once frozen this costs nothing.
  return (
    <ContactShadows
      position={[0, y, 0]}
      scale={size}
      resolution={low ? 256 : 512}
      blur={2.4}
      far={far}
      opacity={opacity}
      frames={low ? 30 : 60}
      color="#123a5c"
    />
  );
}

/** Puffy drifting clouds made of a few spheres each (no textures). */
export function Clouds({ count = 7, radius = 55, height = 26, color = '#ffffff' }: { count?: number; radius?: number; height?: number; color?: string }) {
  const low = useQuality((s) => s.tier === 'low');
  count = low ? 4 : count;
  const g = useRef<Group>(null);
  const clouds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + i * 0.37;
        const puffs = Array.from({ length: 5 + (i % 3) }, (_, k) => ({
          x: (k - 2.5) * 2.2 + Math.sin(k * 3.1 + i) * 0.8,
          y: Math.cos(k * 1.7 + i) * 0.7,
          z: Math.sin(k * 2.3) * 1.2,
          r: 1.8 + Math.abs(Math.sin(k * 2.1 + i)) * 1.6,
        }));
        return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, y: height + (i % 3) * 3, puffs, s: 0.8 + (i % 4) * 0.2 };
      }),
    [count, radius, height],
  );
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.006;
  });
  return (
    <group ref={g}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s} rotation-y={-Math.atan2(c.z, c.x)}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={[p.x, p.y, p.z]} scale={[p.r, p.r * 0.72, p.r]}>
              <sphereGeometry args={[1, low ? 10 : 18, low ? 7 : 12]} />
              <meshStandardMaterial color={color} emissive="#dff4ff" emissiveIntensity={0.35} roughness={1} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Stylized water: depth tint, animated ripple bands and a bright fresnel rim. */
export function Water({ radius = 4, deep = '#1f86c4', shallow = '#7fd6f5', opacity = 0.93 }: { radius?: number; deep?: string; shallow?: string; opacity?: number }) {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ t: { value: 0 }, deep: { value: new Color(deep) }, shallow: { value: new Color(shallow) }, alpha: { value: opacity } }),
    [deep, shallow, opacity],
  );
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.t.value += dt;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
      <circleGeometry args={[radius, 64]} />
      <shaderMaterial
        ref={mat}
        transparent
        uniforms={uniforms}
        vertexShader="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
        fragmentShader={`uniform float t; uniform float alpha; uniform vec3 deep; uniform vec3 shallow; varying vec2 vUv;
          void main(){
            vec2 p = vUv - 0.5;
            float r = length(p) * 2.0;
            vec3 c = mix(deep, shallow, smoothstep(0.2, 1.0, r));
            float w = sin(p.x * 38.0 + t * 1.4) * sin(p.y * 31.0 - t * 1.1);
            float ring = sin(r * 26.0 - t * 2.2);
            c += smoothstep(0.75, 1.0, w) * 0.18 + smoothstep(0.92, 1.0, ring) * 0.12 * (1.0 - r);
            c += pow(smoothstep(0.82, 1.0, r), 3.0) * 0.35;
            gl_FragColor = vec4(c, alpha);
          }`}
      />
    </mesh>
  );
}
