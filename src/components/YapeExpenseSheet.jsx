import React, { useState, useMemo } from 'react';
import './FormSheets.css';
import BaseSheet           from './ui/BaseSheet';
import FormSection         from './ui/FormSection';
import AmountInput         from './ui/AmountInput';
import DateField           from './ui/DateField';
import CategoryPickerField from './ui/CategoryPickerField';
import CurrencyPicker      from './ui/CurrencyPicker';
import DescriptionInput    from './ui/DescriptionInput';
import LocationInput       from './ui/LocationInput';
import AccountPickerField  from './ui/AccountPickerField';
import { useSubcategoryForm } from '../hooks/useSubcategoryForm';

export default function YapeExpenseSheet({
  yapeExpense,
  onAdd,
  onClose,
  accounts = [],
  expenses = [],
  onCreateSubcategory,
}) {
  const isIngreso = yapeExpense.type === 'ingreso';

  const [amount,      setAmount]      = useState(String(yapeExpense.amount));
  const [description, setDescription] = useState(yapeExpense.description);
  const [location,    setLocation]    = useState('');
  const [currency,    setCurrency]    = useState('PEN');
  const [date,        setDate]        = useState(new Date());
  const [accountId,   setAccountId]   = useState(accounts[0]?.id ?? '');

  const locationSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.location?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const descriptionSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.description?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const {
    category, setCategory, activeColor,
    showCreateSubcat, openCreateSubcat, closeCreateSubcat,
    handleCreateSubcategory,
  } = useSubcategoryForm(onCreateSubcategory, '');

  const handleDescriptionPick = (desc) => {
    const last = expenses
      .filter(e => e.description?.trim() === desc)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!last) return;
    if (last.location)  setLocation(last.location);
    if (last.accountId) setAccountId(last.accountId);
    if (last.category)  setCategory(last.category);
  };

  const isValid = parseFloat(amount) > 0 && category !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({
      amount:      parseFloat(amount),
      description: description.trim(),
      location:    location.trim() || null,
      category,
      color:       activeColor,
      type:        isIngreso ? 'ingreso' : 'personal',
      currency,
      date,
      accountId:   accountId || null,
    });
    onClose();
  };

  return (
    <BaseSheet title={isIngreso ? 'Ingreso con Yape' : 'Pago con Yape'} onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <FormSection label="Monto">
          <AmountInput
            id="yape-amount"
            value={amount}
            onChange={setAmount}
            currency={currency}
          />
        </FormSection>

        <DescriptionInput
          id="yape-desc"
          value={description}
          onChange={setDescription}
          onPick={handleDescriptionPick}
          suggestions={descriptionSuggestions}
          placeholder={isIngreso ? '¿De dónde viene este ingreso?' : '¿En qué gastaste?'}
        />

        <LocationInput
          id="yape-location"
          value={location}
          onChange={setLocation}
          suggestions={locationSuggestions}
          placeholder="Empresa, banco, etc."
          maxLength={60}
        />

        <FormSection label="Fecha">
          <DateField value={date} onChange={setDate} id="btn-open-calendar-yape" />
        </FormSection>

        <FormSection label="Moneda">
          <CurrencyPicker selected={currency} onSelect={setCurrency} />
        </FormSection>

        <AccountPickerField accounts={accounts} value={accountId} onChange={setAccountId} />

        <CategoryPickerField
          selected={category}
          onSelect={setCategory}
          expenses={expenses}
          showCreateSubcat={showCreateSubcat}
          onOpenCreate={openCreateSubcat}
          onCloseCreate={closeCreateSubcat}
          onCreated={handleCreateSubcategory}
        />

        <button type="submit" className="btn-primary" disabled={!isValid} id="btn-save-yape">
          {isIngreso ? 'Registrar ingreso' : 'Registrar gasto'}
        </button>

      </form>
    </BaseSheet>
  );
}
