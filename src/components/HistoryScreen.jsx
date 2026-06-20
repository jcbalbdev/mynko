/**
 * HistoryScreen.jsx
 * Monthly expense history with navigation and category filter.
 */
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import './HistoryScreen.css';
import ExpenseListItem from './ExpenseListItem';
import DateGroupHeader from './ui/DateGroupHeader';
import { CATEGORIES, getMonthName } from '../utils/categories';
import { groupExpensesByDate, sumExpenses, formatAmount } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';

export default function HistoryScreen({ expenses, getMonthExpenses, getMonthTotal, onDelete }) {
  const now = new Date();
  const [year,      setYear]      = useState(now.getFullYear());
  const [month,     setMonth]     = useState(now.getMonth());
  const [catFilter, setCatFilter] = useState('all');

  const monthExpenses = useMemo(() => getMonthExpenses(year, month), [year, month, expenses]);

  const filtered = useMemo(() => {
    if (catFilter === 'all') return monthExpenses;
    return monthExpenses.filter(e => e.category === catFilter);
  }, [monthExpenses, catFilter]);

  const filteredTotal = useMemo(() => sumExpenses(filtered), [filtered]);

  const grouped   = useMemo(() => groupExpensesByDate(filtered), [filtered]);
  const groupKeys = Object.keys(grouped);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setCatFilter('all');
  };

  const nextMonth = () => {
    const n = new Date();
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth())) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setCatFilter('all');
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  /* Detect primary currency for the month (most common) */
  const primaryCurrency = useMemo(() => {
    if (filtered.length === 0) return 'MXN';
    const freq = {};
    filtered.forEach(e => { const c = e.currency ?? 'MXN'; freq[c] = (freq[c] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }, [filtered]);

  return (
    <div className="history-screen">
      <div className="nav-bar">
        <h1>Historial</h1>
        <div className="nav-subtitle">Todos tus gastos</div>
      </div>

      {/* Month navigator */}
      <div className="month-strip">
        <button className="month-nav-btn" onClick={prevMonth} aria-label="Mes anterior" id="btn-prev-month">
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span className="month-label" style={{ textTransform: 'capitalize' }}>
          {getMonthName(month, year)}
        </span>
        <button
          className="month-nav-btn"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Mes siguiente"
          id="btn-next-month"
          style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Total bar */}
      {filtered.length > 0 && (
        <div className="total-bar animate-in">
          <span className="total-label">{filtered.length} gasto{filtered.length !== 1 ? 's' : ''}</span>
          <span className="total-value">{formatAmount(filteredTotal)} {getCurrencyByCode(primaryCurrency).symbol}</span>
        </div>
      )}

      {/* Category filter chips */}
      <div className="chips-scroll" role="group" aria-label="Filtrar por categoría">
        <button className={`chip${catFilter === 'all' ? ' active' : ''}`} onClick={() => setCatFilter('all')} id="chip-all">
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`chip${catFilter === cat.id ? ' active' : ''}`}
            onClick={() => setCatFilter(cat.id)}
            id={`chip-${cat.id}`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <div className="history-content">
        {groupKeys.length === 0 ? (
          <div className="empty-state animate-in">
            <Inbox size={40} strokeWidth={1.5} className="empty-icon-svg" />
            <div className="empty-title">Sin gastos</div>
            <div className="empty-subtitle">
              {catFilter !== 'all'
                ? 'No hay gastos en esta categoría para el mes seleccionado.'
                : 'No registraste gastos este mes.'}
            </div>
          </div>
        ) : (
          groupKeys.map(dateKey => (
            <div key={dateKey} className="exp-date-group animate-in">
              <DateGroupHeader
                label={dateKey}
                total={sumExpenses(grouped[dateKey])}
                currency={primaryCurrency}
              />
              <div className="exp-list-inner">
                {grouped[dateKey].map(exp => (
                  <ExpenseListItem
                    key={exp.id}
                    expense={exp}
                    onPress={() => onDelete(exp.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
