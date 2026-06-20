import React, { useMemo, useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import './BalanceView.css';
import { formatAmount } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';
import { getExchangeOutflows, effectiveAmount } from '../hooks/useTransactionTotals';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import TransactionRow from './ui/TransactionRow';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MAX_H = 180;

function formatK(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return Math.round(v).toString();
}

export default function BalanceView({ expenses, year, currency, onMonthSelect }) {
  const curr = currency !== 'all' ? currency : null;

  const incomes  = useMemo(() => expenses.filter(e => (e.type === 'ingreso' || e.type === 'cambio') && (!curr || e.currency === curr)), [expenses, curr]);
  const costs    = useMemo(() => expenses.filter(e => e.type !== 'ingreso' && e.type !== 'cambio' && (!curr || e.currency === curr)), [expenses, curr]);
  const outflows = useMemo(() => getExchangeOutflows(expenses, curr), [expenses, curr]);

  const bars = useMemo(() => MONTHS_SHORT.map((lbl, m) => {
    const inRange = e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === m; };
    const mI = incomes.filter(inRange);
    const mC = costs.filter(inRange);
    const mO = outflows.filter(inRange);
    const incomeTotal  = mI.reduce((s,e) => s + e.amount, 0) - mO.reduce((s,e) => s + (e.fromAmount ?? 0), 0);
    const expenseTotal = mC.reduce((s,e) => s + effectiveAmount(e), 0);
    const records = [...mI, ...mC, ...mO.map(e => ({...e, _isOutflow: true}))].sort((a,b) => new Date(b.date) - new Date(a.date));
    return { label: lbl, income: Math.max(incomeTotal, 0), expense: expenseTotal, records };
  }), [incomes, costs, outflows, year]);

  const defaultIdx = useMemo(() => {
    const last = bars.map((b,i) => ({...b, i})).filter(b => b.income > 0 || b.expense > 0).at(-1);
    return last ? last.i : new Date().getMonth();
  }, [bars]);

  const [selectedIdx, setSelectedIdx] = useState(defaultIdx);
  useEffect(() => { onMonthSelect?.(defaultIdx); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [prevYear, setPrevYear] = useState(year);
  if (year !== prevYear) {
    setPrevYear(year);
    setSelectedIdx(defaultIdx);
    onMonthSelect?.(defaultIdx);
  }

  const selectedBar     = bars[selectedIdx];
  const selectedIncome  = selectedBar?.income  ?? 0;
  const selectedExpense = selectedBar?.expense ?? 0;
  const net             = selectedIncome - selectedExpense;
  const maxVal          = Math.max(...bars.flatMap(b => [b.income, b.expense]), 1);
  const currLabel       = getCurrencyByCode(curr ?? 'MXN').symbol;

  const animIncome  = useAnimatedNumber(selectedIncome);
  const animExpense = useAnimatedNumber(selectedExpense);
  const animNet     = useAnimatedNumber(Math.abs(net));
  const incInt   = Math.floor(animIncome).toLocaleString('es-MX');
  const incCents = (animIncome  % 1).toFixed(2).slice(1);
  const expInt   = Math.floor(animExpense).toLocaleString('es-MX');
  const expCents = (animExpense % 1).toFixed(2).slice(1);
  const netInt   = Math.floor(animNet).toLocaleString('es-MX');
  const netCents = (animNet % 1).toFixed(2).slice(1);

  /* Deduplicated reference values from actual bar heights */
  const refValues = useMemo(() => {
    const raw = new Set();
    bars.forEach(b => {
      if (b.income  > 0) raw.add(b.income);
      if (b.expense > 0) raw.add(b.expense);
    });
    const sorted = [...raw].sort((a, b) => a - b);
    const threshold = maxVal * 0.07;
    return sorted.filter((v, i) => i === 0 || v - sorted[i - 1] > threshold);
  }, [bars, maxVal]);

  return (
    <div className="balance-view">

      {/* ── Summary card ── */}
      <div className="balance-summary-card">
        <div className="balance-summary-item">
          <div className="balance-summary-icon">
            <ArrowUp size={16} strokeWidth={3} />
          </div>
          <div className="balance-summary-text">
            <p className="balance-summary-label">Ingresos</p>
            <p className="balance-summary-amount">{incInt}<span className="balance-summary-cents">{incCents}</span> <span className="balance-summary-currency">{currLabel}</span></p>
          </div>
        </div>
        <div className="balance-summary-sep" />
        <div className="balance-summary-item">
          <div className="balance-summary-icon">
            <ArrowDown size={16} strokeWidth={3} />
          </div>
          <div className="balance-summary-text">
            <p className="balance-summary-label">Gastos</p>
            <p className="balance-summary-amount">{expInt}<span className="balance-summary-cents">{expCents}</span> <span className="balance-summary-currency">{currLabel}</span></p>
          </div>
        </div>
      </div>

      {/* ── Bar chart ── */}
      <div className="bal-chart-card">
        {/* Chart area: reference lines + bars */}
        <div className="bal-chart-area" style={{ height: MAX_H }}>
          {refValues.map((v, i) => (
            <div key={i} className="bal-ref-line" style={{ bottom: (v / maxVal) * MAX_H }}>
              <span className="bal-ref-label">{formatK(v)}</span>
            </div>
          ))}
          <div className="bal-bars-row">
            {bars.map((b, i) => {
              const incH = (b.income  / maxVal) * MAX_H;
              const expH = (b.expense / maxVal) * MAX_H;
              return (
                <button key={i} className="bal-month-btn" onClick={() => { setSelectedIdx(i); onMonthSelect?.(i); }}>
                  <div className="bal-bar-pair" style={{ height: MAX_H }}>
                    <div className="bal-bar bal-bar--income"  style={{ height: Math.max(incH, incH > 0 ? 4 : 0) }} />
                    <div className="bal-bar bal-bar--expense" style={{ height: Math.max(expH, expH > 0 ? 4 : 0) }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Month labels row */}
        <div className="bal-labels-row">
          {bars.map((b, i) => (
            <span key={i} className={`bal-month-label${i === selectedIdx ? ' selected' : ''}`} onClick={() => { setSelectedIdx(i); onMonthSelect?.(i); }}>
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── History ── */}
      <div className="balance-history">
        <div style={{ padding: '0 16px' }}>
          <div className="exp-date-header">
            <span className="exp-date-label">{selectedBar?.label} {year}</span>
            <div className="exp-date-dash" aria-hidden="true" />
            <span className="exp-date-total" style={{ color: net >= 0 ? '#34A853' : '#EA4335' }}>
              <span style={{ marginRight: 2 }}>{net >= 0 ? '+' : '-'}</span>{netInt}<span style={{ fontSize: '0.8em', opacity: 0.8 }}>{netCents}</span><span style={{ marginLeft: 4 }}>{currLabel}</span>
            </span>
          </div>
        </div>
        {selectedBar?.records.length > 0 ? (
          <div className="exp-list-section" style={{ paddingTop: 0 }}>
            <div className="exp-day-block">
              {selectedBar.records.map((r, idx) => (
                <React.Fragment key={`${r.id}${r._isOutflow ? '-out' : ''}`}>
                  {idx > 0 && <div className="exp-day-divider" />}
                  <TransactionRow record={r} readonly />
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <p className="balance-history-empty">Sin movimientos en este período</p>
        )}
      </div>

      <div style={{ height: 110 }} />
    </div>
  );
}
