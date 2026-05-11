import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { resolveCategory, formatCurrency, formatTime } from '../utils/categories';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

export default function ExpenseCard({ expense, onDelete, animate }) {
  const userCategories = useUserCategoriesCtx();
  const cat = resolveCategory(expense.category, userCategories);
  const [swiped, setSwiped] = useState(false);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) setSwiped(true);
    if (dx > 20) setSwiped(false);
    touchStartX.current = null;
  };

  return (
    <div className="expense-item-wrap">
      <div
        className={`expense-item${animate ? ' animate-in' : ''}`}
        style={{ transform: swiped ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 0.28s cubic-bezier(0.34,1.2,0.64,1)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="expense-icon"
          style={{ background: cat.bg }}
          aria-label={cat.label}
        >
          {cat.emoji}
        </div>
        <div className="expense-info">
          <div className="expense-desc">{expense.description || cat.label}</div>
          <div className="expense-cat">{cat.label} · {formatTime(expense.date)}</div>
        </div>
        <div className="expense-right">
          <div className="expense-amount">{formatCurrency(expense.amount)}</div>
        </div>
      </div>

      {/* Swipe delete area */}
      <div
        className="expense-delete-bg"
        onClick={() => { setSwiped(false); onDelete(expense.id); }}
        style={{ opacity: swiped ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: swiped ? 'all' : 'none' }}
        role="button"
        aria-label="Eliminar gasto"
      >
        <Trash2 size={20} color="#fff" />
      </div>
    </div>
  );
}
