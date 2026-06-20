import React from 'react';
import './TransactionRow.css';
import { resolveCategory } from '../../utils/categories';
import { getCurrencyByCode } from '../../utils/currencies';
import { formatAmount } from '../../utils/formatters';
import { useUserCategoriesCtx } from '../../context/UserCategoriesContext';
import { useTheme } from '../../context/ThemeContext';

export default function TransactionRow({ record, onPress, readonly = false }) {
  const { theme } = useTheme();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
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
  const amountTextColor = isDark ? '#fff' : '#111214';

  // Category pill color
  const catColor = isCambio ? '#10B981' : (cat.bg ?? cat.color ?? '#8e8e93');

  return (
    <button
      className="exp-row"
      onClick={() => !readonly && onPress?.(record)}
      style={{ cursor: readonly ? 'default' : 'pointer' }}
      id={`txn-row-${record.id}${isOutflow ? '-out' : ''}`}
      aria-label={`${record.description || cat.label} — ${formatAmount(effectiveAmount)} ${currency.symbol}`}
    >
      {/* Left: category pill + description + time */}
      <div className="exp-row-info">

        {/* Category pill — category color bg, black text */}
        <span
          className="exp-row-cat"
          style={{ background: catColor, color: '#ffffff' }}
        >
          {cat.label}
        </span>

        {/* Description */}
        <span className="exp-row-desc">
          {record.description || cat.label}
        </span>

        {/* Time + shared pill */}
        <div className="exp-row-meta">
          <span className="exp-row-time">{time}</span>
          {isShared && debtor && (
            <span className={`exp-row-debt-pill${paid ? ' paid' : ''}`}>
              {debtor}{owes > 0 ? ` · ${formatAmount(owes)} ${currency.symbol}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Amount pill — gray bg, Mynko colored text */}
      <div
        className="exp-row-amount"
        style={{ color: amountTextColor }}
      >
        {amountPrefix}{formatAmount(effectiveAmount)} {currency.symbol}
      </div>
    </button>
  );
}
