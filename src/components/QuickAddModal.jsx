/**
 * QuickAddModal.jsx
 * Positioned next to the pressed bar. No padding on card — items fill
 * edge-to-edge and overflow:hidden clips to the card's border-radius.
 */
import React from 'react';
import { resolveCategory } from '../utils/categories';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

const CARD_W = 210;
const ITEM_H = 50;

export default function QuickAddModal({ parentCategoryId, barRect, hoveredId, onClose }) {
  const userCategories = useUserCategoriesCtx();
  const parentCat  = resolveCategory(parentCategoryId, userCategories);
  const subcats    = userCategories.filter(uc => uc.parent_id === parentCategoryId);
  const hoverColor = parentCat.bg ?? parentCat.color ?? '#111214'; // category color for selection

  const options = [
    { id: parentCategoryId, label: parentCat.label, isParent: true },
    ...subcats.map(sc => ({ id: sc.id, label: sc.name, isParent: false })),
  ];

  const CARD_H = options.length * ITEM_H;

  // Position next to the bar
  let top  = (barRect.top + barRect.bottom) / 2 - CARD_H / 2;
  let left = barRect.right + 12;
  if (left + CARD_W > window.innerWidth - 12) left = barRect.left - CARD_W - 12;
  if (left < 12) left = 12;
  if (top + CARD_H > window.innerHeight - 20) top = window.innerHeight - CARD_H - 20;
  if (top < 20) top = 20;

  return (
    <>
      {/* overlay — tap outside closes (web fallback) */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.22)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'qamFadeIn .15s ease',
        }}
        onClick={onClose}
      />

      {/* Card — no padding, overflow:hidden clips highlight to rounded corners */}
      <div
        style={{
          position: 'fixed',
          top, left,
          width: CARD_W,
          zIndex: 401,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 16px 50px rgba(0,0,0,0.22), 0 3px 12px rgba(0,0,0,0.10)',
          overflow: 'hidden',
          animation: 'qamPopIn .22s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {options.map((opt, idx) => {
          const isHovered = hoveredId === opt.id;
          // Show divider only when neither this nor the previous item is hovered
          const showDivider = idx > 0
            && hoveredId !== opt.id
            && hoveredId !== options[idx - 1]?.id;

          return (
            <React.Fragment key={opt.id}>
              {showDivider && (
                <div style={{
                  height: '0.5px',
                  background: 'rgba(60,60,67,0.12)',
                  margin: '0 16px',
                }} />
              )}
              <div
                data-option-id={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: ITEM_H,
                  padding: '0 16px',
                  // Full-width black when hovered — no padding on card so this fills edge-to-edge
                  background: isHovered ? hoverColor : 'transparent',
                  transition: 'background 0.06s',
                }}
              >
                <span
                  data-option-id={opt.id}
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isHovered ? '#ffffff' : '#1c1c1e',
                    fontFamily: 'var(--font, Nunito, sans-serif)',
                    pointerEvents: 'none',
                    transition: 'color 0.06s',
                  }}
                >
                  {opt.label}
                </span>
                {opt.isParent && (
                  <span
                    data-option-id={opt.id}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isHovered ? 'rgba(255,255,255,0.55)' : '#8e8e93',
                      background: isHovered ? 'rgba(255,255,255,0.14)' : 'rgba(142,142,147,0.14)',
                      borderRadius: 999,
                      padding: '2px 10px',
                      pointerEvents: 'none',
                      transition: 'color 0.06s, background 0.06s',
                    }}
                  >
                    General
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes qamFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes qamPopIn {
          from { opacity:0; transform:scale(0.78) }
          to   { opacity:1; transform:scale(1) }
        }
      `}</style>
    </>
  );
}
