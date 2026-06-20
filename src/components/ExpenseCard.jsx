import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { resolveCategory, formatTime } from '../utils/categories';
import { formatAmountWithSymbol } from '../utils/currencies';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';
import { useSwipeToDelete } from '../hooks/useSwipeToDelete';

export default function ExpenseCard({ expense, onDelete, animate }) {
  const userCategories = useUserCategoriesCtx();
  const cat = resolveCategory(expense.category, userCategories);
  const [swiped, setSwiped] = useState(false);
  const { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd } = useSwipeToDelete({
    onSwipe:   () => setSwiped(true),
    onRestore: () => setSwiped(false),
  });

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
          <div className="expense-amount">{formatAmountWithSymbol(expense.amount, expense.currency ?? 'MXN')}</div>
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
