/**
 * AddIncomeSheet.jsx
 * Sheet for registering a personal income record.
 */
import React, { useRef } from 'react';
import './FormSheets.css';
import BaseSheet              from './ui/BaseSheet';
import TransactionFormFields  from './ui/TransactionFormFields';
import { useTransactionForm } from '../hooks/useTransactionForm';

export default function AddIncomeSheet({
  onAdd, onClose,
  defaultCurrency = 'MXN',
  expenses = [],
  onCreateSubcategory,
  initialCategory = '',
  accounts = [],
}) {
  const amountRef = useRef(null);
  const form = useTransactionForm({
    defaultCurrency, expenses, accounts, initialCategory, onCreateSubcategory,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.isValid) return;
    onAdd(form.buildPayload({ type: 'ingreso' }));
    onClose();
  };

  return (
    <BaseSheet title="Nuevo Ingreso" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TransactionFormFields
          amountRef={amountRef}
          amount={form.amount}           onAmountChange={form.setAmount}
          description={form.description} onDescriptionChange={form.setDescription}
          onDescriptionPick={form.handleDescriptionPick}
          descriptionSuggestions={form.descriptionSuggestions}
          descriptionPlaceholder="¿De dónde viene este ingreso?"
          location={form.location}       onLocationChange={form.setLocation}
          locationSuggestions={form.locationSuggestions}
          locationPlaceholder="Empresa, banco, etc."
          date={form.date}               onDateChange={form.setDate}
          dateLabel="Fecha"              dateId="btn-open-calendar-income"
          currency={form.currency}       onCurrencyChange={form.setCurrency}
          accounts={accounts}            accountId={form.accountId}  onAccountIdChange={form.setAccountId}
          expenses={expenses}
          category={form.category}       onCategoryChange={form.setCategory}
          showCreateSubcat={form.showCreateSubcat}
          onOpenCreate={form.openCreateSubcat}   onCloseCreate={form.closeCreateSubcat}
          onCreated={form.handleCreateSubcategory}
        />
        <button type="submit" className="btn-primary" disabled={!form.isValid} id="btn-confirm-add-income">
          Registrar ingreso
        </button>
      </form>
    </BaseSheet>
  );
}
