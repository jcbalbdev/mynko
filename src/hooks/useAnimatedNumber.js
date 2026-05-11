/**
 * useAnimatedNumber.js
 * Animates a numeric value from its previous state to a new target.
 * Uses ease-out cubic — fast start, smooth deceleration at the end (iOS feel).
 */
import { useState, useEffect, useRef } from 'react';

/** Ease-out cubic: 1 - (1-t)^3 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * @param {number} target   - The number to animate toward
 * @param {number} duration - Animation duration in ms (default 550)
 * @returns {number}        - Current animated value (float during transition)
 */
export function useAnimatedNumber(target, duration = 550) {
  const [displayed, setDisplayed] = useState(target);
  const fromRef  = useRef(target);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to   = target;

    if (from === to) return;

    // Cancel any in-progress animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;

      const elapsed  = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);
      const current  = from + (to - from) * eased;

      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to exact target at end
        setDisplayed(to);
        fromRef.current = to;
        rafRef.current  = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}
