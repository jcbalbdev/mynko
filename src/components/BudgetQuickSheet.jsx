import React from 'react';
import BaseSheet from './ui/BaseSheet';
import { BudgetDetailView } from './BudgetsManagerView';
import './BudgetsManagerView.css';
import { resolveCategory } from '../utils/categories';

export default function BudgetQuickSheet({
  categoryId,
  budgets,
  userCategories,
  expenses,
  defaultCurrency = 'PEN',
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}) {
  const isSubcat = userCategories.some(
    uc => uc.id === categoryId && uc.parent_id && uc.parent_id !== '__override__'
  );
  const info  = resolveCategory(categoryId, userCategories);
  const title = (
    <span className="budget-header-pill" style={{ background: info.color }}>
      {info.label}
    </span>
  );

  return (
    <BaseSheet title={title} onClose={onClose}>
      <BudgetDetailView
        categoryId={categoryId}
        budgets={budgets}
        userCategories={userCategories}
        expenses={expenses}
        exactMatch={isSubcat}
        defaultCurrency={defaultCurrency}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </BaseSheet>
  );
}
