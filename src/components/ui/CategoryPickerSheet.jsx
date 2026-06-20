import React, { useMemo, useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { CATEGORIES, getCategoryById } from '../../utils/categories';
import { useActiveCategoriesCtx } from '../../context/UserCategoriesContext';
import './CategoryPicker.css';

export default function CategoryPickerSheet({
  selected,
  onSelect,
  expenses = [],
  userCategories = [],
  onAddPress,
  open,
  onClose,
}) {
  const [query, setQuery] = useState('');

  const allCategories = useMemo(() => {
    const systemCatIds = new Set(CATEGORIES.map(c => c.id));

    const getOverride = (catId) =>
      userCategories.find(c => c.parent_id === '__override__' && c.name === catId)?.color ?? null;

    const generals = CATEGORIES.map(cat => ({
      id:       cat.id,
      label:    cat.label,
      color:    getOverride(cat.id) ?? cat.color,
      bg:       getOverride(cat.id) ?? cat.bg,
      isCustom: false,
    }));

    const customs = userCategories
      .filter(sub => {
        if (sub.parent_id === '__override__') return false;
        if (sub.parent_id === null && systemCatIds.has(sub.name)) return false;
        return true;
      })
      .map(sub => {
        const parentDef = CATEGORIES.find(c => c.id === sub.parent_id);
        const parentCustom = !parentDef ? userCategories.find(c => c.id === sub.parent_id) : null;
        const color = (parentDef ? (getOverride(sub.parent_id) ?? parentDef.color) : parentCustom?.color)
          ?? sub.color ?? '#FEA503';
        const legacyCat = sub.parent_id === null ? getCategoryById(sub.name) : null;
        return {
          id:       sub.id,
          label:    legacyCat?.label ?? sub.name,
          color:    legacyCat ? (getOverride(sub.name) ?? legacyCat.color) : color,
          bg:       legacyCat ? (getOverride(sub.name) ?? legacyCat.bg ?? legacyCat.color) : color,
          parentId: sub.parent_id,
          isCustom: true,
        };
      });

    return [...generals, ...customs];
  }, [userCategories]);

  const activeCategories = useActiveCategoriesCtx();

  const visibleCategories = useMemo(() => {
    const userSubIds = new Set(userCategories.map(c => c.parent_id).filter(Boolean));
    return allCategories.filter(cat => {
      if (cat.isCustom) return true;
      if (activeCategories) return activeCategories.includes(cat.id);
      return userSubIds.has(cat.id);
    });
  }, [allCategories, activeCategories, userCategories]);

  const sortedCategories = useMemo(() => {
    const freq = {};
    for (const e of expenses) {
      if (e.category) freq[e.category] = (freq[e.category] ?? 0) + 1;
    }
    return [...visibleCategories].sort((a, b) => {
      if (a.id === selected) return -1;
      if (b.id === selected) return  1;
      return (freq[b.id] ?? 0) - (freq[a.id] ?? 0);
    });
  }, [visibleCategories, expenses, selected]);

  const displayCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedCategories;
    return sortedCategories.filter(cat =>
      cat.label.toLowerCase().split(/[\s/\-_]+/).some(w => w.startsWith(q))
    );
  }, [sortedCategories, query]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else      document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="catpicker-overlay" onClick={onClose}>
      <div
        className="catpicker-sheet"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Seleccionar categoría"
      >
        <div className="catpicker-handle" />
        <p className="catpicker-title">Categoría</p>

        <div className="catpicker-body">
          {onAddPress && (
            <>
              <button
                type="button"
                className="catpicker-create-btn"
                onClick={onAddPress}
                id="cat-add-new-sheet"
              >
                <Plus size={17} strokeWidth={2.5} />
                <span>Crear subcategoría</span>
              </button>
              <div className="catpicker-separator">
                <span className="catpicker-separator-text">o</span>
              </div>
            </>
          )}

          <input
            className="catpicker-search"
            type="text"
            placeholder="Buscar categoría..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />

          <div className="catpicker-pills-row">
            {displayCategories.map(cat => {
              const isSelected = selected === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`catpicker-pill${isSelected ? ' catpicker-pill--active' : ''}`}
                  style={{ background: cat.color }}
                  onClick={() => {
                    onSelect(cat.id, cat.color, cat.parentId ?? cat.id);
                    onClose();
                  }}
                  id={`cat-sheet-${cat.id}`}
                >
                  {isSelected && (
                    <Check size={11} color="#fff" strokeWidth={3} style={{ flexShrink: 0 }} />
                  )}
                  <span className="catpicker-pill-name">{cat.label}</span>
                </button>
              );
            })}
            {displayCategories.length === 0 && (
              <p className="catpicker-empty">Sin resultados para "{query}"</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
