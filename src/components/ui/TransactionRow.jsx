/**
 * TransactionRow.jsx
 * Card-style transaction row — card background = category color.
 *
 * Layout:
 *  - Card bg  → cat.bg (solid category color)
 *  - Cat pill → white bg, black text
 *  - Title    → white
 *  - Time     → white 65%
 *  - Amount pill → white bg, #EA4335 text (expenses) / #34A853 text (income)
 */
import React from 'react';
import './TransactionRow.css';
import { resolveCategory } from '../../utils/categories';
import { getCurrencyByCode } from '../../utils/currencies';
import { formatAmount } from '../../utils/expenses';
import { useUserCategoriesCtx } from '../../context/UserCategoriesContext';

export default function TransactionRow({ record, onPress, readonly = false }) {
  const userCategories = useUserCategoriesCtx();
  const cat = resolveCategory(record.category, userCategories);

  const isOutflow = record._isOutflow === true;
  const isCambio = record.type === 'cambio';
  const isPaidDebt = record.type === 'compartido' && record.sharedPaid === true;
  const isIncome = record.type === 'ingreso' || (isCambio && !isOutflow) || isPaidDebt;

  const currency = getCurrencyByCode(
    isOutflow ? (record.fromCurrency ?? record.currency ?? 'MXN')
      : (record.currency ?? 'MXN')
  );

  const rawAmount = isOutflow ? (record.fromAmount ?? 0) : record.amount;

  const effectiveAmount = isPaidDebt
    ? (record.sharedOwes ?? rawAmount)
    : (!isIncome && !isOutflow && record.sharedPaid && (record.sharedOwes ?? 0) > 0)
      ? rawAmount - record.sharedOwes
      : rawAmount;

  const time = new Date(record.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const isShared = record.type === 'compartido';
  const debtor = record.sharedWith?.trim();
  const owes = record.sharedOwes ?? 0;
  const paid = record.sharedPaid ?? false;

  const amountPrefix = isIncome ? '+' : '-';
  const amountTextColor = isIncome ? '#34A853' : '#EA4335';

  // Card background: use category color; fall back to neutral for exchange
  const cardBg = isCambio ? '#5C6BC0' : (cat.bg ?? cat.color ?? '#8e8e93');

  return (
    <button
      className="exp-row"
      onClick={() => !readonly && onPress?.(record)}
      style={{
        cursor: readonly ? 'default' : 'pointer',
        background: cardBg,
        boxShadow: 'none',
        border: 'none',
      }}
      id={`txn-row-${record.id}${isOutflow ? '-out' : ''}`}
      aria-label={`${record.description || cat.label} — ${formatAmount(effectiveAmount)} ${currency.code}`}
    >
      {/* Left: category pill + description + time */}
      <div className="exp-row-info">

        {/* Category pill — white bg, black text */}
        <span
          className="exp-row-cat"
          style={{
            background: 'rgba(255,255,255,0.95)',
            color: '#111214',
            fontWeight: 700,
          }}
        >
          {cat.label}
        </span>

        {/* Description */}
        <span
          className="exp-row-desc"
          style={{ color: '#ffffff' }}
        >
          {record.description || cat.label}
        </span>

        {/* Time + shared pill */}
        <div className="exp-row-meta">
          <span
            className="exp-row-time"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            {time}
          </span>
          {isShared && debtor && (
            <span
              className={`exp-row-debt-pill${paid ? ' paid' : ''}`}
              style={{
                background: 'rgba(255,255,255,0.20)',
                color: '#fff',
                border: 'none',
              }}
            >
              {debtor}{owes > 0 ? ` · ${formatAmount(owes)} ${currency.code}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Amount pill — white bg, colored text */}
      <div
        className="exp-row-amount"
        style={{
          background: 'rgba(255,255,255,0.95)',
          color: amountTextColor,
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 13,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {amountPrefix}{formatAmount(effectiveAmount)} {currency.code}
      </div>
    </button>
  );
}
