import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic hook for a single-row Supabase settings table (one row per user_id).
 * Fetches on mount, merges with defaults, seeds the row for new users.
 *
 * @param {object} opts
 * @param {string}   opts.userId
 * @param {string}   opts.table
 * @param {object}   opts.defaults      - Default values for new/missing rows
 * @param {string}   [opts.onConflict]  - Conflict column for upsert (default: 'user_id')
 * @param {function} [opts.onNewUser]   - (defaults) => initialSettings — override for new users
 */
export function useSupabaseSettings({
  userId,
  table,
  defaults,
  onConflict = 'user_id',
  onNewUser,
}) {
  const [settings, setSettings] = useState(defaults);
  const [loading,  setLoading]  = useState(true);

  // defaults, onConflict, onNewUser are always module-level constants in callers — stable refs.
  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setSettings({ ...defaults, ...data });
    } else {
      const initial = onNewUser ? onNewUser(defaults) : defaults;
      setSettings(initial);
      await supabase.from(table).upsert({ user_id: userId, ...initial }, { onConflict });
    }
    setLoading(false);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  const update = useCallback(async (patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
    await supabase.from(table).upsert({ user_id: userId, ...patch }, { onConflict });
  }, [userId, table, onConflict]);

  return { settings, setSettings, loading, update, refetch };
}
