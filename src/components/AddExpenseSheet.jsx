/**
 * AddExpenseSheet.jsx
 * Sheet for adding a new expense.
 */
import React, { useState, useRef, useEffect } from 'react';
import './FormSheets.css';
import BaseSheet           from './ui/BaseSheet';
import FormSection         from './ui/FormSection';
import AmountInput         from './ui/AmountInput';
import DateField           from './ui/DateField';
import CategoryPickerField from './ui/CategoryPickerField';
import CurrencyPicker      from './ui/CurrencyPicker';
import SharedDetails       from './ui/SharedDetails';
import DescriptionInput    from './ui/DescriptionInput';
import LocationInput       from './ui/LocationInput';
import AccountPickerField  from './ui/AccountPickerField';
import ToggleGroup         from './ui/ToggleGroup';
import { useTransactionForm } from '../hooks/useTransactionForm';

const EXPENSE_TYPES = [
  { value: 'personal',   label: 'Personal'   },
  { value: 'compartido', label: 'Compartido' },
];

export default function AddExpenseSheet({
  onAdd, onClose,
  defaultCurrency = 'MXN',
  expenses = [],
  onCreateSubcategory,
  initialCategory = '',
  accounts = [],
  initialAccountId = null,
  initialLocation = null,
}) {
  const amountRef = useRef(null);
  const [type,       setType]       = useState('personal');
  const [sharedWith, setSharedWith] = useState('');
  const [sharedOwes, setSharedOwes] = useState('');
  const [splitUsed,  setSplitUsed]  = useState(false);

  const form = useTransactionForm({
    defaultCurrency, expenses, accounts,
    initialCategory, initialAccountId,
    initialLocation: initialLocation ?? '',
    onCreateSubcategory,
  });

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const handleAmountChange = (val) => {
    form.setAmount(val);
    if (splitUsed) {
      const half = parseFloat(val) / 2;
      setSharedOwes(isNaN(half) ? '' : half.toFixed(2));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.isValid) return;
    onAdd(form.buildPayload({
      type,
      ...(type === 'compartido' ? {
        sharedWith: sharedWith.trim(),
        sharedOwes: parseFloat(sharedOwes) || 0,
      } : {}),
    }));
    onClose();
  };

  return (
    <BaseSheet title="Nuevo Gasto" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <AmountInput
          ref={amountRef}
          id="expense-amount"
          value={form.amount}
          onChange={handleAmountChange}
          currency={form.currency}
        />

        <DescriptionInput
          id="expense-desc"
          value={form.description}
          onChange={form.setDescription}
          onPick={form.handleDescriptionPick}
          suggestions={form.descriptionSuggestions}
          placeholder="¿En qué gastaste?"
        />

        <LocationInput
          id="expense-location"
          value={form.location}
          onChange={form.setLocation}
          suggestions={form.locationSuggestions}
          placeholder="Tienda, restaurante, etc."
          maxLength={60}
        />

        <FormSection label="Fecha del gasto">
          <DateField value={form.date} onChange={form.setDate} id="btn-open-calendar" />
        </FormSection>

        <FormSection label="Tipo de gasto">
          <ToggleGroup
            options={EXPENSE_TYPES}
            value={type}
            onChange={setType}
            ariaLabel="Tipo de gasto"
          />
        </FormSection>

        {type === 'compartido' && (
          <SharedDetails
            amount={form.amount}
            sharedWith={sharedWith}
            onSharedWithChange={setSharedWith}
            sharedOwes={sharedOwes}
            onSharedOwesChange={(v) => { setSharedOwes(v); setSplitUsed(false); }}
            onSplitHalf={() => {
              const half = parseFloat(form.amount) / 2;
              setSharedOwes(isNaN(half) ? '' : half.toFixed(2));
              setSplitUsed(true);
            }}
            currency={form.currency}
          />
        )}

        <FormSection label="Moneda">
          <CurrencyPicker selected={form.currency} onSelect={form.setCurrency} />
        </FormSection>

        <AccountPickerField accounts={accounts} value={form.accountId} onChange={form.setAccountId} />

        <CategoryPickerField
          selected={form.category}
          onSelect={form.setCategory}
          expenses={expenses}
          showCreateSubcat={form.showCreateSubcat}
          onOpenCreate={form.openCreateSubcat}
          onCloseCreate={form.closeCreateSubcat}
          onCreated={form.handleCreateSubcategory}
        />

        <button type="submit" className="btn-primary" disabled={!form.isValid} id="btn-add-expense">
          Agregar
        </button>
      </form>
    </BaseSheet>
  );
}
