/**
 * useAccounts.js
 * Supabase-backed accounts management hook.
 *
 * Accounts represent money sources (cash, bank, savings).
 * Each account tracks its own balance, currency and type.
 *
 * Column mapping: JS camelCase ↔ Supabase snake_case
 *   hasBeenSet  ↔ has_been_set
 *   createdAt   ↔ created_at
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ── Normalize a DB row → JS object ── */
function rowToAccount(row) {
  return {
    id:          row.id,
    name:        row.name,
    type:        row.type,
    currency:    row.currency ?? 'MXN',
    balance:     Number(row.balance ?? 0),
    hasBeenSet:  row.has_been_set ?? false,
    createdAt:   row.created_at,
    isCredit:    row.is_credit    ?? false,
    creditLimit: row.credit_limit != null ? Number(row.credit_limit) : null,
    cutDay:      row.cut_day      ?? null,
    paymentDay:  row.payment_day  ?? null,
    tcea:        row.tcea         != null ? Number(row.tcea) : null,
  };
}

/* ── Default accounts created for every new user ── */
function buildDefaultAccounts(userId, currency) {
  return [
    { user_id: userId, name: 'Mi Efectivo',  type: 'efectivo', currency, balance: 0, has_been_set: false },
    { user_id: userId, name: 'Mi Banco',     type: 'banco',    currency, balance: 0, has_been_set: false },
    { user_id: userId, name: 'Mis Ahorros',  type: 'ahorro',   currency, balance: 0, has_been_set: false },
  ];
}

/* ══════════════════════════════════════
   HOOK
══════════════════════════════════════ */
export function useAccounts(userId, defaultCurrency = 'MXN') {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  /* ── Fetch all accounts for the current user ── */
  const fetchAccounts = useCallback(async () => {
    if (!userId) { setAccounts([]); setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[useAccounts] fetch error:', error.message);
      setError(error.message);
    } else {
      setAccounts(data.map(rowToAccount));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  /* Fetch on mount and when userId changes */
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  /* ── INIT DEFAULT ACCOUNTS (only if user has none) ── */
  const initDefaultAccounts = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (data && data.length === 0) {
      const defaults = buildDefaultAccounts(userId, defaultCurrency);
      const { error } = await supabase.from('accounts').insert(defaults);
      if (error) {
        console.error('[useAccounts] initDefaultAccounts error:', error.message);
      } else {
        await fetchAccounts();
      }
    }
  }, [userId, defaultCurrency, fetchAccounts]);

  /* ── CREATE ── */
  const createAccount = async ({ name, type, currency, balance, isCredit, creditLimit, cutDay, paymentDay, tcea, hasBeenSet }) => {
    const row = {
      user_id:      userId,
      name:         name.trim(),
      type:         isCredit ? 'banco' : type,
      currency:     currency ?? defaultCurrency,
      balance:      balance ?? 0,
      has_been_set: hasBeenSet !== undefined ? hasBeenSet : (isCredit ? true : Number(balance) > 0),
      is_credit:    isCredit    ?? false,
      credit_limit: isCredit    ? (creditLimit ?? null) : null,
      cut_day:      isCredit    ? (cutDay      ?? null) : null,
      payment_day:  isCredit    ? (paymentDay  ?? null) : null,
      tcea:         isCredit    ? (tcea        ?? null) : null,
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[useAccounts] insert error:', error.message);
      throw new Error(error.message);
    }
    const newAccount = rowToAccount(data);
    setAccounts(prev => [...prev, newAccount]);
    return newAccount;
  };

  /* ── UPDATE ── */
  const updateAccount = async (id, fields) => {
    const payload = {};
    if (fields.name        !== undefined) payload.name         = fields.name.trim();
    if (fields.type        !== undefined) payload.type         = fields.type;
    if (fields.currency    !== undefined) payload.currency     = fields.currency;
    if (fields.balance     !== undefined) {
      payload.balance      = fields.balance;
      payload.has_been_set = true;
    }
    if (fields.creditLimit !== undefined) payload.credit_limit = fields.creditLimit;
    if (fields.cutDay      !== undefined) payload.cut_day      = fields.cutDay;
    if (fields.paymentDay  !== undefined) payload.payment_day  = fields.paymentDay;
    if (fields.tcea        !== undefined) payload.tcea         = fields.tcea;

    // Optimistic update
    setAccounts(prev => prev.map(a =>
      a.id === id
        ? { ...a, ...fields, ...(fields.balance !== undefined ? { hasBeenSet: true } : {}) }
        : a
    ));

    const { error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('[useAccounts] update error:', error.message);
      fetchAccounts(); // rollback
      throw new Error(error.message);
    }
  };

  /* ── DELETE ── */
  const deleteAccount = async (id) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      console.error('[useAccounts] delete error:', error.message);
      fetchAccounts(); // rollback
    }
  };

  /* ── COMPUTED: balance = stored balance + linked transactions delta ── */
  const getComputedBalance = (accountId, expenses) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const linked = (expenses || []).filter(e => e.accountId === accountId);
    const delta = linked.reduce((sum, e) => {
      if (e.type === 'ingreso') return sum + e.amount;
      if (e.type === 'personal' || e.type === 'compartido') return sum - e.amount;
      return sum;
    }, 0);

    return account.balance + delta;
  };

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    initDefaultAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getComputedBalance,
  };
}
