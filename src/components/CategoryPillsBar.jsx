import React, { useRef, useCallback, useMemo } from 'react';
import './CategoryPillsBar.css';

const LONG_PRESS_MS = 460;

export default function CategoryPillsBar({
  items = [],
  onPress,
  onLongPress,
  onHoverOption,
  onLongPressRelease,
}) {
  const timerRef       = useRef(null);
  const didLongRef     = useRef(false);
  const hoveredIdRef   = useRef(null);
  const startXRef      = useRef(0);
  const startYRef      = useRef(0);
  const docHandlersRef = useRef(null);

  const sorted = useMemo(
    () => [...items].filter(i => i.amount > 0).sort((a, b) => b.amount - a.amount),
    [items]
  );

  const detach = useCallback(() => {
    if (!docHandlersRef.current) return;
    const { move, end } = docHandlersRef.current;
    document.removeEventListener('touchmove',   move);
    document.removeEventListener('touchend',    end);
    document.removeEventListener('touchcancel', end);
    docHandlersRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const handleTouchStart = useCallback((categoryId, e) => {
    didLongRef.current   = false;
    hoveredIdRef.current = null;
    startXRef.current    = e.touches[0]?.clientX ?? 0;
    startYRef.current    = e.touches[0]?.clientY ?? 0;
    const el = e.currentTarget;

    timerRef.current = setTimeout(() => {
      didLongRef.current = true;
      const rect = el.getBoundingClientRect();
      onLongPress?.(categoryId, rect);
      if (navigator.vibrate) navigator.vibrate(40);

      const move = (mv) => {
        const t = mv.touches[0];
        if (!t) return;
        mv.preventDefault();
        const target = document.elementFromPoint(t.clientX, t.clientY);
        const optEl  = target?.closest('[data-option-id]');
        const optId  = optEl?.dataset?.optionId ?? null;
        if (optId !== hoveredIdRef.current) {
          hoveredIdRef.current = optId;
          onHoverOption?.(optId);
          if (optId && navigator.vibrate) navigator.vibrate(8);
        }
      };

      const end = () => {
        detach();
        onLongPressRelease?.(hoveredIdRef.current);
        hoveredIdRef.current = null;
      };

      docHandlersRef.current = { move, end };
      document.addEventListener('touchmove',   move, { passive: false });
      document.addEventListener('touchend',    end);
      document.addEventListener('touchcancel', end);
    }, LONG_PRESS_MS);
  }, [onLongPress, onHoverOption, onLongPressRelease, detach]);

  const handleTouchMove = useCallback((e) => {
    if (didLongRef.current) return;
    const dx = Math.abs((e.touches[0]?.clientX ?? 0) - startXRef.current);
    const dy = Math.abs((e.touches[0]?.clientY ?? 0) - startYRef.current);
    if (dx > 8 || dy > 8) clearTimer();
  }, [clearTimer]);

  const handleTouchEnd = useCallback(() => {
    if (!didLongRef.current) clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback((categoryId) => {
    if (didLongRef.current) return;
    onPress?.(categoryId);
  }, [onPress]);

  if (sorted.length === 0) return null;

  return (
    <div className="cat-pills-bar">
      {sorted.map((item) => (
        <button
          key={item.category}
          className="cat-pill"
          style={{ background: item.bg }}
          onClick={() => handleClick(item.category)}
          onTouchStart={(e) => handleTouchStart(item.category, e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          aria-label={item.label}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
