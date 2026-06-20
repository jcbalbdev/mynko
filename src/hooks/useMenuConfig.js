import { useState, useCallback } from 'react';

const DEFAULT_ORDER = [
  'gastos', 'ingresos', 'deudas', 'credito',
  'balance', 'cambio', 'cuentas', 'recurrentes', 'rapido',
];
const STORAGE_KEY = 'happywallet_menu_config';

export function useMenuConfig() {
  const [config, setConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const order = Array.isArray(parsed.order) ? [...parsed.order] : [...DEFAULT_ORDER];
        DEFAULT_ORDER.forEach(id => { if (!order.includes(id)) order.push(id); });
        return { order, hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [] };
      }
    } catch {}
    return { order: DEFAULT_ORDER, hidden: [] };
  });

  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  };

  const toggleHidden = useCallback((id) => {
    setConfig(prev => {
      const hidden = prev.hidden.includes(id)
        ? prev.hidden.filter(h => h !== id)
        : [...prev.hidden, id];
      return persist({ ...prev, hidden });
    });
  }, []);

  const reorder = useCallback((newOrder) => {
    setConfig(prev => persist({ ...prev, order: newOrder }));
  }, []);

  return { config, toggleHidden, reorder };
}
