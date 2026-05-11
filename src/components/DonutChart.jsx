import React from 'react';
import { CATEGORIES, DONUT_COLORS, resolveCategory } from '../utils/categories';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

function polarToCartesian(cx, cy, r, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end   = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function DonutChart({ expenses }) {
  const userCategories = useUserCategoriesCtx();
  const SIZE = 120;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 50;
  const R_INNER = 32;
  const STROKE = R_OUTER - R_INNER;

  // Aggregate by category
  const totals = {};
  expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });

  const total = Object.values(totals).reduce((s, v) => s + v, 0);

  if (total === 0 || expenses.length === 0) {
    return (
      <div className="donut-container animate-in">
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--label-tertiary)', fontSize: 14, fontWeight: 600 }}>
          Sin gastos este mes
        </div>
      </div>
    );
  }

  // Sort by amount desc, take top 5
  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let currentAngle = 0;
  const segments = sorted.map(([catId, amount], i) => {
    const cat = resolveCategory(catId, userCategories);
    const fraction = amount / total;
    const angleDeg = fraction * 360;
    const seg = { catId, amount, fraction, angleDeg, color: cat.color, label: cat.label, startAngle: currentAngle };
    currentAngle += angleDeg;
    return seg;
  });

  const legendItems = sorted.slice(0, 4).map(([catId, amount]) => ({
    cat: resolveCategory(catId, userCategories),
    pct: Math.round((amount / total) * 100),
  }));

  return (
    <div className="donut-container animate-in">
      <div className="donut-inner">
        <div className="donut-svg-wrap">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Background ring */}
            <circle
              cx={CX} cy={CY} r={R_OUTER - STROKE / 2}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={STROKE}
            />
            {segments.map((seg, i) => {
              const gap = seg.angleDeg > 4 ? 2 : 0;
              const start = seg.startAngle + gap / 2;
              const end   = seg.startAngle + seg.angleDeg - gap / 2;
              if (end <= start) return null;
              return (
                <path
                  key={seg.catId}
                  d={describeArc(CX, CY, R_OUTER - STROKE / 2, start, end)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 2px 4px ${seg.color}44)` }}
                />
              );
            })}
          </svg>
          <div className="donut-center-label">
            <span className="donut-center-count">{expenses.length}</span>
            <span className="donut-center-text">gastos</span>
          </div>
        </div>

        <div className="donut-legend">
          {legendItems.map(({ cat, pct }) => (
            <div key={cat.id} className="legend-item">
              <div className="legend-dot" style={{ background: cat.color }} />
              <span className="legend-name">{cat.label}</span>
              <span className="legend-pct">{pct}%</span>
            </div>
          ))}
          {sorted.length > 4 && (
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--label-quaternary)' }} />
              <span className="legend-name">Otros</span>
              <span className="legend-pct">
                {100 - legendItems.reduce((s, x) => s + x.pct, 0)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
