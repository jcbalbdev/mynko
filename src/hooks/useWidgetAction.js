import { useEffect, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const WidgetBridge = Capacitor.isNativePlatform()
  ? registerPlugin('WidgetBridge')
  : null;

export function useWidgetAction(onRegister, onNavigate) {
  const checkPending = useCallback(async () => {
    if (!WidgetBridge) return;
    try {
      const result = await WidgetBridge.getPendingAction();
      if (result?.action === 'register' && result?.description) {
        onRegister(result.description);
      }
      if (result?.navigate && onNavigate) {
        onNavigate(result.navigate);
      }
    } catch {
      // Plugin not available
    }
  }, [onRegister, onNavigate]);

  useEffect(() => {
    if (!WidgetBridge) return;

    checkPending();

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkPending();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [checkPending]);
}
