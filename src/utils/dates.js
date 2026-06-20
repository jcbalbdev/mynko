/**
 * dates.js
 * Canonical date constants and helpers.
 * MONTHS is the single source of truth — do not redeclare it in hooks or components.
 */

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Convert a Date (or existing ISO string) to a 'YYYY-MM-DD' string for Supabase.
 * Returns null when date is null/undefined (safe for optional date fields).
 * Pass toDateString(new Date()) to get today's date.
 */
export function toDateString(date) {
  if (date == null) return null;
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return String(date).slice(0, 10);
}

/** Returns true when dateStr falls within the given year+month (0-indexed). */
export function isSameMonth(dateStr, year, month) {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

/** "junio 2025" – used by period labels and history screen headers. */
export function getMonthName(month, year) {
  return new Date(year, month, 1).toLocaleDateString('es-MX', {
    month: 'long', year: 'numeric',
  });
}
