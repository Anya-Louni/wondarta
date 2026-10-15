import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { FrontSide, Group, Mesh, MeshStandardMaterial, Vector3, type Material } from 'three';
import type { BodyBuildPuzzle, OrganId } from '../../types/content';
import { tx } from '../../content/loader';
import { sfx } from '../../audio/sfx';
import type { PuzzleProps } from './types';

/**
 * Build the body, in 3D. The organs are real anatomy (BodyParts3D, built from
 * MRI scans) and every file keeps its true place in the same body frame, so
 * an organ "put back" lands exactly where it sits in a person.
 *
 * Each round, the empty place for one organ glows inside a glass body; the kid
 * picks which organ belongs there, and it drops into place. Drag to turn.
 */
const url = (id: string) => `./models/body/${id}.glb`;

/** The torso's box in body coordinates, measured once from the organs, for framing. */
const FOCUS = new Vector3(0, 1.25, 0.1);

function Organ({ id, state }: { id: OrganId; state: 'hidden' | 'ghost' | 'placed' }) {
  const { scene } = useGLTF(url(id));
  const obj = useMemo(() => scene.clone(true), [scene]);
  // two looks for the same mesh: the real colours, and a glowing outline of the empty place
  const ghost = useMemo(() => new MeshStandardMaterial({ color: '#7fd8ff', emissive: '#39b6ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.35, depthWrite: false }), []);
  const originals = useMemo(() => {
    const m = new Map<Mesh, Material | Material[]>();
    obj.traverse((o) => o instanceof Mesh && m.set(o, o.material));
    return m;
  }, [obj]);
  const g = useRef<Group>(null);
  const drop = useRef(0);

  useEffect(() => {
    originals.forEach((mat, mesh) => (mesh.material = state === 'ghost' ? ghost : mat));
    if (state === 'placed') drop.current = 1;
  }, [state, originals, ghost]);

  useFrame((st, dt) => {
    if (!g.current) return;
    if (state === 'ghost') ghost.opacity = 0.25 + Math.sin(st.clock.elapsedTime * 4) * 0.12;
    drop.current = Math.max(0, drop.current - dt * 1.6);
    const k = drop.current * drop.current;
    g.current.position.y = k * 0.25; // falls into place from just above
  });

  if (state === 'hidden') return null;
  return (
    <group ref={g}>
      <primitive object={obj} />
    </group>
  );
}

function Shell() {
  const { scene } = useGLTF(url('torso'));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = new MeshStandardMaterial({ color: '#e4f6ff', transparent: true, opacity: 0.1, roughness: 0.2, depthWrite: false, side: FrontSide });
        o.renderOrder = 2;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={obj} />;
}

function Spin({ on, children }: { on: boolean; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (on && g.current) g.current.rotation.y += dt * 0.5;
  });
  return (
    <group ref={g} position={[-FOCUS.x, 0, -FOCUS.z]}>
      {children}
    </group>
  );
}

export function BodyBuild({ puzzle, lang, onSolved, onWrong }: PuzzleProps<BodyBuildPuzzle>) {
  const { t } = useTranslation();
  const [placed, setPlaced] = useState<OrganId[]>([]);
  const [wrong, setWrong] = useState<OrganId | null>(null);
  const [said, setSaid] = useState<OrganId | null>(null);
  const next = puzzle.organs[placed.length];
  const done = placed.length === puzzle.organs.length;
  const last = placed.length ? puzzle.organs.find((o) => o.id === placed[placed.length - 1]) : null;
  const choices = useMemo(() => [...puzzle.organs].sort((a, b) => tx(a.label, lang).localeCompare(tx(b.label, lang), lang)), [puzzle, lang]);

  const pick = (id: OrganId) => {
    if (done || placed.includes(id)) return;
    if (id === next.id) {
      sfx('pop');
      const now = [...placed, id];
      setPlaced(now);
      setSaid(null);
      if (now.length === puzzle.organs.length) onSolved();
    } else {
      setWrong(id);
      setSaid(id);
      window.setTimeout(() => setWrong(null), 500);
      onWrong();
    }
  };
  const saidOrgan = said ? puzzle.organs.find((o) => o.id === said) : null;

  return (
    <div className="bodybuild">
      <div className="bodybuild-view">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, FOCUS.y, 1.9], fov: 32, near: 0.01, far: 20 }} gl={{ antialias: true }}>
          <color attach="background" args={['#eaf7ff']} />
          <hemisphereLight args={['#ffffff', '#c9e7f7', 0.9]} />
          <directionalLight position={[1, 3, 2]} intensity={1.4} />
          <Environment resolution={64} frames={1} environmentIntensity={0.6}>
            <Lightformer form="rect" intensity={1.2} color="#ffffff" scale={[10, 10, 1]} position={[0, 5, 2]} />
          </Environment>
          <Suspense fallback={null}>
            <Spin on={done}>
              <Shell />
              {puzzle.organs.map((o) => (
                <Organ key={o.id} id={o.id} state={placed.includes(o.id) ? 'placed' : o.id === next?.id ? 'ghost' : 'hidden'} />
              ))}
            </Spin>
          </Suspense>
          <OrbitControls target={[0, FOCUS.y, 0]} enablePan={false} minDistance={0.7} maxDistance={2.6} />
        </Canvas>
        <p className="muted bodybuild-tip">{t('puzzle.bodyDrag')}</p>
      </div>

      <div className="bodybuild-side">
        {!done && (
          <>
            <p className="bodybuild-ask">
              <strong>{t('puzzle.bodyWhich')}</strong>
            </p>
            <div className="bodybuild-choices">
              {choices.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`label-chip${placed.includes(o.id) ? ' used' : ''}${wrong === o.id ? ' shake' : ''}`}
                  disabled={placed.includes(o.id)}
                  onClick={() => pick(o.id)}
                >
                  {tx(o.label, lang)}
                </button>
              ))}
            </div>
            {saidOrgan && (
              <p className="flower-news">
                {t('puzzle.bodyNotThere', { organ: tx(saidOrgan.label, lang) })} {tx(saidOrgan.job, lang)}
              </p>
            )}
          </>
        )}
        {last && !done && !saidOrgan && (
          <p className="flower-news">
            <strong>{tx(last.label, lang)}:</strong> {tx(last.job, lang)}
          </p>
        )}
        {done && (
          <p className="flower-news">
            <strong>{t('puzzle.bodyDone')}</strong> {t('puzzle.bodyDoneNote')}
          </p>
        )}
        <p className="muted art-credit">{t('puzzle.bodyCredit')}</p>
      </div>
    </div>
  );
}
