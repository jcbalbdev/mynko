/**
 * useGroupedByDate.js
 * Memoized hook that groups an array of records by friendly date label.
 * Replaces the repeated useMemo+groupByDate pattern in 6 list views.
 */
import { useMemo } from 'react';
import { friendlyDate } from '../utils/formatters';

/**
 * @param {object[]} records - Array already sorted by date descending.
 * @returns {{ grouped: Record<string, object[]>, dateKeys: string[] }}
 */
export function useGroupedByDate(records) {
  const grouped = useMemo(() => {
    const map = {};
    [...(records ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
      const key = friendlyDate(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [records]);

  const dateKeys = Object.keys(grouped);

  return { grouped, dateKeys };
}
