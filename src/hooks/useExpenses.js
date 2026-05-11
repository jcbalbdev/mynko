/**
 * useExpenses.js
 * Supabase-backed expense management hook.
 * Replaces the previous localStorage implementation.
 *
 * All operations are async — the hook maintains a local React state
 * that mirrors the DB for instant UI updates (optimistic updates).
 *
 * Column mapping: JS camelCase ↔ Supabase snake_case
 *   sharedWith  ↔ shared_with
 *   sharedOwes  ↔ shared_owes
 *   createdAt   ↔ created_at
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ── Normalize a DB row → JS object ── */
function rowToExpense(row) {
  return {
    id:           row.id,
    amount:       Number(row.amount),
    description:  row.description ?? '',
    category:     row.category,
    color:        row.color,
    type:         row.type,
    date:         row.date,
    currency:     row.currency    ?? 'MXN',
    sharedWith:   row.shared_with ?? '',
    sharedOwes:   row.shared_owes ? Number(row.shared_owes) : 0,
    sharedPaid:   row.shared_paid ?? false,
    createdAt:    row.created_at,
    accountId:       row.account_id        ?? null,
    location:        row.location          ?? '',
    creditAccountId: row.credit_account_id ?? null,
    // Exchange fields
    fromCurrency: row.from_currency ?? null,
    fromAmount:   row.from_amount   ? Number(row.from_amount) : null,
    exchangeRate: row.exchange_rate ? Number(row.exchange_rate) : null,
  };
}

/* ── Normalize a JS object → DB insert/update payload ── */
function expenseToRow(expense, userId) {
  return {
    ...(userId ? { user_id: userId } : {}),
    amount:        expense.amount,
    description:   expense.description ?? '',
    category:      expense.category    ?? 'other',
    color:         expense.color       ?? '#FFDAB3',
    type:          expense.type        ?? 'personal',
    currency:      expense.currency    ?? 'MXN',
    date:          expense.date instanceof Date
                     ? expense.date.toISOString()
                     : (expense.date ?? new Date().toISOString()),
    shared_with:   expense.sharedWith  ?? null,
    shared_owes:   expense.sharedOwes  || null,
    shared_paid:   expense.sharedPaid  ?? false,
    account_id:        expense.accountId        ?? null,
    location:          expense.location?.trim() || null,
    credit_account_id: expense.creditAccountId  ?? null,
    // Exchange fields
    from_currency: expense.fromCurrency ?? null,
    from_amount:   expense.fromAmount   ?? null,
    exchange_rate: expense.exchangeRate ?? null,
  };
}

/* ══════════════════════════════════════
   HOOK
══════════════════════════════════════ */
export function useExpenses(userId) {
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  /* ── Fetch all expenses for the current user ── */
  const fetchExpenses = useCallback(async () => {
    if (!userId) { setExpenses([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[useExpenses] fetch error:', error.message);
      setError(error.message);
    } else {
      setExpenses(data.map(rowToExpense));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  /* Fetch on mount and when userId changes */
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  /* ── ADD ── */
  const addExpense = async (expense) => {
    const row = expenseToRow(expense, userId);
    const { data, error } = await supabase
      .from('expenses')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[useExpenses] insert error:', error.message, row);
      throw new Error(error.message); // propagate so caller can show error toast
    }
    const newExpense = rowToExpense(data);
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  };

  /* ── DELETE ── */
  const deleteExpense = async (id) => {
    // Optimistic update
    setExpenses(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      console.error('[useExpenses] delete error:', error.message);
      fetchExpenses(); // rollback on error
    }
  };

  /* ── UPDATE COLOR (single expense) ── */
  const updateExpenseColor = async (id, color) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, color } : e));
    const { error } = await supabase
      .from('expenses')
      .update({ color })
      .eq('id', id);
    if (error) {
      console.error('[useExpenses] updateExpenseColor error:', error.message);
      fetchExpenses();
    }
  };

  /* ── UPDATE (amount, description, category) ── */
  const updateExpense = async (id, fields) => {
    // Build snake_case payload from whatever fields are provided
    const payload = {};
    if (fields.amount      !== undefined) payload.amount      = fields.amount;
    if (fields.description !== undefined) payload.description = fields.description;
    if (fields.category    !== undefined) payload.category    = fields.category;
    if (fields.location    !== undefined) payload.location    = fields.location?.trim() || null;

    // Optimistic update
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e));
    const { error } = await supabase.from('expenses').update(payload).eq('id', id);
    if (error) {
      console.error('[useExpenses] updateExpense error:', error.message);
      fetchExpenses();
    }
  };

  /* ── UPDATE COLOR (all expenses in a category) ── */
  const updateCategoryColor = async (categoryId, color) => {
    setExpenses(prev =>
      prev.map(e => e.category === categoryId ? { ...e, color } : e)
    );
    const { error } = await supabase
      .from('expenses')
      .update({ color })
      .eq('user_id', userId)
      .eq('category', categoryId);
    if (error) {
      console.error('[useExpenses] updateCategoryColor error:', error.message);
      fetchExpenses();
    }
  };

  /* ── UPDATE SHARED PAID STATUS ── */
  const updateSharedPaid = async (id, paid) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, sharedPaid: paid } : e));
    const { error } = await supabase
      .from('expenses')
      .update({ shared_paid: paid })
      .eq('id', id);
    if (error) {
      console.error('[useExpenses] updateSharedPaid error:', error.message);
      fetchExpenses();
    }
  };

  /* ── HELPERS ── */
  const getMonthExpenses = (year, month) =>
    expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

  const getMonthTotal = (year, month) =>
    getMonthExpenses(year, month).reduce((sum, e) => sum + e.amount, 0);

  return {
    expenses,
    loading,
    error,
    addExpense,
    deleteExpense,
    updateExpense,
    updateExpenseColor,
    updateCategoryColor,
    updateSharedPaid,
    getMonthExpenses,
    getMonthTotal,
    refetch: fetchExpenses,
  };
}
