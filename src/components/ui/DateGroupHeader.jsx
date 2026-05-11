/**
 * DateGroupHeader.jsx
 * Reusable date section header: [Hoy] ─ ─ ─ ─ [350 MXN]
 */
import React from 'react';
import { formatAmount } from '../../utils/expenses';

export default function DateGroupHeader({ label, total, currency }) {
  return (
    <div className="exp-date-header">
      <span className="exp-date-label">{label}</span>
      <div className="exp-date-dash" aria-hidden="true" />
      <span className="exp-date-total">
        {formatAmount(total)}{currency ? ` ${currency}` : ''}
      </span>
    </div>
  );
}
