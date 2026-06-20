import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic hook for a Supabase table scoped to a single user_id.
 * Handles fetch + loading/error state. Returns setItems so callers
 * can implement their own optimistic mutations.
 *
 * @param {object} opts
 * @param {string}   opts.userId
 * @param {string}   opts.table        - Supabase table name
 * @param {function} opts.rowToItem    - Maps a DB row → JS object (default: identity)
 * @param {object}   opts.orderBy      - { column, ascending } (default: created_at ASC)
 */
export function useSupabaseCollection({
  userId,
  table,
  rowToItem = r => r,
  orderBy = { column: 'created_at', ascending: true },
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // rowToItem and orderBy are always module-level constants in callers — stable refs.
  const refetch = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(orderBy.column, { ascending: orderBy.ascending });
    if (fetchErr) setError(fetchErr.message);
    else { setItems(data.map(rowToItem)); setError(null); }
    setLoading(false);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  return { items, setItems, loading, error, refetch };
}
