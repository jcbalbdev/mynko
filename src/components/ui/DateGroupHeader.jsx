/**
 * DateGroupHeader.jsx
 * Reusable date section header: [Hoy] ─ ─ ─ ─ [350 MXN]
 */
import React from 'react';
import { formatAmount } from '../../utils/formatters';
import { getCurrencyByCode } from '../../utils/currencies';

export default function DateGroupHeader({ label, total, currency, income, expense }) {
  const sym = currency ? ` ${getCurrencyByCode(currency).symbol}` : '';
  const showSplit = income !== undefined && expense !== undefined;

  return (
    <div className="exp-date-header">
      <span className="exp-date-label">{label}</span>
      <div className="exp-date-dash" aria-hidden="true" />
      {showSplit ? (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {income > 0 && (
            <span className="exp-date-total" style={{ background: 'rgba(52,168,83,0.18)', color: '#34A853' }}>
              +{formatAmount(income)}{sym}
            </span>
          )}
          {expense > 0 && (
            <span className="exp-date-total" style={{ background: 'rgba(234,67,53,0.18)', color: '#EA4335' }}>
              -{formatAmount(expense)}{sym}
            </span>
          )}
        </div>
      ) : (
        <span className="exp-date-total">
          {formatAmount(total)}{sym}
        </span>
      )}
    </div>
  );
}
