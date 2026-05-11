/**
 * ColorPicker.jsx
 * Horizontal scroll row of color dots.
 * Used in AddExpenseSheet, ExpenseEditSheet and CategoryEditSheet.
 */
import React from 'react';
import { EXPENSE_COLORS } from '../../utils/categories';

/**
 * @param {string}   selected  — Currently selected hex color
 * @param {function} onChange  — Called with the new hex string
 */
export default function ColorPicker({ selected, onChange }) {
  return (
    <div className="color-scroll-row" role="group" aria-label="Color de la barra">
      {EXPENSE_COLORS.map(c => (
        <button
          key={c.id}
          type="button"
          className={`color-dot${selected === c.hex ? ' selected' : ''}`}
          style={{ background: c.hex, flexShrink: 0 }}
          onClick={() => onChange(c.hex)}
          aria-label={`Color ${c.id}`}
          aria-pressed={selected === c.hex}
          id={`color-${c.id}`}
        />
      ))}
    </div>
  );
}
