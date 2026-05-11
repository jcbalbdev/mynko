/* Pastel colors for expense bars (user-selectable) */
export const EXPENSE_COLORS = [
  { id: 'peach',      hex: '#FFDAB3' },
  { id: 'sky',        hex: '#B3D9FF' },
  { id: 'pink',       hex: '#FFB3C8' },
  { id: 'mint',       hex: '#B3F0CE' },
  { id: 'lavender',   hex: '#D4B3FF' },
  { id: 'yellow',     hex: '#FFE8A3' },
  { id: 'coral',      hex: '#FFB3A3' },
  { id: 'ice',        hex: '#A3E8FF' },
  { id: 'rose',       hex: '#FFD4EE' },
  { id: 'lime',       hex: '#C8F0B3' },
  { id: 'sand',       hex: '#F0D4B3' },
  { id: 'periwinkle', hex: '#B3C6FF' },
];

/* Special category for currency exchanges (not user-selectable) */
export const EXCHANGE_CATEGORY = { id: 'exchange', emoji: '🔄', label: 'Cambio', color: '#B3F0CE' };

/* Special category for initial account balance — appears in ingresos */
export const INITIAL_BALANCE_CATEGORY = {
  id:    'initial_balance',
  label: 'Saldo inicial',
  color: '#fff',
  bg:    '#34A853',
};

/* Special category for credit card payments — appears in gastos */
export const CREDIT_PAYMENT_CATEGORY = {
  id:    'credit_payment',
  label: 'Pago de Tarjeta',
  color: '#fff',
  bg:    '#7C3AED',
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

export const CATEGORIES = [
  // 🟡 Familia Amarilla — #FBBC04
  { id: 'food',          label: 'Alimentación',    color: '#FBBC04', bg: '#FBBC04' }, // Google Yellow
  { id: 'services',      label: 'Servicios',       color: '#F57C00', bg: '#F57C00' }, // Ámbar-naranja
  { id: 'entertainment', label: 'Entretenimiento', color: '#FF8F00', bg: '#FF8F00' }, // Ámbar oscuro
  { id: 'family',        label: 'Familia',         color: '#E65100', bg: '#E65100' }, // Naranja profundo

  // 🔵 Familia Azul — #4285F4
  { id: 'education',     label: 'Educación',       color: '#4285F4', bg: '#4285F4' }, // Google Blue
  { id: 'work',          label: 'Trabajo',         color: '#1A73E8', bg: '#1A73E8' }, // Azul denso
  { id: 'technology',    label: 'Tecnología',      color: '#5C6BC0', bg: '#5C6BC0' }, // Índigo
  { id: 'transport',     label: 'Transporte',      color: '#039BE5', bg: '#039BE5' }, // Azul cielo

  // 🟢 Familia Verde — #34A853
  { id: 'savings',       label: 'Finanzas',        color: '#34A853', bg: '#34A853' }, // Google Green
  { id: 'home',          label: 'Vivienda',        color: '#00897B', bg: '#00897B' }, // Verde teal
  { id: 'donations',     label: 'Mascotas',        color: '#7CB342', bg: '#7CB342' }, // Verde lima
  { id: 'travel',        label: 'Viajes',          color: '#43A047', bg: '#43A047' }, // Verde medio

  // 🔴 Familia Roja — #EA4335
  { id: 'health',        label: 'Salud',           color: '#EA4335', bg: '#EA4335' }, // Google Red
  { id: 'unexpected',    label: 'Imprevistos',     color: '#C62828', bg: '#C62828' }, // Rojo oscuro
  { id: 'shopping',      label: 'Compras',         color: '#FF6D00', bg: '#FF6D00' }, // Naranja-rojo
  { id: 'clothing',      label: 'Vestimenta',      color: '#F06292', bg: '#F06292' }, // Rosa
];


export const getCategoryById = (id) => {
  if (id === 'exchange')         return EXCHANGE_CATEGORY;
  if (id === 'credit_payment')   return CREDIT_PAYMENT_CATEGORY;
  if (id === 'initial_balance')  return INITIAL_BALANCE_CATEGORY;
  return CATEGORIES.find(c => c.id === id) || null;
};

/**
 * Resolves full category info for any id — general or user subcategory UUID.
 * Returns: { id, label, color, bg, parentId? }
 * Never returns null — falls back to a neutral placeholder.
 */
export const resolveCategory = (id, userCategories = []) => {
  if (!id) return { id: '', label: 'Sin categoría', color: '#8e8e93', bg: '#F2F2F7' };
  if (id === 'exchange')        return EXCHANGE_CATEGORY;
  if (id === 'credit_payment')  return CREDIT_PAYMENT_CATEGORY;
  if (id === 'initial_balance') return INITIAL_BALANCE_CATEGORY;

  // General category
  const general = CATEGORIES.find(c => c.id === id);
  if (general) return general;

  // User subcategory — inherit parent's colors, use sub's own name
  const sub = userCategories.find(s => s.id === id);
  if (sub) {
    const parent = CATEGORIES.find(c => c.id === sub.parent_id) ?? { color: '#8e8e93', bg: '#F2F2F7' };
    return {
      id:       sub.id,
      label:    sub.name,
      color:    parent.color,
      bg:       parent.bg,
      parentId: sub.parent_id,
    };
  }

  // Unknown — neutral
  return { id, label: id, color: '#8e8e93', bg: '#F2F2F7' };
};

export const DONUT_COLORS = [
  '#007AFF','#34C759','#FF9500','#FF3B30',
  '#5856D6','#FF2D55','#AF52DE','#5AC8FA',
  '#FFCC00','#3C3C43','#5AC8FA','#8E8E93',
];

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (date.getTime() === today.getTime()) return 'Hoy';
  if (date.getTime() === yesterday.getTime()) return 'Ayer';

  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function groupByDate(expenses) {
  const groups = {};
  expenses.forEach(e => {
    const key = formatDate(e.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

export function getMonthName(month, year) {
  return new Date(year, month, 1).toLocaleDateString('es-MX', {
    month: 'long', year: 'numeric'
  });
}
