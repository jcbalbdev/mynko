import React, { useMemo, useRef, useCallback } from 'react';
import './BarChart.css';
import { resolveCategory } from '../utils/categories';
import { getCurrencyByCode } from '../utils/currencies';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';
import { useTheme } from '../context/ThemeContext';

const MAX_BAR_HEIGHT = 180;
const LONG_PRESS_MS  = 460;
const GHOST_BARS = [{ height: 180 }, { height: 110 }, { height: 65 }];

export default function BarChart({
  expenses,
  budgets = [],
  onBarPress,
  onBarLongPress,    // (catId, rect) — long press fired
  onHoverOption,     // (optId | null) — finger hovering over option
  onLongPressRelease,// (optId | null) — finger lifted
  emptyLabel = 'registros',
}) {
  const { theme } = useTheme();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const userCategories = useUserCategoriesCtx();
  const sorted = useMemo(
    () => [...expenses].filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount),
    [expenses]
  );

  // maxAmount includes budget amounts so scale is consistent
  const maxAmount = useMemo(() => {
    let max = sorted[0]?.amount || 1;
    for (const exp of sorted) {
      const b = budgets.find(b => b.categoryId === exp.category && b.currency === exp.currency);
      if (b?.amount > max) max = b.amount;
    }
    return max;
  }, [sorted, budgets]);

  const timerRef        = useRef(null);
  const didLongRef      = useRef(false);
  const hoveredIdRef    = useRef(null);
  const startXRef       = useRef(0);
  const startYRef       = useRef(0);
  const docHandlersRef  = useRef(null);

  const detach = useCallback(() => {
    if (!docHandlersRef.current) return;
    const { move, end } = docHandlersRef.current;
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend',  end);
    document.removeEventListener('touchcancel', end);
    docHandlersRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const handleTouchStart = useCallback((categoryId, e) => {
    didLongRef.current  = false;
    hoveredIdRef.current = null;
    startXRef.current   = e.touches[0]?.clientX ?? 0;
    startYRef.current   = e.touches[0]?.clientY ?? 0;
    const barEl = e.currentTarget;

    timerRef.current = setTimeout(() => {
      didLongRef.current = true;
      const rect = barEl.getBoundingClientRect();
      onBarLongPress?.(categoryId, rect);
      if (navigator.vibrate) navigator.vibrate(40);

      const move = (mv) => {
        const t = mv.touches[0];
        if (!t) return;
        mv.preventDefault();
        const el    = document.elementFromPoint(t.clientX, t.clientY);
        const optEl = el?.closest('[data-option-id]');
        const optId = optEl?.dataset?.optionId ?? null;
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
  }, [onBarLongPress, onHoverOption, onLongPressRelease, detach]);

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
    onBarPress?.(categoryId);
  }, [onBarPress]);

  if (sorted.length === 0) {
    return (
      <div className="barchart-empty">
        <div className="barchart-inner">
          {GHOST_BARS.map((g, i) => (
            <div key={i} className="bar-col bar-col--ghost">
              <div className="bar-top-amount bar-top-amount--ghost">— —</div>
              <div className="bar-group">
                <div className="bar-fill bar-fill--ghost" style={{ height: g.height }} />
                <div className="bar-cat-pill bar-cat-pill--ghost">Categoría</div>
              </div>
            </div>
          ))}
        </div>
        <p className="barchart-empty-text">
          Aún no hay {emptyLabel} registrados.<br />Toca <strong>+</strong> para agregar el primero.
        </p>
      </div>
    );
  }

  return (
    <div className="barchart-scroll-wrap">
      <div className="barchart-inner">
        {sorted.map((exp, i) => {
          // Use pre-resolved label/bg from groupByCategory/groupBySubcategory,
          // fallback to resolveCategory only as a safety net
          const cat       = (exp.label && exp.bg)
            ? { label: exp.label, bg: exp.bg }
            : resolveCategory(exp.category, userCategories);
          const isOutflow = exp._isOutflowBar;
          const curSymbol = getCurrencyByCode(exp.currency ?? 'MXN').symbol;
          const budget    = budgets.find(b => b.categoryId === exp.category && b.currency === exp.currency);

          if (budget) {
            const trackHeight = Math.max(4, (budget.amount / maxAmount) * MAX_BAR_HEIGHT);
            const fillPct     = budget.amount > 0 ? Math.min(exp.amount / budget.amount, 1) : 0;
            const fillHeight  = fillPct * trackHeight;
            const isOver      = exp.amount > budget.amount;
            const fillColor   = isOver ? '#E91933' : '#111214';
            const budgetLabel = budget.amount % 1 === 0
              ? `${budget.amount.toLocaleString('es-MX')} ${curSymbol}`
              : `${budget.amount.toFixed(2)} ${curSymbol}`;
            const spentLabel  = exp.amount % 1 === 0
              ? `${exp.amount.toLocaleString('es-MX')} ${curSymbol}`
              : `${exp.amount.toFixed(2)} ${curSymbol}`;
            return (
              <button
                key={`${exp.id}-${exp.amount}`}
                className="bar-col"
                onClick={() => handleClick(exp.category)}
                onTouchStart={(e) => handleTouchStart(exp.category, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                aria-label={`${cat.label}: ${spentLabel} de ${budgetLabel}`}
                id={`bar-${exp.id}`}
              >
                <div className="bar-top-amount">{budgetLabel}</div>
                <div className="bar-group">
                  <div
                    className="bar-fill bar-fill--budget-track"
                    style={{ height: trackHeight, animationDelay: `${i * 60}ms` }}
                  >
                    <div
                      className="bar-fill--budget-inner"
                      style={{ height: fillHeight, background: fillColor }}
                    >
                      {fillHeight >= 18 && (
                        <div className="bar-fill--budget-spent-label">
                          {spentLabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bar-cat-pill" style={{ background: fillColor, color: '#fff', fontWeight: 700 }}>
                    {cat.label}
                  </div>
                </div>
              </button>
            );
          }

          const height      = Math.max(4, (exp.amount / maxAmount) * MAX_BAR_HEIGHT);
          const barColor    = isDark ? '#333335' : '#EEEEEE';
          const amountLabel = (isOutflow ? '-' : '') + (exp.amount % 1 === 0
            ? `${exp.amount.toLocaleString('es-MX')} ${curSymbol}`
            : `${exp.amount.toFixed(2)} ${curSymbol}`);

          return (
            <button
              key={`${exp.id}-${exp.amount}`}
              className="bar-col"
              onClick={() => handleClick(exp.category)}
              onTouchStart={(e) => handleTouchStart(exp.category, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              aria-label={`${cat.label}: ${amountLabel}`}
              id={`bar-${exp.id}`}
            >
              <div className="bar-top-amount">{amountLabel}</div>
              <div className="bar-group">
                <div className="bar-fill" style={{ height, background: barColor, animationDelay: `${i * 60}ms` }} />
                <div className="bar-cat-pill" style={{ background: barColor, color: isDark ? '#fff' : '#000', fontWeight: 700 }}>
                  {cat.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
