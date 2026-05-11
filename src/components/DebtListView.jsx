/**
 * DebtListView.jsx
 * Shows all shared expenses (paid + unpaid) as a debts tracker.
 * Pill is tappable to toggle paid status in real-time.
 */
import React, { useMemo } from 'react';
import './DebtListView.css';
import { resolveCategory }  from '../utils/categories';
import { formatAmount, applyFilters, applySearchTags } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

function DebtRow({ expense, onTogglePaid, onPress }) {
  const userCategories = useUserCategoriesCtx();
  const cat      = resolveCategory(expense.category, userCategories);
  const currency = getCurrencyByCode(expense.currency ?? 'MXN');
  const paid     = expense.sharedPaid ?? false;
  const owes     = expense.sharedOwes ?? 0;
  const debtor   = expense.sharedWith?.trim();

  return (
    <div className="debt-row">
      {/* Clickable area (icon + info) — opens edit sheet */}
      <button
        className="debt-row-body"
        onClick={() => onPress?.(expense)}
        id={`debt-open-${expense.id}`}
        aria-label={`Ver detalle de deuda con ${debtor}`}
      >
        <div className="debt-row-icon" style={{ background: expense.color || cat.color }}>
          {cat.emoji}
        </div>
        <div className="debt-row-info">
          <span className="debt-row-debtor">{debtor}</span>
          <span className="debt-row-desc">{expense.description || cat.label}</span>
          <span className="debt-row-amount">
            {formatAmount(owes)} {currency.code}
          </span>
        </div>
      </button>

      {/* Pill toggle — separate from row click */}
      <button
        className={`debt-pill${paid ? ' paid' : ''}`}
        onClick={() => onTogglePaid(expense.id, !paid)}
        id={`debt-pill-${expense.id}`}
        aria-pressed={paid}
        aria-label={paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
      >
        {paid ? 'Pagado' : 'Pendiente'}
      </button>
    </div>
  );
}

export default function DebtListView({ expenses, onTogglePaid, onPress, period = 'month', currencyFilter = 'all', locationFilter = 'Todos', searchTags = [] }) {
  const userCategories = useUserCategoriesCtx();
  /* All shared expenses with a debtor, filtered by period + currency + location + search */
  const debts = useMemo(() => {
    const shared = expenses.filter(e => e.type === 'compartido' && e.sharedWith?.trim());
    const filtered = applyFilters(shared, period, 'all', currencyFilter, locationFilter);
    return applySearchTags(filtered, searchTags, userCategories);
  }, [expenses, period, currencyFilter, locationFilter, searchTags, userCategories]);

  /* Separate pending vs paid */
  const pending = debts.filter(e => !e.sharedPaid);
  const paid    = debts.filter(e =>  e.sharedPaid);

  if (debts.length === 0) {
    return (
      <div className="debt-empty">
        <span className="debt-empty-icon">🤝</span>
        <p className="debt-empty-title">Sin deudas</p>
        <p className="debt-empty-sub">Los gastos compartidos aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="debt-list-wrap">

      {/* Pending */}
      {pending.length > 0 && (
        <section className="debt-section">
          <div className="debt-section-label">Pendientes · {pending.length}</div>
          {pending.map(e => (
            <DebtRow key={e.id} expense={e} onTogglePaid={onTogglePaid} onPress={onPress} />
          ))}
        </section>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <section className="debt-section">
          <div className="debt-section-label">Pagados · {paid.length}</div>
          {paid.map(e => (
            <DebtRow key={e.id} expense={e} onTogglePaid={onTogglePaid} onPress={onPress} />
          ))}
        </section>
      )}

      <div style={{ height: 110 }} />
    </div>
  );
}
