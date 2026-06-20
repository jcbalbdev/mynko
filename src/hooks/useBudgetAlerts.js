import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { resolveCategory } from '../utils/categories';
import { getCurrencyByCode } from '../utils/currencies';

const SKIP_CATEGORIES = new Set(['credit_payment', 'initial_balance', 'exchange']);

function alertKey(budgetId, year, month, pct) {
  return `budget_alert_${budgetId}_${year}_${month}_${pct}`;
}

async function fireNotification(title, body) {
  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.requestPermissions();
      if (display !== 'granted') return;
      await LocalNotifications.schedule({
        notifications: [{
          id:       (Date.now() & 0x7fffffff),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
        }],
      });
    } else if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification(title, { body });
    }
  } catch (err) {
    console.warn('[useBudgetAlerts]', err);
  }
}

export function useBudgetAlerts({ expenses, budgets, userCategories }) {
  useEffect(() => {
    if (localStorage.getItem('budget_alerts_enabled') === 'false') return;
    if (!budgets.length || !expenses.length) return;

    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return (
        d.getFullYear() === year &&
        d.getMonth()    === month &&
        e.type          !== 'ingreso' &&
        !SKIP_CATEGORIES.has(e.category)
      );
    });

    for (const budget of budgets) {
      // Subcategory budgets use exact match; parent budgets include all children
      const isSub = userCategories.some(
        c => c.id === budget.categoryId && c.parent_id && c.parent_id !== '__override__'
      );

      const catExpenses = monthExpenses.filter(e => {
        const catMatch = isSub
          ? e.category === budget.categoryId
          : (e.category === budget.categoryId ||
             userCategories.find(c => c.id === e.category)?.parent_id === budget.categoryId);
        return catMatch && e.currency === budget.currency;
      });

      const spent = catExpenses.reduce((s, e) => s + e.amount, 0);
      const pct   = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const info  = resolveCategory(budget.categoryId, userCategories);
      const fmt   = (n) => n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const sym   = getCurrencyByCode(budget.currency)?.symbol ?? budget.currency;

      if (pct >= budget.alertPercentage) {
        const key = alertKey(budget.id, year, month, budget.alertPercentage);
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1');
          fireNotification(
            `⚠️ ${info.label} al ${Math.round(pct)}% del presupuesto`,
            `Llevas ${sym} ${fmt(spent)} de ${sym} ${fmt(budget.amount)} este mes.`
          );
        }
      }

      if (pct >= 100) {
        const key = alertKey(budget.id, year, month, 100);
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1');
          fireNotification(
            `🚨 ${info.label}: presupuesto superado`,
            `Gastaste ${sym} ${fmt(spent)} de ${sym} ${fmt(budget.amount)} este mes.`
          );
        }
      }
    }
  }, [expenses, budgets, userCategories]);
}
