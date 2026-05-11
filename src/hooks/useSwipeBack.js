/**
 * useSwipeBack.js
 * Detects a right-swipe gesture on a DOM element and calls onSwipeBack.
 * Only activates when `enabled` is true (e.g. when drillCategory is active).
 *
 * Conditions to trigger:
 *  - Horizontal displacement >= minDx (default 70px)
 *  - Horizontal movement > vertical movement (avoids conflict with scroll)
 *  - Swipe direction is left-to-right
 */
import { useEffect, useRef } from 'react';

export function useSwipeBack(ref, onSwipeBack, enabled = true) {
  const touchStart = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const handleTouchStart = (e) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = Math.abs(t.clientY - touchStart.current.y);
      touchStart.current = null;

      // Right swipe: horizontal > 70px and more horizontal than vertical
      if (dx >= 70 && dx > dy * 1.5) {
        onSwipeBack?.();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend',   handleTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [enabled, onSwipeBack]);
}
