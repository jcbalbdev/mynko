import { supabase } from '../lib/supabase';
import { useSupabaseCollection } from './useSupabaseCollection';

const ORDER_BY = { column: 'created_at', ascending: true };

function rowToBudget(row) {
  return {
    id:              row.id,
    categoryId:      row.category_id,
    currency:        row.currency ?? 'PEN',
    amount:          Number(row.amount),
    alertPercentage: row.alert_percentage ?? 80,
  };
}

export function useBudgets(userId) {
  const { items: budgets, setItems: setBudgets, loading, refetch } =
    useSupabaseCollection({ userId, table: 'budgets', rowToItem: rowToBudget, orderBy: ORDER_BY });

  const addBudget = async ({ categoryId, currency, amount, alertPercentage = 80 }) => {
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, category_id: categoryId, currency, amount, alert_percentage: alertPercentage },
        { onConflict: 'user_id,category_id,currency' }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    const b = rowToBudget(data);
    setBudgets(prev => {
      const idx = prev.findIndex(x => x.id === b.id);
      return idx >= 0 ? prev.map(x => x.id === b.id ? b : x) : [...prev, b];
    });
    return b;
  };

  const updateBudget = async (id, { amount, alertPercentage }) => {
    const payload = {};
    if (amount          !== undefined) payload.amount           = amount;
    if (alertPercentage !== undefined) payload.alert_percentage = alertPercentage;
    setBudgets(prev => prev.map(b =>
      b.id === id
        ? { ...b, ...(amount !== undefined && { amount }), ...(alertPercentage !== undefined && { alertPercentage }) }
        : b
    ));
    const { error } = await supabase.from('budgets').update(payload).eq('id', id);
    if (error) { refetch(); throw new Error(error.message); }
  };

  const deleteBudget = async (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    await supabase.from('budgets').delete().eq('id', id);
  };

  return { budgets, loading, addBudget, updateBudget, deleteBudget };
}
