import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULTS = {
  weekly_summary:               true,
  weekly_compare:               true,
  daily_morning:                true,
  daily_night:                  true,
  month_close:                  true,
  positive_balance:             true,
  streak:                       true,
  re_engagement:                true,
  recurring_reminder:           true,
  subscription_before_3days:    true,
  subscription_before_1day:     true,
  subscription_charged:         true,
  subscription_annual_milestone: true,
  subscription_annual_expiry:   true,
};

export function useNotificationSettings(userId) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading,  setLoading]  = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setSettings({ ...DEFAULTS, ...data });
    } else {
      // First time — insert defaults
      await supabase.from('notification_settings').insert({ user_id: userId, ...DEFAULTS });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const toggle = useCallback(async (key) => {
    const next = !settings[key];
    setSettings(prev => ({ ...prev, [key]: next }));
    await supabase
      .from('notification_settings')
      .upsert({ user_id: userId, [key]: next }, { onConflict: 'user_id' });
  }, [settings, userId]);

  return { settings, loading, toggle };
}
