/**
 * SharedDetails.jsx
 * Fields for shared expense: who + how much they owe.
 * Extracted from AddExpenseSheet for reusability.
 */
import React from 'react';
import { Users, User, ArrowRightLeft } from 'lucide-react';

export default function SharedDetails({
  amount,
  sharedWith,
  onSharedWithChange,
  sharedOwes,
  onSharedOwesChange,
  onSplitHalf,
  currency,
}) {
  return (
    <div className="shared-details-card">
      <div className="shared-details-title">
        <Users size={15} strokeWidth={2.5} />
        Detalles del gasto compartido
      </div>

      <div className="shared-field-group">
        {/* With whom */}
        <div className="shared-field-row">
          <span className="shared-field-icon"><User size={16} strokeWidth={2} /></span>
          <div className="shared-field-inner">
            <label className="shared-field-label" htmlFor="shared-with">¿Con quién?</label>
            <input
              id="shared-with"
              className="shared-field-input"
              type="text"
              placeholder="Nombre de la persona"
              value={sharedWith}
              onChange={e => onSharedWithChange(e.target.value)}
              maxLength={40}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="shared-field-divider" />

        {/* How much they owe */}
        <div className="shared-field-row">
          <span className="shared-field-icon"><ArrowRightLeft size={16} strokeWidth={2} /></span>
          <div className="shared-field-inner">
            <label className="shared-field-label" htmlFor="shared-owes">¿Cuánto te debe?</label>
            <div className="shared-amount-wrap">
              <input
                id="shared-owes"
                className="shared-field-input shared-amount-input"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={sharedOwes}
                onChange={e => onSharedOwesChange(e.target.value)}
                min="0"
                step="0.01"
              />
              <span className="shared-amount-suffix">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ÷2 quick split */}
      {parseFloat(amount) > 0 && (
        <button
          type="button"
          className="shared-split-btn"
          onClick={onSplitHalf}
          id="btn-split-half"
        >
          ÷2 — Dividir en partes iguales ({(parseFloat(amount) / 2).toFixed(2)} {currency})
        </button>
      )}
    </div>
  );
}
