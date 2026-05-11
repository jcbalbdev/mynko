/**
 * useTransactionTotals.js
 * Centralizes the net amount calculations used across HomeScreen, BalanceView, ExchangeView.
 *
 * Key insight: A 'cambio' record has:
 *   - currency   = to_currency  (received)
 *   - amount     = to_amount    (received amount)
 *   - fromCurrency / fromAmount = given side
 *
 * Net income for a currency = incomes + cambio received − cambio given
 */
import { useMemo } from 'react';
import { applyFilters } from '../utils/expenses';

/**
 * Returns the effective amount of a shared expense after reimbursement.
 * @param {object} e - expense record
 * @returns {number}
 */
export function effectiveAmount(e) {
  return (e.sharedPaid && (e.sharedOwes ?? 0) > 0)
    ? e.amount - e.sharedOwes
    : e.amount;
}

/**
 * Returns exchange outflow records for a given currency (records where we GAVE that currency).
 * @param {object[]} expenses
 * @param {string}   currency - currency code (not 'all')
 * @returns {object[]}
 */
export function getExchangeOutflows(expenses, currency) {
  if (!currency || currency === 'all') return [];
  return expenses.filter(e => e.type === 'cambio' && e.fromCurrency === currency);
}

/**
 * Hook: computes net totals per currency/period, memoized.
 *
 * @param {object[]} expenses
 * @param {string}   currencyFilter - 'all' or a currency code
 * @param {string}   period         - 'week'|'month'|'year'|'all'
 */
export function useTransactionTotals(expenses, currencyFilter, period) {
  /* Expenses: personal + compartido (unpaid) only */
  const expensesOnly = useMemo(
    () => expenses.filter(e =>
      e.type !== 'ingreso' &&
      e.type !== 'cambio'  &&
      !(e.type === 'compartido' && e.sharedPaid)  // paid compartido/debts → income
    ),
    [expenses]
  );

  /* Filtered expenses for the selected currency + period */
  const filtered = useMemo(
    () => applyFilters(expensesOnly, period, 'all', currencyFilter),
    [expensesOnly, period, currencyFilter]
  );

  /* Expense total (effective) */
  const expenseTotal = useMemo(
    () => filtered.reduce((s, e) => s + effectiveAmount(e), 0),
    [filtered]
  );

  /* Net income total = incomes + paid compartido/debts + cambio received − cambio given */
  const incomeTotal = useMemo(() => {
    const incomeRecords = expenses.filter(e =>
      e.type === 'ingreso' ||
      e.type === 'cambio'  ||
      (e.type === 'compartido' && e.sharedPaid)   // paid compartido/debt → income
    );
    const incFiltered = applyFilters(incomeRecords, period, 'all', currencyFilter);
    const incomeSum = incFiltered.reduce((s, e) => s + e.amount, 0);

    if (currencyFilter !== 'all') {
      const outflows = applyFilters(
        getExchangeOutflows(expenses, currencyFilter),
        period, 'all', 'all'
      );
      return incomeSum - outflows.reduce((s, e) => s + (e.fromAmount ?? 0), 0);
    }
    return incomeSum;
  }, [expenses, period, currencyFilter]);

  /* Debt total (sharedOwes unpaid) */
  const debtTotal = useMemo(() => {
    const periodFiltered = applyFilters(expensesOnly, period, 'all', currencyFilter);
    return periodFiltered.reduce((s, e) => s + (e.sharedOwes ?? 0), 0);
  }, [expensesOnly, period, currencyFilter]);

  return {
    expensesOnly,
    filtered,
    expenseTotal,
    incomeTotal,
    debtTotal,
  };
}
