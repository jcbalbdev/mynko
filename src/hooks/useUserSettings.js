import { useSupabaseSettings } from './useSupabaseSettings';
import { detectDefaultCurrency } from '../utils/currencies';

const DEFAULTS = {
  default_currency: detectDefaultCurrency(),
};

function onNewUser(defaults) {
  return { ...defaults, default_currency: detectDefaultCurrency() };
}

export function useUserSettings(userId) {
  const { settings, loading, update } = useSupabaseSettings({
    userId, table: 'user_settings', defaults: DEFAULTS, onNewUser,
  });

  const updateSetting = (key, value) => update({ [key]: value });

  return { settings, loading, updateSetting };
}
