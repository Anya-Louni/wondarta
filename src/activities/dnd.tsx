import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Pointer-events drag & drop that works with mouse AND touch (HTML5 DnD
 * doesn't work on touch screens), plus tap-to-pick / tap-to-place as an
 * accessible alternative for small hands.
 */
export function useDnd<T>(onDrop: (payload: T, dropId: string) => void) {
  const [picked, setPicked] = useState<T | null>(null);
  const [ghost, setGhost] = useState<{ node: ReactNode; x: number; y: number } | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const dropAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null;

  const bindDrag = useCallback(
    (payload: T, node: ReactNode) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        const sx = e.clientX;
        const sy = e.clientY;
        let dragging = false;
        const move = (ev: PointerEvent) => {
          if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) dragging = true;
          if (dragging) {
            setGhost({ node, x: ev.clientX, y: ev.clientY });
            setHot(dropAt(ev.clientX, ev.clientY));
          }
        };
        const up = (ev: PointerEvent) => {
          cleanup.current?.();
          setGhost(null);
          setHot(null);
          if (dragging) {
            const id = dropAt(ev.clientX, ev.clientY);
            if (id) onDrop(payload, id);
            setPicked(null);
          } else setPicked((p) => (p === payload ? null : payload));
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        cleanup.current = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          cleanup.current = null;
        };
      },
    }),
    [onDrop],
  );

  const bindDrop = useCallback(
    (id: string) => ({
      'data-drop': id,
      onClick: () => {
        if (picked !== null) {
          onDrop(picked, id);
          setPicked(null);
        }
      },
    }),
    [picked, onDrop],
  );

  const ghostEl = ghost
    ? createPortal(
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
          {ghost.node}
        </div>,
        document.body,
      )
    : null;

  return { bindDrag, bindDrop, picked, hot, ghostEl, clearPick: () => setPicked(null) };
}
