import { useCallback } from 'react';
import { useSupabaseSettings } from './useSupabaseSettings';

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
  const { settings, loading, update } = useSupabaseSettings({
    userId, table: 'notification_settings', defaults: DEFAULTS,
  });

  const toggle = useCallback(async (key) => {
    await update({ [key]: !settings[key] });
  }, [settings, update]);

  return { settings, loading, toggle };
}
