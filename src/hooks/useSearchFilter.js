import { useState, useMemo, useCallback } from 'react';
import { CATEGORIES } from '../utils/categories';

const MONTHS_CAP = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// 3 = exact, 2 = starts with, 1 = word boundary starts with, 0 = no match
// For queries < 3 chars, only scores 2-3 are accepted (avoids noise like "an" → "Transporte")
function scoreMatch(text, q) {
  const t = text.toLowerCase();
  if (t === q) return 3;
  if (t.startsWith(q)) return 2;
  if (t.split(/[\s/\-_]+/).some(w => w.startsWith(q))) return 1;
  return 0;
}

export function useSearchFilter(expenses, userCategories, periodMode) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState([]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const minScore = q.length < 3 ? 2 : 1;
    const results = [];
    const seen = new Set();

    /* ── Date suggestions — calendar-based, no need for existing expenses ── */
    if (periodMode?.type === 'month' && /^\d{1,2}$/.test(q)) {
      const dayNum = parseInt(q, 10);
      const { month, year } = periodMode;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        const dateId = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        results.push({ id: dateId, label: `${dayNum} de ${MONTHS_CAP[month]}`, type: 'date', color: '#5C6BC0', score: 3 });
      }
    }

    /* ── Category suggestions ── */
    CATEGORIES.forEach(cat => {
      const score = scoreMatch(cat.label, q);
      if (score >= minScore && !seen.has(cat.id)) {
        seen.add(cat.id);
        results.push({ id: cat.id, label: cat.label, type: 'category', color: cat.bg, score });
      }
    });

    /* ── Subcategory suggestions ── */
    userCategories.forEach(sub => {
      const key = 'sub_' + sub.id;
      const score = scoreMatch(sub.name, q);
      if (score >= minScore && !seen.has(key)) {
        seen.add(key);
        const parent = CATEGORIES.find(c => c.id === sub.parent_id);
        results.push({ id: sub.id, label: sub.name, type: 'subcategory', color: parent?.bg ?? '#8e8e93', score });
      }
    });

    /* ── Description suggestions ── */
    const descSeen = new Set();
    expenses.forEach(e => {
      const desc = e.description?.trim();
      if (!desc) return;
      const score = scoreMatch(desc, q);
      if (score >= minScore && !descSeen.has(desc.toLowerCase())) {
        descSeen.add(desc.toLowerCase());
        results.push({ id: desc, label: desc, type: 'description', color: '#8e8e93', score });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, expenses, userCategories, periodMode]);

  const addTag = useCallback((suggestion) => {
    setTags(prev => {
      if (prev.find(t => t.id === suggestion.id && t.type === suggestion.type)) return prev;
      return [...prev, suggestion];
    });
    setQuery('');
  }, []);

  const removeTag = useCallback((id, type) => {
    setTags(prev => prev.filter(t => !(t.id === id && t.type === type)));
  }, []);

  const openSearch  = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => { setSearchOpen(false); setQuery(''); }, []);

  return {
    searchOpen, openSearch, closeSearch,
    query, setQuery,
    tags, addTag, removeTag,
    suggestions,
  };
}
