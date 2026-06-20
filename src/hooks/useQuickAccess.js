import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { syncQuickAccessToWidget } from '../lib/widgetBridge';

export function useQuickAccess(userId, expenses) {
  const [quickAccess, setQuickAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  // Builds the payload the widget needs and syncs it to SharedPreferences
  const syncToWidget = useCallback((items) => {
    const payload = items.map(item => {
      const last = expenses
        .filter(e => e.description === item.description)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!last) return null;
      return {
        description:   item.description,
        amount:        last.amount,
        currency:      last.currency,
        type:          last.type,
        category:      last.category,
        color:         last.color ?? '#ccc',
        accountId:     last.accountId ?? null,
      };
    }).filter(Boolean);
    syncQuickAccessToWidget(payload);
  }, [expenses]);

  const fetch = useCallback(async () => {
    if (!userId) { setQuickAccess([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('quick_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error) {
      setQuickAccess(data ?? []);
      syncToWidget(data ?? []);
    }
    setLoading(false);
  }, [userId, syncToWidget]);

  useEffect(() => { fetch(); }, [fetch]);

  const addQuickAccess = async (description) => {
    const { data, error } = await supabase
      .from('quick_access')
      .insert({ user_id: userId, description })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const updated = [...quickAccess, data];
    setQuickAccess(updated);
    syncToWidget(updated);
  };

  const removeQuickAccess = async (description) => {
    const updated = quickAccess.filter(q => q.description !== description);
    setQuickAccess(updated);
    syncToWidget(updated);
    await supabase
      .from('quick_access')
      .delete()
      .eq('user_id', userId)
      .eq('description', description);
  };

  const getLastExpense = useCallback((description) => {
    return expenses
      .filter(e => e.description === description)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] ?? null;
  }, [expenses]);

  const uniqueDescriptions = useCallback(() => {
    const seen = new Set();
    const result = [];
    for (const e of expenses) {
      const desc = e.description?.trim();
      if (desc && !seen.has(desc)) {
        seen.add(desc);
        result.push({ description: desc, expense: e });
      }
    }
    return result;
  }, [expenses]);

  const isQuickAccess = (description) =>
    quickAccess.some(q => q.description === description);

  return {
    quickAccess,
    loading,
    addQuickAccess,
    removeQuickAccess,
    getLastExpense,
    uniqueDescriptions,
    isQuickAccess,
    refetch: fetch,
  };
}
