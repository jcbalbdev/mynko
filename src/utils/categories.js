/* Full color picker — Mynko palette + complementarios */
export const EXPENSE_COLORS = [
  // Rojos
  { id: 'mynko-red',    hex: '#E91933' },
  { id: 'deep-red',     hex: '#C4132A' },
  { id: 'vivid-red',    hex: '#FF0044' },
  { id: 'coral-red',    hex: '#FF4D63' },
  // Rosas cálidos
  { id: 'warm-pink',    hex: '#FF85A1' },
  { id: 'hot-pink',     hex: '#FF6B8A' },
  { id: 'magenta',      hex: '#E91E8C' },
  { id: 'rose-pink',    hex: '#FF3D8A' },
  // Naranjas
  { id: 'orange',       hex: '#FF6B35' },
  { id: 'burnt-orange', hex: '#E8490A' },
  { id: 'red-orange',   hex: '#FF4500' },
  { id: 'soft-orange',  hex: '#FF8C42' },
  // Ámbares
  { id: 'mynko-amber',  hex: '#FEA503' },
  { id: 'dark-amber',   hex: '#D4890A' },
  { id: 'orange-amber', hex: '#FF8C00' },
  { id: 'mid-amber',    hex: '#F59E0B' },
  // Dorados
  { id: 'gold-soft',    hex: '#FFD166' },
  { id: 'gold',         hex: '#FFBE00' },
  { id: 'dark-gold',    hex: '#F0A500' },
  { id: 'peach-gold',   hex: '#FFB347' },
  // Verdes
  { id: 'emerald',      hex: '#10B981' },
  { id: 'green',        hex: '#22C55E' },
  { id: 'dark-green',   hex: '#16A34A' },
  { id: 'lime',         hex: '#84CC16' },
  // Turquesas / Teales
  { id: 'teal',         hex: '#14B8A6' },
  { id: 'cyan',         hex: '#06B6D4' },
  { id: 'aqua',         hex: '#00BCD4' },
  { id: 'mint',         hex: '#2DD4BF' },
  // Azules
  { id: 'sky',          hex: '#38BDF8' },
  { id: 'blue',         hex: '#3B82F6' },
  { id: 'royal-blue',   hex: '#2563EB' },
  { id: 'navy',         hex: '#1E40AF' },
  // Púrpuras
  { id: 'violet',       hex: '#8B5CF6' },
  { id: 'purple',       hex: '#A855F7' },
  { id: 'dark-purple',  hex: '#7C3AED' },
  { id: 'lavender',     hex: '#C084FC' },
];

/* Special category for currency exchanges (not user-selectable) */
export const EXCHANGE_CATEGORY = { id: 'exchange', emoji: '🔄', label: 'Cambio', color: '#FF8C00' };

/* Special category for initial account balance — appears in ingresos */
export const INITIAL_BALANCE_CATEGORY = {
  id:    'initial_balance',
  label: 'Saldo inicial',
  color: '#fff',
  bg:    '#F59E0B',
};

/* Special category for account transfers */
export const TRANSFER_CATEGORY = {
  id:    'transfer',
  label: 'Transferencia',
  color: '#fff',
  bg:    '#5856D6',
};

/* Special category for credit card payments — appears in gastos */
export const CREDIT_PAYMENT_CATEGORY = {
  id:    'credit_payment',
  label: 'Pago de Tarjeta',
  color: '#fff',
  bg:    '#E91933',
};

export const PERIOD_FILTERS = [
  { id: 'week',  label: 'Esta semana' },
  { id: 'month', label: 'Este mes'    },
  { id: 'year',  label: 'Este año'    },
  { id: 'all',   label: 'Todo'        },
];

export const TYPE_FILTERS = [
  { id: 'all',        label: 'Todos'      },
  { id: 'personal',   label: 'Personal'   },
  { id: 'compartido', label: 'Compartido' },
];

/* 5 categorías esenciales — aparecen en pickers y onboarding */
export const CATEGORIES = [
  { id: 'food',          label: 'Comida',          color: '#FEA503', bg: '#FEA503' },
  { id: 'transport',     label: 'Transporte',      color: '#FF4500', bg: '#FF4500' },
  { id: 'health',        label: 'Salud',           color: '#E91933', bg: '#E91933' },
  { id: 'home',          label: 'Hogar',           color: '#FF85A1', bg: '#FF85A1' },
  { id: 'entertainment', label: 'Entretenimiento', color: '#FFD166', bg: '#FFD166' },
];



export const getCategoryById = (id) => {
  if (id === 'exchange')         return EXCHANGE_CATEGORY;
  if (id === 'credit_payment')   return CREDIT_PAYMENT_CATEGORY;
  if (id === 'initial_balance')  return INITIAL_BALANCE_CATEGORY;
  return CATEGORIES.find(c => c.id === id) ?? null;
};

/**
 * Resolves full category info for any id — general or user subcategory UUID.
 * Returns: { id, label, color, bg, parentId? }
 * Never returns null — falls back to a neutral placeholder.
 */
export const resolveCategory = (id, userCategories = []) => {
  if (!id) return { id: '', label: 'Sin categoría', color: '#8e8e93', bg: '#F2F2F7' };
  if (id === 'exchange')        return EXCHANGE_CATEGORY;
  if (id === 'transfer')        return TRANSFER_CATEGORY;
  if (id === 'credit_payment')  return CREDIT_PAYMENT_CATEGORY;
  if (id === 'initial_balance') return INITIAL_BALANCE_CATEGORY;

  // General category — check for user color override
  const general = CATEGORIES.find(c => c.id === id);
  if (general) {
    const override = userCategories.find(c => c.parent_id === '__override__' && c.name === id);
    if (override) return { ...general, color: override.color, bg: override.color };
    return general;
  }

  // User category — custom parent (no parent_id) or subcategory
  const sub = userCategories.find(s => s.id === id);
  if (sub) {
    if (!sub.parent_id) {
      return { id: sub.id, label: sub.name, color: sub.color, bg: sub.color };
    }
    const parentDef = CATEGORIES.find(c => c.id === sub.parent_id);
    const parentOverride = parentDef
      ? userCategories.find(c => c.parent_id === '__override__' && c.name === sub.parent_id)
      : null;
    const parent = parentOverride
      ? { ...parentDef, color: parentOverride.color, bg: parentOverride.color }
      : parentDef ?? userCategories.find(c => c.id === sub.parent_id) ?? { color: '#8e8e93', bg: '#F2F2F7' };
    return {
      id:       sub.id,
      label:    sub.name,
      color:    parent.color,
      bg:       parent.bg ?? parent.color,
      parentId: sub.parent_id,
    };
  }

  // Unknown — neutral
  return { id, label: id, color: '#8e8e93', bg: '#F2F2F7' };
};

export const DONUT_COLORS = [
  '#E91933','#FEA503','#FF6B35','#FF3D8A',
  '#C4132A','#D4890A','#E8490A','#FF6B8A',
  '#FF4D63','#FF8C00','#FF4500','#E91E8C',
  '#FF0044','#FFD166','#FF8C42','#FF85A1',
  '#F59E0B','#FFBE00','#FFB347','#FF4D63',
];

export { friendlyDate as formatDate, formatShortDate, formatTime } from './formatters';
export { getMonthName } from './dates';
