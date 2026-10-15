import type React from 'react';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { Label3D } from './Label3D';
import { Color, Group, ShaderMaterial } from 'three';
import { Home } from 'lucide-react';
import { Model, type ModelId } from '../models';
import { player } from './playerState';
import { Glow } from './Environment';

interface Props {
  position: [number, number, number];
  rotationY: number;
  color: string;
  glow: string;
  label: string;
  /** 3D emblem floating in the doorway (replaces any icon/emoji). */
  emblem?: ModelId;
  home?: boolean;
  sub?: string;
  variant?: 'arch' | 'den';
  onEnter: () => void;
}

const portalVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const portalFrag = `uniform float t; uniform vec3 a; uniform vec3 b; varying vec2 vUv;
  void main(){
    vec2 p = vUv - 0.5;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float swirl = sin(ang * 3.0 + r * 18.0 - t * 2.0) * 0.5 + 0.5;
    vec3 c = mix(a, b, swirl * (1.0 - r));
    c += pow(1.0 - r, 3.0) * 0.6;
    gl_FragColor = vec4(c, 0.92);
  }`;

/**
 * A glowing doorway. Walk into it to go through. It only triggers once the
 * player has first been some distance away, so arriving in front of a portal
 * never bounces you straight back.
 */
export function Portal({ position, rotationY, color, glow, label, emblem, home, sub, variant = 'arch', onEnter }: Props) {
  const mat = useRef<ShaderMaterial>(null);
  const spin = useRef<Group>(null);
  const armed = useRef(false);
  const fired = useRef(false);
  const uniforms = useMemo(() => ({ t: { value: 0 }, a: { value: new Color(color) }, b: { value: new Color(glow) } }), [color, glow]);

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.t.value += dt;
    if (spin.current) {
      spin.current.rotation.y += dt * 0.6;
      spin.current.position.y = 1.45 + Math.sin(mat.current ? mat.current.uniforms.t.value * 1.6 : 0) * 0.08;
    }
    const d = Math.hypot(player.pos.x - position[0], player.pos.z - position[2]);
    if (d > 2.8) armed.current = true;
    if (armed.current && !fired.current && d < 1.3) {
      fired.current = true;
      onEnter();
    }
  });

  const isDen = variant === 'den';
  return (
    <group position={position} rotation-y={rotationY}>
      {isDen ? (
        <>
          {/* woven nest ring */}
          <mesh position={[0, 1.7, 0]}>
            <torusGeometry args={[1.45, 0.28, 10, 36]} />
            <meshStandardMaterial color="#b07a45" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 1.7, 0.02]}>
            <torusGeometry args={[1.3, 0.12, 8, 36]} />
            <meshStandardMaterial color="#e0b27a" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <circleGeometry args={[1.3, 40]} />
            <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={portalVert} fragmentShader={portalFrag} transparent />
          </mesh>
          <mesh position={[0, 0.1, 0.6]} scale={[1.5, 0.2, 1.1]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#f3c98b" roughness={1} />
          </mesh>
        </>
      ) : (
        <>
          {/* pillars + arch in glossy white */}
          {[-1.25, 1.25].map((x) => (
            <mesh key={x} position={[x, 1.25, 0]}>
              <cylinderGeometry args={[0.16, 0.2, 2.5, 16]} />
              <meshStandardMaterial color="#f7fbff" roughness={0.12} metalness={0.05} envMapIntensity={1.5} />
            </mesh>
          ))}
          <mesh position={[0, 2.5, 0]}>
            <torusGeometry args={[1.25, 0.16, 12, 40, Math.PI]} />
            <meshStandardMaterial color="#f7fbff" roughness={0.12} metalness={0.05} envMapIntensity={1.5} />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <planeGeometry args={[2.34, 2.5]} />
            <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={portalVert} fragmentShader={portalFrag} transparent />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <circleGeometry args={[1.17, 32, 0, Math.PI]} />
            <meshBasicMaterial color={glow} transparent opacity={0.85} />
          </mesh>
        </>
      )}
      {emblem && (
        <group ref={spin} position={[0, 1.45, 0.7]}>
          <Model id={emblem} fit={isDen ? 1.1 : 1.25} anchor="center" />
        </group>
      )}
      <Glow color={glow} size={isDen ? 5 : 5.5} opacity={0.55} position={[0, 1.7, -0.2]} />
      <Sparkles count={18} scale={[2.2, 2.6, 1]} position={[0, 1.6, 0.3]} size={3} speed={0.4} color={glow} />
      <Label3D position={[0, isDen ? 3.6 : 3.35, 0]} distanceFactor={18}>
        <div className="plaque" style={{ '--accent': color } as React.CSSProperties}>
          {home ? <Home className="i" style={{ color: 'var(--sky-600)' }} /> : <span className="dot" />}
          <span>
            {label}
            {sub && <span className="sub">{sub}</span>}
          </span>
        </div>
      </Label3D>
    </group>
  );
}
