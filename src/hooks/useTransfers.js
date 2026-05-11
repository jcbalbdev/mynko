/**
 * useTransfers.js
 * Supabase-backed transfers management hook.
 *
 * Transfers are neutral movements between accounts
 * (do NOT count as income or expense in global totals).
 *
 * When a transfer is created:
 *  - from_account balance decreases
 *  - to_account balance increases
 *  Both updates happen via individual account updates passed from the caller.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ── Normalize a DB row → JS object ── */
function rowToTransfer(row) {
  return {
    id:            row.id,
    fromAccountId: row.from_account_id,
    toAccountId:   row.to_account_id,
    amount:        Number(row.amount),
    currency:      row.currency ?? 'MXN',
    note:          row.note ?? '',
    date:          row.date,
    createdAt:     row.created_at,
  };
}

/* ══════════════════════════════════════
   HOOK
══════════════════════════════════════ */
export function useTransfers(userId) {
  const [transfers, setTransfers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  /* ── Fetch all transfers for the current user ── */
  const fetchTransfers = useCallback(async () => {
    if (!userId) { setTransfers([]); setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[useTransfers] fetch error:', error.message);
      setError(error.message);
    } else {
      setTransfers(data.map(rowToTransfer));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  /**
   * ── CREATE TRANSFER ──
   * Creates the transfer record.
   * Caller is responsible for updating account balances via updateAccount.
   */
  const createTransfer = async ({ fromAccountId, toAccountId, amount, currency, note, date }) => {
    if (fromAccountId === toAccountId) {
      throw new Error('La cuenta origen y destino no pueden ser la misma.');
    }
    if (Number(amount) <= 0) {
      throw new Error('El monto debe ser mayor a cero.');
    }

    const row = {
      user_id:         userId,
      from_account_id: fromAccountId,
      to_account_id:   toAccountId,
      amount:          Number(amount),
      currency:        currency ?? 'MXN',
      note:            note?.trim() ?? '',
      date:            date instanceof Date ? date.toISOString() : (date ?? new Date().toISOString()),
    };

    const { data, error } = await supabase
      .from('transfers')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[useTransfers] insert error:', error.message);
      throw new Error(error.message);
    }

    const newTransfer = rowToTransfer(data);
    setTransfers(prev => [newTransfer, ...prev]);
    return newTransfer;
  };

  /* ── DELETE ── */
  const deleteTransfer = async (id) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('transfers').delete().eq('id', id);
    if (error) {
      console.error('[useTransfers] delete error:', error.message);
      fetchTransfers();
    }
  };

  return {
    transfers,
    loading,
    error,
    fetchTransfers,
    createTransfer,
    deleteTransfer,
  };
}
