/**
 * useUserSettings.js
 * Reads and writes per-user settings (e.g. default_currency) from Supabase.
 * Uses upsert so the row is created on first write.
 * For new accounts: auto-detects default currency from device locale.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase }               from '../lib/supabase';
import { detectDefaultCurrency }  from '../utils/currencies';

const DEFAULTS = {
  default_currency: detectDefaultCurrency(), // auto-detect from device locale
};

export function useUserSettings(userId) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading,  setLoading]  = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      // Existing account: use saved settings
      setSettings({ ...DEFAULTS, ...data });
    } else {
      // New account: save detected currency to DB immediately
      const detected = detectDefaultCurrency();
      const initial = { ...DEFAULTS, default_currency: detected };
      setSettings(initial);
      await supabase.from('user_settings').upsert({
        user_id: userId,
        ...initial,
      });
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next); // optimistic
    await supabase.from('user_settings').upsert({
      user_id: userId,
      ...next,
    });
  };

  return { settings, loading, updateSetting };
}
