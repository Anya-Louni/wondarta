import { useEffect, useState } from 'react';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { wikiThumb } from '../wiki/wikipedia';

/**
 * A framed picture whose image is the lead image of a Wikipedia article
 * (Wikimedia Commons serves CORS-enabled images). Offline or on failure it
 * shows a blank canvas, so the scene never breaks.
 */
export function WikiPicture({
  title,
  position,
  rotationY = 0,
  width = 2,
  height = 2.6,
  frame = '#d8b24a',
}: {
  title: string;
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  height?: number;
  frame?: string;
}) {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    let alive = true;
    wikiThumb(title).then((thumb) => {
      if (!thumb || !alive) return;
      const loader = new TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        thumb.src,
        (t) => {
          t.colorSpace = SRGBColorSpace;
          if (alive) setTex(t);
        },
        undefined,
        () => undefined,
      );
    });
    return () => {
      alive = false;
    };
  }, [title]);

  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[width + 0.3, height + 0.3, 0.1]} />
        <meshStandardMaterial color={frame} metalness={0.6} roughness={0.25} envMapIntensity={1.5} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        {tex ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshStandardMaterial color="#e9e2cf" roughness={0.9} />}
      </mesh>
    </group>
  );
}
