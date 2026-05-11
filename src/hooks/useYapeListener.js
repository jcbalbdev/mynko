import { useEffect, useState, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const YapeNotification = Capacitor.isNativePlatform()
  ? registerPlugin('YapeNotification')
  : null;

function buildExpense(data) {
  const isIngreso = data.type === 'ingreso';
  return {
    amount:      parseFloat(data.amount) || 0,
    description: isIngreso
      ? `Yape de ${data.contact}`
      : data.contact ? `Yape a ${data.contact}` : 'Pago con Yape',
    contact:     data.contact,
    type:        data.type,
    rawText:     data.rawText,
  };
}

export function useYapeListener() {
  const [yapeExpense,   setYapeExpense]   = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  const checkPermission = useCallback(() => {
    YapeNotification?.checkPermission().then(({ granted }) => {
      setHasPermission(granted);
    });
  }, []);

  const checkPending = useCallback(() => {
    YapeNotification?.getPendingPayment().then((data) => {
      if (data?.pending) setYapeExpense(buildExpense(data));
    });
  }, []);

  useEffect(() => {
    if (!YapeNotification) return;

    checkPermission();
    checkPending();

    // Notificación en tiempo real (app en primer plano)
    const listener = YapeNotification.addListener('yapePayment', (data) => {
      setYapeExpense(buildExpense(data));
    });

    // Al volver de Ajustes o desde background
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkPermission();
        checkPending();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      listener.then(h => h.remove());
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkPermission, checkPending]);

  const requestPermission = useCallback(() => {
    YapeNotification?.requestPermission();
  }, []);

  const clearYapeExpense = useCallback(() => {
    setYapeExpense(null);
  }, []);

  return { yapeExpense, hasPermission, requestPermission, clearYapeExpense };
}
