/**
 * formatters.js
 * Canonical formatting utilities for numbers, currencies and dates.
 * All presentation-layer formatting should live here — not scattered across
 * expenses.js, categories.js, or inline in components.
 */
import { getCurrencyByCode, formatAmountWithSymbol } from './currencies';

export { formatAmountWithSymbol, formatWithCurrency } from './currencies';

/** Format a number as a plain locale string (no currency symbol). */
export function formatAmount(amount) {
  if (amount == null || isNaN(amount)) return '0';
  return amount % 1 === 0
    ? amount.toLocaleString('es-MX')
    : amount.toFixed(2);
}

/** toLocaleString wrapper with optional fractionDigits. */
export function formatNumber(n, { fractionDigits = 2 } = {}) {
  return Number(n).toLocaleString('es-MX', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Returns the currency symbol character for a given code (e.g. 'S/' for PEN). */
export function getCurrencySymbol(code) {
  return getCurrencyByCode(code)?.symbol ?? '';
}

/**
 * Splits a number into integer and decimal parts for animated display.
 * e.g. 1234.56 → { intPart: '1,234', centsPart: '.56' }
 */
export function splitAmountDisplay(amount) {
  const n = Number(amount) || 0;
  const intPart   = Math.floor(Math.abs(n)).toLocaleString('es-MX');
  const centsPart = (Math.abs(n) % 1).toFixed(2).slice(1);
  return { intPart, centsPart };
}

/** Canonical friendly-date label: "Hoy", "Ayer", or a full locale string. */
export function friendlyDate(isoString) {
  const d         = new Date(isoString);
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day.getTime() === today.getTime())     return 'Hoy';
  if (day.getTime() === yesterday.getTime()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Short date: "3 ene." */
export function formatShortDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/** Time only: "14:05" */
export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** Label for date fields in forms: "Hoy, 3 de junio" or full weekday+date. */
export function expenseDateLabel(date) {
  const now     = new Date();
  const isToday = date.getDate()     === now.getDate()     &&
                  date.getMonth()    === now.getMonth()    &&
                  date.getFullYear() === now.getFullYear();
  return isToday
    ? `Hoy, ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`
    : date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
