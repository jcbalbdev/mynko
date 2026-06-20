/**
 * useSwipeToDelete.js
 * Detects a left-swipe gesture and calls onSwipe() when the threshold is exceeded.
 * Replaces the duplicated touchStart/touchEnd handlers in ExpenseCard and QuickAccessCard.
 *
 * Usage:
 *   const { onTouchStart, onTouchEnd } = useSwipeToDelete({ onSwipe: () => setSwiped(true) });
 */
import { useRef } from 'react';

export function useSwipeToDelete({ onSwipe, onRestore, threshold = 50, restoreThreshold = 20 }) {
  const startXRef = useRef(null);

  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (startXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    startXRef.current = null;
    if (dx < -threshold)        onSwipe?.();
    if (dx > restoreThreshold)  onRestore?.();
  };

  return { onTouchStart, onTouchEnd };
}
