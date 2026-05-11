/**
 * BalanceView.jsx
 * Weekly income vs expense comparison for a selected year/month.
 * Clicking a week bar shows that week's transaction history below.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './BalanceView.css';
import { formatAmount } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';
import { getExchangeOutflows, effectiveAmount } from '../hooks/useTransactionTotals';
import TransactionRow from './ui/TransactionRow';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MAX_H = 180; // max bar height in px

/* ISO week number of the year for a given Date (ISO 8601, week starts Monday) */
function getISOWeek(date) {
  const d = new Date(date);
  const dow = d.getDay() || 7;       // 1=Mon … 7=Sun
  d.setDate(d.getDate() + 4 - dow);  // shift to nearest Thursday
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + 1) / 7);
}

/*
 * Returns the ISO weeks that overlap with the given month, each clipped
 * to the month boundaries.
 * e.g. April 2026:
 *   Sem 14 → 1-5 Abr   (real ISO week 14 starts Mon 30 Mar)
 *   Sem 15 → 6-12 Abr
 *   Sem 16 → 13-19 Abr
 *   Sem 17 → 20-26 Abr
 *   Sem 18 → 27-30 Abr  (real ISO week 18 ends Sun 3 May)
 */
function getWeeks(year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0); // last day of month

  // Monday of the week that contains day 1
  const dow1       = monthStart.getDay() || 7;      // 1=Mon…7=Sun
  let   monday     = new Date(year, month, 1 - (dow1 - 1));

  const weeks = [];
  while (monday <= monthEnd) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Clip to month
    const clippedStart = monday < monthStart ? monthStart : monday;
    const clippedEnd   = sunday  > monthEnd  ? monthEnd   : sunday;

    weeks.push({
      label:    `Sem ${getISOWeek(monday)}`,
      startDay: clippedStart.getDate(),
      endDay:   clippedEnd.getDate(),
    });

    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }
  return weeks;
}


export default function BalanceView({ expenses, year, month, currency, onYearChange, onMonthChange }) {
  const curr = currency !== 'all' ? currency : null;

  const incomes = useMemo(() =>
    expenses.filter(e => (e.type === 'ingreso' || e.type === 'cambio') && (!curr || e.currency === curr)),
    [expenses, curr]
  );
  const costs = useMemo(() =>
    expenses.filter(e => e.type !== 'ingreso' && e.type !== 'cambio' && (!curr || e.currency === curr)),
    [expenses, curr]
  );
  const outflows = useMemo(() =>
    getExchangeOutflows(expenses, curr),
    [expenses, curr]
  );

  const rawWeeks = useMemo(() => getWeeks(year, month), [year, month]);

  const weeks = useMemo(() => {
    return rawWeeks.map(w => {
      const inRange = e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month
          && d.getDate() >= w.startDay && d.getDate() <= w.endDay;
      };
      const weekIncomes   = incomes.filter(inRange);
      const weekCosts     = costs.filter(inRange);
      const weekOutflows  = outflows.filter(inRange);

      // Income: received incomes + received cambio - given cambio (outflows)
      const incomeTotal = weekIncomes.reduce((s, e) => s + e.amount, 0)
        - weekOutflows.reduce((s, e) => s + (e.fromAmount ?? 0), 0);

      const expenseTotal = weekCosts.reduce((s, e) => s + effectiveAmount(e), 0);

      // History: incomes + costs + outflows (tagged)
      const outflowRecords = weekOutflows.map(e => ({ ...e, _isOutflow: true }));
      const records = [...weekIncomes, ...weekCosts, ...outflowRecords]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return { ...w, income: Math.max(incomeTotal, 0), expense: expenseTotal, incomeNet: incomeTotal, records };
    });
  }, [incomes, costs, outflows, rawWeeks, year, month]);

  /* Default selected week = last week that has data, or last week */
  const defaultWeek = useMemo(() => {
    const lastWithData = weeks.map((w, i) => ({ ...w, i }))
      .filter(w => w.income > 0 || w.expense > 0)
      .at(-1);
    return lastWithData ? lastWithData.i : weeks.length - 1;
  }, [weeks]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(defaultWeek);

  /* Reset selected week when month/year changes */
  const [prevMonth, setPrevMonth] = useState(month);
  const [prevYear,  setPrevYear]  = useState(year);
  if (month !== prevMonth || year !== prevYear) {
    setPrevMonth(month);
    setPrevYear(year);
    setSelectedWeekIdx(defaultWeek);
  }

  const totalIncome  = weeks.reduce((s, w) => s + w.income,  0);
  const totalExpense = weeks.reduce((s, w) => s + w.expense, 0);
  const net          = totalIncome - totalExpense;
  const maxVal       = Math.max(...weeks.flatMap(w => [w.income, w.expense]), 1);
  const currLabel    = getCurrencyByCode(curr ?? 'MXN').code;

  const selectedWeek = weeks[selectedWeekIdx];

  return (
    <div className="balance-view">

      {/* ── Year selector ── */}
      <div className="balance-year-row">
        <button className="balance-nav-btn" onClick={() => onYearChange(year - 1)} aria-label="Año anterior">
          <ChevronLeft size={18} />
        </button>
        <span className="balance-year-label">{year}</span>
        <button className="balance-nav-btn" onClick={() => onYearChange(year + 1)} aria-label="Año siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Month chips ── */}
      <div className="balance-month-row">
        {MONTHS_SHORT.map((m, i) => (
          <button
            key={i}
            className={`balance-month-chip${month === i ? ' active' : ''}`}
            onClick={() => onMonthChange(i)}
            id={`balance-month-${i}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* ── Summary stats ── */}
      <div className="balance-stats-row">
        <div className="balance-stat">
          <span className="balance-stat-label">Ingresos</span>
          <span className="balance-stat-value income-val">{formatAmount(totalIncome)}</span>
          <span className="balance-stat-currency">{currLabel}</span>
        </div>
        <div className="balance-stat balance-stat--net" style={{ color: net >= 0 ? '#34A853' : '#EA4335' }}>
          <span className="balance-stat-label">Balance</span>
          <span className="balance-stat-value">{net >= 0 ? '+' : '-'}{formatAmount(Math.abs(net))}</span>
          <span className="balance-stat-currency">{currLabel}</span>
        </div>
        <div className="balance-stat">
          <span className="balance-stat-label">Gastos</span>
          <span className="balance-stat-value expense-val">{formatAmount(totalExpense)}</span>
          <span className="balance-stat-currency">{currLabel}</span>
        </div>
      </div>

      {/* ── Weekly bar chart (clickable) ── */}
      <div className="balance-chart-wrap">
        {weeks.map((w, i) => {
          const incH = (w.income  / maxVal) * MAX_H;
          const expH = (w.expense / maxVal) * MAX_H;
          const isSelected = i === selectedWeekIdx;
          return (
            <button
              key={i}
              className={`balance-week-col${isSelected ? ' selected' : ''}`}
              onClick={() => setSelectedWeekIdx(i)}
              id={`balance-week-${i}`}
              aria-label={`${w.label}: seleccionar`}
            >
              <div className="balance-bar-container" style={{ height: MAX_H }}>
                <div className="balance-bar balance-bar--income"  style={{ height: Math.max(incH, incH > 0 ? 6 : 0), background: '#34A853', zIndex: incH <= expH ? 2 : 1 }} />
                <div className="balance-bar balance-bar--expense" style={{ height: Math.max(expH, expH > 0 ? 6 : 0), background: '#EA4335', zIndex: expH <  incH ? 2 : 1 }} />
              </div>
              <span className="balance-week-label">{w.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="balance-legend">
        <span className="balance-legend-dot" style={{ background: '#34A853' }} />
        <span className="balance-legend-text">Ingresos</span>
        <span className="balance-legend-dot" style={{ background: '#EA4335' }} />
        <span className="balance-legend-text">Gastos</span>
      </div>

      {/* ── Week history ── */}
      <div className="balance-history">
        {/* Two pills connected by dotted line — same horizontal padding as cards */}
        <div style={{ padding: '0 16px' }}>
          <div className="exp-date-header">
            <span className="exp-date-label">{selectedWeek?.label}</span>
            <div className="exp-date-dash" aria-hidden="true" />
            <span className="exp-date-total">
              {selectedWeek && `${selectedWeek.startDay} - ${selectedWeek.endDay} ${MONTHS_SHORT[month]}`}
            </span>
          </div>
        </div>

        {selectedWeek?.records.length > 0 ? (
          <div className="exp-list-section" style={{ paddingTop: 0 }}>
            {selectedWeek.records.map(r => (
              <TransactionRow key={`${r.id}${r._isOutflow ? '-out' : ''}`} record={r} readonly />
            ))}
          </div>
        ) : (
          <p className="balance-history-empty">Sin movimientos esta semana</p>
        )}
      </div>

      <div style={{ height: 110 }} />
    </div>
  );
}
