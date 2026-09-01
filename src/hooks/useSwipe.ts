import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface SwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Distance in px before a drag counts as a swipe. */
  threshold?: number;
  /** How far the content may follow the finger, in px. */
  maxDrag?: number;
  disabled?: boolean;
}

interface SwipeBindings {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerCancel: (event: ReactPointerEvent) => void;
  onClickCapture: (event: React.MouseEvent) => void;
}

/**
 * Horizontal drag-to-navigate, for touch and mouse alike.
 *
 * Vertical intent wins: until the gesture is clearly sideways we leave it
 * alone, so the page still scrolls normally under a thumb. A drag that ends up
 * being a swipe swallows the click that follows it, otherwise letting go over a
 * calendar day would also select that day.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 56,
  maxDrag = 72,
  disabled = false,
}: SwipeOptions): { bindings: SwipeBindings; offset: number; dragging: boolean } {
  const start = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);
  const swiped = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    start.current = null;
    horizontal.current = false;
    setOffset(0);
    setDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (disabled || event.button !== 0) return;
      start.current = { x: event.clientX, y: event.clientY };
      horizontal.current = false;
      swiped.current = false;
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const origin = start.current;
      if (!origin) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;

      if (!horizontal.current) {
        // Decide the axis once, and only once there is enough movement to tell.
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (Math.abs(dx) <= Math.abs(dy)) {
          start.current = null;
          return;
        }
        horizontal.current = true;
        setDragging(true);
        // Keeps events coming if the finger leaves the element. It throws when
        // the pointer is already gone, and capture is only an optimisation, so
        // losing it must not take the gesture down with it.
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          // Pointer already released; the gesture still completes on pointerup.
        }
      }

      // Rubber-band: the content follows, but never the full distance.
      const damped = Math.sign(dx) * Math.min(maxDrag, Math.abs(dx) * 0.4);
      setOffset(damped);
    },
    [maxDrag],
  );

  const finish = useCallback(
    (event: ReactPointerEvent) => {
      const origin = start.current;
      if (!origin || !horizontal.current) {
        reset();
        return;
      }
      const dx = event.clientX - origin.x;
      if (Math.abs(dx) >= threshold) {
        swiped.current = true;
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
      reset();
    },
    [threshold, onSwipeLeft, onSwipeRight, reset],
  );

  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (!swiped.current) return;
    // The pointer travelled: this click is the tail of a swipe, not a tap.
    event.preventDefault();
    event.stopPropagation();
    swiped.current = false;
  }, []);

  return {
    bindings: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: () => reset(),
      onClickCapture,
    },
    offset,
    dragging,
  };
}
