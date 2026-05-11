import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useQuickAccess(userId, expenses) {
  const [quickAccess, setQuickAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setQuickAccess([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('quick_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error) setQuickAccess(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addQuickAccess = async (description) => {
    const { data, error } = await supabase
      .from('quick_access')
      .insert({ user_id: userId, description })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setQuickAccess(prev => [...prev, data]);
  };

  const removeQuickAccess = async (description) => {
    setQuickAccess(prev => prev.filter(q => q.description !== description));
    await supabase
      .from('quick_access')
      .delete()
      .eq('user_id', userId)
      .eq('description', description);
  };

  // Para cada acceso rápido, busca el último expense con esa descripción
  const getLastExpense = useCallback((description) => {
    return expenses
      .filter(e => e.description === description)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] ?? null;
  }, [expenses]);

  // Lista de descripciones únicas del historial (para el picker)
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
