/**
 * CategoryPickerSheet.jsx
 * iOS-style bottom sheet for selecting a category.
 */
import React, { useMemo, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { CATEGORIES } from '../../utils/categories';
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
  /* Build combined list: general categories + user subcategories */
  const allCategories = useMemo(() => {
    const generals = CATEGORIES.map(cat => ({
      id:       cat.id,
      label:    cat.label,
      color:    cat.color,   // solid — used for dots / data
      bg:       cat.bg,      // pastel — used for selected pill background
      isCustom: false,
    }));

    const customs = userCategories.map(sub => {
      // Find parent category to get its bg
      const parent = CATEGORIES.find(c => c.id === sub.parent_id);
      return {
        id:       sub.id,
        label:    sub.name,
        color:    sub.color ?? parent?.color,
        bg:       parent?.bg ?? '#F5F5F5',
        parentId: sub.parent_id,
        isCustom: true,
      };
    });

    return [...generals, ...customs];
  }, [userCategories]);

  /* Sort: selected first, then by frequency, then rest */
  const sortedCategories = useMemo(() => {
    const freq = {};
    for (const e of expenses) {
      if (e.category) freq[e.category] = (freq[e.category] ?? 0) + 1;
    }

    return [...allCategories].sort((a, b) => {
      // Selected item always first
      if (a.id === selected) return -1;
      if (b.id === selected) return  1;
      // Then by frequency
      return (freq[b.id] ?? 0) - (freq[a.id] ?? 0);
    });
  }, [allCategories, expenses, selected]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else      document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
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

        <div className="catpicker-grid">
          {onAddPress && (
            <div className="catpicker-add-wrap">
              <button
                type="button"
                className="catpicker-add-btn"
                onClick={onAddPress}
                id="cat-add-new-sheet"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Crear subcategoría</span>
              </button>
            </div>
          )}

          {sortedCategories.map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`catpicker-cell${isSelected ? ' catpicker-cell--active' : ''}`}
                style={{ background: cat.color }}
                onClick={() => {
                  onSelect(cat.id, cat.color, cat.parentId ?? cat.id);
                  onClose();
                }}
                id={`cat-sheet-${cat.id}`}
              >
                {isSelected && (
                  <span className="catpicker-cell-check">
                    <Check size={11} color="#007aff" strokeWidth={3} />
                  </span>
                )}
                <span className="catpicker-cell-name">{cat.label}</span>
                {cat.isCustom && <span className="catpicker-cell-badge">Personal</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
