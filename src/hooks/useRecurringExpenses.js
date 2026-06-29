/**
 * useRecurringExpenses.js
 * Manages recurring expenses and subscriptions.
 * recurring  → user manually confirms each payment
 * subscription → payment is registered automatically on due date
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toDateString } from '../utils/dates';

/* ── Compute the next due date after `after` (defaults to today) ── */
export function computeNextDueDate(rec, after = new Date()) {
  const today = new Date(after);
  today.setHours(0, 0, 0, 0);

  if (rec.frequency === 'weekly') {
    const days = rec.days_of_week ?? rec.daysOfWeek ?? [];
    if (!days.length) return null;
    for (let i = 1; i <= 7; i++) {
      const c = new Date(today);
      c.setDate(today.getDate() + i);
      if (days.includes(c.getDay())) return c;
    }
    return null;
  }

  if (rec.frequency === 'monthly') {
    const day = rec.day_of_month ?? rec.dayOfMonth ?? 1;
    for (let m = 0; m <= 13; m++) {
      const base    = new Date(today.getFullYear(), today.getMonth() + m, 1);
      const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const actual  = Math.min(day, lastDay);
      const c       = new Date(base.getFullYear(), base.getMonth(), actual);
      if (c > today) return c;
    }
    return null;
  }

  if (rec.frequency === 'yearly') {
    const month = (rec.yearly_month ?? rec.yearlyMonth ?? 1) - 1;
    const day   = rec.yearly_day ?? rec.yearlyDay ?? 1;
    for (let y = 0; y <= 1; y++) {
      const year    = today.getFullYear() + y;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const actual  = Math.min(day, lastDay);
      const c       = new Date(year, month, actual);
      if (c > today) return c;
    }
    return null;
  }

  return null;
}

/* ── DB row → JS object ── */
function rowToRecurring(row) {
  return {
    id:              row.id,
    entryType:       row.entry_type,
    amount:          Number(row.amount),
    currency:        row.currency    ?? 'MXN',
    category:        row.category,
    color:           row.color       ?? null,
    accountId:       row.account_id  ?? null,
    description:     row.description ?? '',
    location:        row.location    ?? '',
    frequency:       row.frequency,
    daysOfWeek:      row.days_of_week  ?? [],
    dayOfMonth:      row.day_of_month  ?? null,
    yearlyDay:       row.yearly_day    ?? null,
    yearlyMonth:     row.yearly_month  ?? null,
    isActive:        row.is_active,
    nextDueDate:     row.next_due_date ?? null,
    lastTriggeredAt: row.last_triggered_at ?? null,
    createdAt:       row.created_at,
  };
}

/* ── JS object → DB insert/update payload ── */
function recurringToRow(data, userId) {
  const nextDue = computeNextDueDate({
    frequency:    data.frequency,
    days_of_week: data.daysOfWeek,
    day_of_month: data.dayOfMonth,
    yearly_day:   data.yearlyDay,
    yearly_month: data.yearlyMonth,
  });
  return {
    ...(userId ? { user_id: userId } : {}),
    entry_type:   data.entryType,
    amount:       data.amount,
    currency:     data.currency  ?? 'MXN',
    category:     data.category,
    color:        data.color     ?? null,
    account_id:   data.accountId ?? null,
    description:  data.description?.trim() || null,
    location:     data.location?.trim()    || null,
    frequency:    data.frequency,
    days_of_week: data.daysOfWeek?.length ? data.daysOfWeek : null,
    day_of_month: data.dayOfMonth  ?? null,
    yearly_day:   data.yearlyDay   ?? null,
    yearly_month: data.yearlyMonth ?? null,
    next_due_date: toDateString(nextDue),
    updated_at:   new Date().toISOString(),
  };
}

/* ══════════════════════════════════════
   HOOK
══════════════════════════════════════ */
export function useRecurringExpenses(userId) {
  const [recurring, setRecurring] = useState([]);

  const fetchRecurring = useCallback(async () => {
    if (!userId) { setRecurring([]); return; }
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error) setRecurring((data ?? []).map(rowToRecurring));
  }, [userId]);

  useEffect(() => { fetchRecurring(); }, [fetchRecurring]);

  /* ── ADD ── */
  const addRecurring = async (data) => {
    const row = recurringToRow(data, userId);
    const { data: inserted, error } = await supabase
      .from('recurring_expenses')
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const newRec = rowToRecurring(inserted);
    setRecurring(prev => [newRec, ...prev]);
    return newRec;
  };

  /* ── UPDATE ── */
  const updateRecurring = async (id, fields) => {
    const existing = recurring.find(r => r.id === id);
    if (!existing) return;
    const merged = { ...existing, ...fields };
    const payload = recurringToRow(merged);
    delete payload.user_id;
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, ...fields, nextDueDate: payload.next_due_date } : r));
    const { error } = await supabase.from('recurring_expenses').update(payload).eq('id', id);
    if (error) {
      console.error('[useRecurringExpenses] update error:', error.message);
      fetchRecurring();
    }
  };

  /* ── SOFT DELETE (is_active = false) ── */
  const deleteRecurring = async (id) => {
    setRecurring(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase
      .from('recurring_expenses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[useRecurringExpenses] delete error:', error.message);
      fetchRecurring();
    }
  };

  /**
   * confirmRecurring — user taps "Registrar pago" on a recurring expense.
   * Creates a real expense and advances next_due_date.
   */
  const confirmRecurring = async (id, addExpense) => {
    const rec = recurring.find(r => r.id === id);
    if (!rec) return;

    await addExpense({
      amount:      rec.amount,
      description: rec.description,
      location:    rec.location,
      category:    rec.category,
      color:       rec.color,
      type:        'personal',
      currency:    rec.currency,
      date:        new Date(),
      accountId:   rec.accountId,
    });

    const nextDue = computeNextDueDate({
      frequency:    rec.frequency,
      days_of_week: rec.daysOfWeek,
      day_of_month: rec.dayOfMonth,
      yearly_day:   rec.yearlyDay,
      yearly_month: rec.yearlyMonth,
    });
    const nextDueStr   = toDateString(nextDue);
    const triggeredAt  = new Date().toISOString();

    setRecurring(prev => prev.map(r =>
      r.id === id ? { ...r, nextDueDate: nextDueStr, lastTriggeredAt: triggeredAt } : r
    ));
    await supabase.from('recurring_expenses').update({
      next_due_date:     nextDueStr,
      last_triggered_at: triggeredAt,
      updated_at:        triggeredAt,
    }).eq('id', id);
  };

  /**
   * markRecurringDone — user taps "Ya lo registré".
   * Advances next_due_date without creating a new expense.
   */
  const markRecurringDone = async (id) => {
    const rec = recurring.find(r => r.id === id);
    if (!rec) return;

    const nextDue = computeNextDueDate({
      frequency:    rec.frequency,
      days_of_week: rec.daysOfWeek,
      day_of_month: rec.dayOfMonth,
      yearly_day:   rec.yearlyDay,
      yearly_month: rec.yearlyMonth,
    });
    const nextDueStr  = toDateString(nextDue);
    const triggeredAt = new Date().toISOString();

    setRecurring(prev => prev.map(r =>
      r.id === id ? { ...r, nextDueDate: nextDueStr, lastTriggeredAt: triggeredAt } : r
    ));
    await supabase.from('recurring_expenses').update({
      next_due_date:     nextDueStr,
      last_triggered_at: triggeredAt,
      updated_at:        triggeredAt,
    }).eq('id', id);
  };

  /**
   * autoRegisterSubscriptions — called on app load.
   * Finds overdue subscriptions and registers them as expenses automatically.
   */
  const autoRegisterSubscriptions = useCallback(async (addExpense) => {
    if (!userId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = recurring.filter(r =>
      r.entryType === 'subscription' &&
      r.isActive &&
      r.nextDueDate &&
      new Date(r.nextDueDate) <= today
    );

    for (const rec of due) {
      try {
        // Build the expense date using local noon to avoid UTC offset shifting the display day
        const [y, m, d] = rec.nextDueDate.split('-').map(Number);
        const expenseDate = new Date(y, m - 1, d, 12, 0, 0);

        // Widen dedup window ±1 day to cover any UTC/local timezone difference
        const winStart = new Date(y, m - 1, d - 1, 0, 0, 0).toISOString();
        const winEnd   = new Date(y, m - 1, d + 1, 23, 59, 59).toISOString();

        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('user_id', userId)
          .eq('description', rec.description)
          .eq('amount', rec.amount)
          .gte('date', winStart)
          .lte('date', winEnd)
          .limit(1);

        const advanceNextDue = async () => {
          const nextDue = computeNextDueDate({
            frequency:    rec.frequency,
            days_of_week: rec.daysOfWeek,
            day_of_month: rec.dayOfMonth,
            yearly_day:   rec.yearlyDay,
            yearly_month: rec.yearlyMonth,
          }, new Date(y, m - 1, d));
          const nextDueStr = toDateString(nextDue);
          setRecurring(prev => prev.map(r =>
            r.id === rec.id ? { ...r, nextDueDate: nextDueStr } : r
          ));
          await supabase.from('recurring_expenses').update({
            next_due_date: nextDueStr,
            updated_at:    new Date().toISOString(),
          }).eq('id', rec.id);
        };

        if (existing && existing.length > 0) {
          await advanceNextDue();
          continue;
        }

        await addExpense({
          amount:      rec.amount,
          description: rec.description,
          location:    rec.location,
          category:    rec.category,
          color:       rec.color,
          type:        'personal',
          currency:    rec.currency,
          date:        expenseDate,
          accountId:   rec.accountId,
        });

        const nextDue    = computeNextDueDate({
          frequency:    rec.frequency,
          days_of_week: rec.daysOfWeek,
          day_of_month: rec.dayOfMonth,
          yearly_day:   rec.yearlyDay,
          yearly_month: rec.yearlyMonth,
        }, new Date(y, m - 1, d));
        const nextDueStr  = toDateString(nextDue);
        const triggeredAt = new Date().toISOString();

        setRecurring(prev => prev.map(r =>
          r.id === rec.id ? { ...r, nextDueDate: nextDueStr, lastTriggeredAt: triggeredAt } : r
        ));
        await supabase.from('recurring_expenses').update({
          next_due_date:     nextDueStr,
          last_triggered_at: triggeredAt,
          updated_at:        triggeredAt,
        }).eq('id', rec.id);
      } catch (err) {
        console.error('[autoRegisterSubscriptions] error for', rec.name, err.message);
      }
    }
  }, [userId, recurring]);

  return {
    recurring,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    confirmRecurring,
    markRecurringDone,
    autoRegisterSubscriptions,
    refetch: fetchRecurring,
  };
}
