/**
 * DateField.jsx
 * Reusable date button + CalendarModal combo.
 * Used in AddExpenseSheet, AddIncomeSheet, AddExchangeSheet.
 */
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import CalendarModal from './CalendarModal';
import { expenseDateLabel } from '../../utils/expenses';

/**
 * @param {Date}     value    - Currently selected date
 * @param {function} onChange - (date: Date) => void
 * @param {string}   [id]     - Button id for accessibility
 */
export default function DateField({ value, onChange, id = 'btn-open-calendar' }) {
  const [showCal, setShowCal] = useState(false);
  const dateLabel = expenseDateLabel(value);

  return (
    <>
      <button
        type="button"
        className="date-field-btn"
        onClick={() => setShowCal(true)}
        id={id}
      >
        <Calendar size={17} className="date-field-icon" />
        <span className="date-field-label" style={{ textTransform: 'capitalize' }}>
          {dateLabel}
        </span>
        <span className="date-field-chevron">▼</span>
      </button>

      {showCal && (
        <CalendarModal
          value={value}
          onChange={(d) => { onChange(d); setShowCal(false); }}
          onClose={() => setShowCal(false)}
        />
      )}
    </>
  );
}
