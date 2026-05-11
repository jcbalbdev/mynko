/**
 * IncomeListView.jsx
 * Shows income + exchange records grouped by date.
 * Supports drill-down by category (same logic as gastos).
 */
import React, { useMemo } from 'react';
import './IncomeListView.css';
import {
  applyFilters,
  applySearchTags,
  groupByCategory,
  groupBySubcategory,
  filterByDrillCategory,
  friendlyDate,
} from '../utils/expenses';
import DateGroupHeader  from './ui/DateGroupHeader';
import BarChart         from './BarChart';
import TransactionRow   from './ui/TransactionRow';
import { getExchangeOutflows } from '../hooks/useTransactionTotals';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

export default function IncomeListView({
  expenses,
  onPress,
  period         = 'month',
  currencyFilter = 'all',
  locationFilter = 'Todos',
  searchTags     = [],
  drillCategory  = null,
  onDrillCategory,
  onBarLongPress,
  onHoverOption,
  onLongPressRelease,
  barChartRef    = null,
}) {
  const userCategories = useUserCategoriesCtx();

  /* Incomes: regular + exchange received + paid compartido/debts */
  const incomes = useMemo(() => {
    const raw = expenses.filter(e =>
      e.type === 'ingreso' ||
      e.type === 'cambio'  ||
      (e.type === 'compartido' && e.sharedPaid)
    );
    const filtered = applyFilters(raw, period, 'all', currencyFilter, locationFilter);
    return applySearchTags(filtered, searchTags, userCategories);
  }, [expenses, period, currencyFilter, locationFilter, searchTags, userCategories]);

  /* Exchange outflows (for bar + list) */
  const outflows = useMemo(() => {
    if (currencyFilter === 'all') return [];
    const raw = getExchangeOutflows(expenses, currencyFilter);
    return applyFilters(raw, period, 'all', 'all').map(e => ({ ...e, _isOutflow: true }));
  }, [expenses, period, currencyFilter]);

  /* ── Normal (no drill) chart data ── */
  const chartDataAll = useMemo(() => {
    const virtualOutflows = outflows.map(e => ({
      ...e,
      amount:        e.fromAmount ?? 0,
      currency:      e.fromCurrency,
      category:      'exchange',
      _isOutflowBar: true,
    }));
    return groupByCategory([...incomes, ...virtualOutflows], userCategories);
  }, [incomes, outflows, userCategories]);

  /* ── Drill-down data ── */
  const drillIncomes = useMemo(() => {
    if (!drillCategory) return [];
    return filterByDrillCategory(incomes, drillCategory, userCategories);
  }, [drillCategory, incomes, userCategories]);

  const drillChartData = useMemo(() => {
    if (!drillCategory) return [];
    return groupBySubcategory(drillIncomes, userCategories);
  }, [drillCategory, drillIncomes, userCategories]);

  /* ── Combined list (normal or drill) ── */
  const combined = useMemo(() => {
    const source = drillCategory ? drillIncomes : [...incomes, ...outflows];
    return [...source].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [drillCategory, drillIncomes, incomes, outflows]);

  const grouped = useMemo(() => {
    const map = {};
    combined.forEach(e => {
      const key = friendlyDate(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [combined]);

  const dateKeys = Object.keys(grouped);

  return (
    <>
      <div className="barchart-section" ref={barChartRef}>
        <BarChart
          expenses={drillCategory ? drillChartData : chartDataAll}
          onBarPress={drillCategory ? null : onDrillCategory}
          onBarLongPress={drillCategory ? null : onBarLongPress}
          onHoverOption={onHoverOption}
          onLongPressRelease={onLongPressRelease}
          emptyLabel="ingresos"
        />
      </div>

      {dateKeys.length > 0 && (
        <div className="exp-list-section">
          {dateKeys.map(dateKey => {
            const dayRecords = grouped[dateKey];
            const dayTotal   = dayRecords.reduce(
              (s, e) => e._isOutflow ? s - (e.fromAmount ?? 0) : s + e.amount, 0
            );
            return (
              <div key={dateKey} className="exp-date-group">
                <DateGroupHeader label={dateKey} total={Math.abs(dayTotal)} currency={currencyFilter} />
                {dayRecords.map(record => (
                  <TransactionRow
                    key={`${record.id}${record._isOutflow ? '-out' : ''}`}
                    record={record}
                    onPress={onPress}
                  />
                ))}
              </div>
            );
          })}
          <div style={{ height: 110 }} />
        </div>
      )}
    </>
  );
}
