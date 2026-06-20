import { supabase } from '../lib/supabase';
import { useSupabaseCollection } from './useSupabaseCollection';

const ORDER_BY = { column: 'date', ascending: false };

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

export function useTransfers(userId) {
  const { items: transfers, setItems: setTransfers, loading, error, refetch: fetchTransfers } =
    useSupabaseCollection({ userId, table: 'transfers', rowToItem: rowToTransfer, orderBy: ORDER_BY });

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
    const { data, error: insertErr } = await supabase
      .from('transfers')
      .insert(row)
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);
    const newTransfer = rowToTransfer(data);
    setTransfers(prev => [newTransfer, ...prev]);
    return newTransfer;
  };

  const deleteTransfer = async (id) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
    const { error: deleteErr } = await supabase.from('transfers').delete().eq('id', id);
    if (deleteErr) {
      console.error('[useTransfers] delete error:', deleteErr.message);
      fetchTransfers();
    }
  };

  return { transfers, loading, error, fetchTransfers, createTransfer, deleteTransfer };
}
