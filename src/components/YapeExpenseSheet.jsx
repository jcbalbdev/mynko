import React, { useRef } from 'react';
import './FormSheets.css';
import BaseSheet              from './ui/BaseSheet';
import TransactionFormFields  from './ui/TransactionFormFields';
import { useTransactionForm } from '../hooks/useTransactionForm';

export default function YapeExpenseSheet({
  yapeExpense, onAdd, onClose,
  accounts = [], expenses = [], onCreateSubcategory,
}) {
  const isIngreso = yapeExpense.type === 'ingreso';
  const amountRef = useRef(null);

  const form = useTransactionForm({
    defaultCurrency: 'PEN',
    expenses, accounts, onCreateSubcategory,
    initialAmount:      String(yapeExpense.amount),
    initialDescription: yapeExpense.description,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.isValid) return;
    onAdd(form.buildPayload({ type: isIngreso ? 'ingreso' : 'personal' }));
    onClose();
  };

  return (
    <BaseSheet title={isIngreso ? 'Ingreso con Yape' : 'Pago con Yape'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TransactionFormFields
          amountRef={amountRef}
          amount={form.amount}           onAmountChange={form.setAmount}
          description={form.description} onDescriptionChange={form.setDescription}
          onDescriptionPick={form.handleDescriptionPick}
          descriptionSuggestions={form.descriptionSuggestions}
          descriptionPlaceholder={isIngreso ? '¿De dónde viene este ingreso?' : '¿En qué gastaste?'}
          location={form.location}       onLocationChange={form.setLocation}
          locationSuggestions={form.locationSuggestions}
          locationPlaceholder="Empresa, banco, etc."
          date={form.date}               onDateChange={form.setDate}
          dateLabel="Fecha"              dateId="btn-open-calendar-yape"
          currency={form.currency}       onCurrencyChange={form.setCurrency}
          accounts={accounts}            accountId={form.accountId}  onAccountIdChange={form.setAccountId}
          expenses={expenses}
          category={form.category}       onCategoryChange={form.setCategory}
          showCreateSubcat={form.showCreateSubcat}
          onOpenCreate={form.openCreateSubcat}   onCloseCreate={form.closeCreateSubcat}
          onCreated={form.handleCreateSubcategory}
        />
        <button type="submit" className="btn-primary" disabled={!form.isValid} id="btn-save-yape">
          {isIngreso ? 'Registrar ingreso' : 'Registrar gasto'}
        </button>
      </form>
    </BaseSheet>
  );
}
