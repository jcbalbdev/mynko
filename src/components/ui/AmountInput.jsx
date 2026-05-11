/**
 * AmountInput.jsx
 * The large centered amount field used in Add*Sheet forms.
 * Shows a numeric input with the currency code as suffix.
 */
import React from 'react';

/**
 * @param {string}   value      - Current string value
 * @param {function} onChange   - (newValue: string) => void
 * @param {string}   currency   - Currency code shown as suffix (e.g. 'USD')
 * @param {string}   [id]       - Input id for accessibility
 * @param {object}   [ref]      - Forwarded ref
 * @param {boolean}  [autoFocus]
 */
const AmountInput = React.forwardRef(function AmountInput(
  { value, onChange, currency, id = 'amount-input', autoFocus = false },
  ref
) {
  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2 || parts[1]?.length > 2) return;
    onChange(val);
  };

  return (
    <div className="amount-input-wrap">
      <input
        ref={ref}
        id={id}
        className="amount-input"
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={handleChange}
        min="0"
        step="0.01"
        autoFocus={autoFocus}
        aria-label="Monto"
      />
      <span className="amount-suffix">{currency}</span>
    </div>
  );
});

export default AmountInput;
