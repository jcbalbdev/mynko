import { supabase } from '../lib/supabase';
import { useSupabaseCollection } from './useSupabaseCollection';

const ORDER_BY = { column: 'date', ascending: false };

function rowToCharge(row) {
  return {
    id:                row.id,
    accountId:         row.account_id,
    description:       row.description ?? '',
    category:          row.category    ?? 'other',
    amount:            Number(row.amount),
    currency:          row.currency ?? 'PEN',
    installments:      row.installments ?? 1,
    installmentAmount: row.installment_amount ? Number(row.installment_amount) : null,
    date:              row.date,
    createdAt:         row.created_at,
  };
}

export function useCreditCharges(userId) {
  const { items: charges, setItems: setCharges, refetch } =
    useSupabaseCollection({ userId, table: 'credit_charges', rowToItem: rowToCharge, orderBy: ORDER_BY });

  const addCharge = async (charge) => {
    const instAmt = charge.installments > 1
      ? (charge.installmentAmount ?? charge.amount / charge.installments)
      : null;
    const row = {
      user_id:            userId,
      account_id:         charge.accountId,
      description:        charge.description?.trim() ?? '',
      category:           charge.category ?? 'other',
      amount:             charge.amount,
      currency:           charge.currency ?? 'PEN',
      installments:       charge.installments ?? 1,
      installment_amount: instAmt,
      date:               charge.date instanceof Date
                            ? charge.date.toISOString()
                            : (charge.date ?? new Date().toISOString()),
    };
    const { data, error } = await supabase
      .from('credit_charges')
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const newCharge = rowToCharge(data);
    setCharges(prev => [newCharge, ...prev]);
    return newCharge;
  };

  const deleteCharge = async (id) => {
    setCharges(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('credit_charges').delete().eq('id', id);
    if (error) {
      console.error('[useCreditCharges] delete error:', error.message);
      refetch();
    }
  };

  const updateCharge = async (id, fields) => {
    const payload = {};
    if (fields.description !== undefined) payload.description = fields.description;
    if (fields.category    !== undefined) payload.category    = fields.category;
    if (fields.amount      !== undefined) payload.amount      = fields.amount;
    if (fields.date        !== undefined) payload.date        = fields.date;
    setCharges(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    const { error } = await supabase.from('credit_charges').update(payload).eq('id', id);
    if (error) {
      console.error('[useCreditCharges] update error:', error.message);
      refetch();
    }
  };

  return { charges, addCharge, deleteCharge, updateCharge, refetch };
}
