import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    let listeners = [];

    async function init() {
      const { receive } = await PushNotifications.checkPermissions();

      let finalStatus = receive;
      if (receive === 'prompt') {
        const { receive: granted } = await PushNotifications.requestPermissions();
        finalStatus = granted;
      }

      if (finalStatus !== 'granted') return;

      await PushNotifications.register();

      const regListener = await PushNotifications.addListener(
        'registration',
        async ({ value: token }) => {
          await supabase.from('push_tokens').upsert(
            { user_id: userId, token, platform: 'android' },
            { onConflict: 'user_id,platform' }
          );
        }
      );

      const errListener = await PushNotifications.addListener(
        'registrationError',
        (err) => console.error('[Push] registration error:', err)
      );

      listeners = [regListener, errListener];
    }

    init();

    return () => listeners.forEach((l) => l.remove());
  }, [userId]);
}
