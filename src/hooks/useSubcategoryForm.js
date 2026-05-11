/**
 * useSubcategoryForm.js
 * Encapsulates the repeated category selection + subcategory creation logic
 * that was duplicated across AddExpenseSheet, AddIncomeSheet, AddDebtSheet.
 *
 * @param {Function} onCreateSubcategory - callback to persist a new subcategory
 * @param {string}   initialCategory     - pre-selected category id (quick-add flow)
 */
import { useState } from 'react';
import { resolveCategory } from '../utils/categories';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

export function useSubcategoryForm(onCreateSubcategory, initialCategory = '') {
  const userCategories = useUserCategoriesCtx();
  const [category,         setCategory]         = useState(initialCategory);
  const [showCreateSubcat, setShowCreateSubcat]  = useState(false);

  /** Solid color of the selected category (for legacy fields that still store color) */
  const activeColor = resolveCategory(category, userCategories)?.color ?? '#8e8e93';

  /** Creates a subcategory and auto-selects it */
  const handleCreateSubcategory = async (name, parentId) => {
    if (!onCreateSubcategory) return;
    const result = await onCreateSubcategory(name, parentId);
    if (!result?.error && result?.data) {
      setCategory(result.data.id);
    }
    return result;
  };

  return {
    category,
    setCategory,
    activeColor,
    showCreateSubcat,
    openCreateSubcat:  () => setShowCreateSubcat(true),
    closeCreateSubcat: () => setShowCreateSubcat(false),
    handleCreateSubcategory,
  };
}
