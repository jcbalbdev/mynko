/**
 * CategoryPickerField.jsx
 * Wraps FormSection + Category Trigger + CategoryPickerSheet + CreateSubcategorySheet.
 */
import React, { useState, useMemo } from 'react';
import FormSection            from './FormSection';
import CategoryPickerSheet    from './CategoryPickerSheet';
import CreateSubcategorySheet from '../CreateSubcategorySheet';
import { useUserCategoriesCtx } from '../../context/UserCategoriesContext';
import { CATEGORIES } from '../../utils/categories';
import './CategoryPicker.css';

export default function CategoryPickerField({
  selected,
  onSelect,
  expenses = [],
  showAddButton = true,
  showCreateSubcat = false,
  onOpenCreate,
  onCloseCreate,
  onCreated,
  label = 'Categoría'
}) {
  const userCategories = useUserCategoriesCtx();
  const [open, setOpen] = useState(false);

  // Find selected category label and color for the trigger button
  const selectedInfo = useMemo(() => {
    if (!selected) return null;
    
    // Check standard categories
    const std = CATEGORIES.find(c => c.id === selected);
    if (std) return { label: std.label, color: std.color };
    
    // Check user categories
    const custom = userCategories.find(c => c.id === selected);
    if (custom) {
      const parent = CATEGORIES.find(p => p.id === custom.parent_id);
      return { label: custom.name, color: custom.color ?? parent?.color ?? '#8e8e93' };
    }
    
    return null;
  }, [selected, userCategories]);

  return (
    <>
      <FormSection label={label}>
        <button
          type="button"
          className="category-picker-trigger"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          id="btn-category-picker"
        >
          {selectedInfo ? (
            <>
              <span
                className="category-picker-color-dot"
                style={{ background: selectedInfo.color }}
              />
              <span className="category-picker-name">{selectedInfo.label}</span>
            </>
          ) : (
            <span className="category-picker-name" style={{ color: '#8e8e93' }}>
              Seleccionar categoría…
            </span>
          )}
          <span className="category-picker-chevron">›</span>
        </button>
      </FormSection>

      <CategoryPickerSheet
        open={open}
        onClose={() => setOpen(false)}
        selected={selected}
        onSelect={onSelect}
        expenses={expenses}
        userCategories={userCategories}
        onAddPress={showAddButton && onOpenCreate ? () => {
          setOpen(false); // close picker when opening create sheet
          onOpenCreate();
        } : undefined}
      />

      {showCreateSubcat && (
        <CreateSubcategorySheet
          onClose={onCloseCreate}
          onCreated={onCreated}
          onSelectExisting={onSelect}
        />
      )}
    </>
  );
}
