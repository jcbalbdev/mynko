import { registerPlugin } from '@capacitor/core';

const WidgetBridge = registerPlugin('WidgetBridge');

/**
 * Syncs the quick access list to Android SharedPreferences
 * so the home screen widget can read and display them.
 * Each item: { description, amount, currency, type, categoryLabel, categoryColor, accountId }
 */
export async function syncQuickAccessToWidget(items) {
  try {
    await WidgetBridge.syncQuickAccess({ data: JSON.stringify(items) });
  } catch {
    // Silently ignore — not on Android or widget not installed yet
  }
}

export async function syncAuthToWidget({ url, anonKey, userId, token, refreshToken }) {
  try {
    await WidgetBridge.syncAuth({ url, anonKey, userId, token, refreshToken: refreshToken ?? '' });
  } catch {
    // Silently ignore
  }
}
