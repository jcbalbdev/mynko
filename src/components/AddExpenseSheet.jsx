/**
 * AddExpenseSheet.jsx
 * Sheet for adding a new expense.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import './FormSheets.css';
import BaseSheet       from './ui/BaseSheet';
import FormSection     from './ui/FormSection';
import AmountInput     from './ui/AmountInput';
import DateField       from './ui/DateField';
import CategoryPickerField from './ui/CategoryPickerField';
import CurrencyPicker  from './ui/CurrencyPicker';
import SharedDetails   from './ui/SharedDetails';
import DescriptionInput from './ui/DescriptionInput';
import LocationInput   from './ui/LocationInput';
import { useSubcategoryForm } from '../hooks/useSubcategoryForm';
import AccountPickerField from './ui/AccountPickerField';

export default function AddExpenseSheet({ onAdd, onClose, defaultCurrency = 'MXN', expenses = [], onCreateSubcategory, initialCategory = '', accounts = [], initialAccountId = null, initialLocation = null }) {
  const [amount,     setAmount]     = useState('');
  const [description,setDescription]= useState('');
  const [location,   setLocation]   = useState(initialLocation ?? '');

  const locationSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.location?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const descriptionSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.description?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);
  const [type,       setType]       = useState('personal');
  const [currency,   setCurrency]   = useState(defaultCurrency);
  const [sharedWith, setSharedWith] = useState('');
  const [sharedOwes, setSharedOwes] = useState('');
  const [splitUsed,  setSplitUsed]  = useState(false);
  const [date,       setDate]       = useState(new Date());
  const [accountId,  setAccountId]  = useState(
    accounts.some(a => a.id === initialAccountId) ? initialAccountId : (accounts[0]?.id ?? '')
  );
  const handleDescriptionPick = (desc) => {
    const last = expenses
      .filter(e => e.description?.trim() === desc)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!last) return;
    if (last.location)  setLocation(last.location);
    if (last.accountId) setAccountId(last.accountId);
    if (last.category)  setCategory(last.category);
  };

  const amountRef = useRef(null);

  const {
    category, setCategory, activeColor,
    showCreateSubcat, openCreateSubcat, closeCreateSubcat,
    handleCreateSubcategory,
  } = useSubcategoryForm(onCreateSubcategory, initialCategory);


  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const handleAmountChange = (val) => {
    setAmount(val);
    if (splitUsed) {
      const half = parseFloat(val) / 2;
      setSharedOwes(isNaN(half) ? '' : half.toFixed(2));
    }
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
      type,
      currency,
      date,
      accountId:   accountId || null,
      ...(type === 'compartido' ? {
        sharedWith: sharedWith.trim(),
        sharedOwes: parseFloat(sharedOwes) || 0,
      } : {}),
    });
    onClose();
  };

  return (
    <>
      <BaseSheet title="Nuevo Gasto" onClose={onClose}>
        <form onSubmit={handleSubmit}>

          <AmountInput
            ref={amountRef}
            id="expense-amount"
            value={amount}
            onChange={handleAmountChange}
            currency={currency}
          />

          <DescriptionInput
            id="expense-desc"
            value={description}
            onChange={setDescription}
            onPick={handleDescriptionPick}
            suggestions={descriptionSuggestions}
            placeholder="¿En qué gastaste?"
          />

          <LocationInput
            id="expense-location"
            value={location}
            onChange={setLocation}
            suggestions={locationSuggestions}
            placeholder="Tienda, restaurante, etc."
            maxLength={60}
          />

          <FormSection label="Fecha del gasto">
            <DateField value={date} onChange={setDate} id="btn-open-calendar" />
          </FormSection>

          <FormSection label="Tipo de gasto">
            <div className="type-toggle" role="group" aria-label="Tipo de gasto">
              <button type="button" id="type-personal"
                className={`type-btn${type === 'personal' ? ' active' : ''}`}
                onClick={() => setType('personal')}
              >Personal</button>
              <button type="button" id="type-compartido"
                className={`type-btn${type === 'compartido' ? ' active' : ''}`}
                onClick={() => setType('compartido')}
              >Compartido</button>
            </div>
          </FormSection>

          {type === 'compartido' && (
            <SharedDetails
              amount={amount}
              sharedWith={sharedWith}
              onSharedWithChange={setSharedWith}
              sharedOwes={sharedOwes}
              onSharedOwesChange={(v) => { setSharedOwes(v); setSplitUsed(false); }}
              onSplitHalf={() => {
                const half = parseFloat(amount) / 2;
                setSharedOwes(isNaN(half) ? '' : half.toFixed(2));
                setSplitUsed(true);
              }}
              currency={currency}
            />
          )}

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

          <button type="submit" className="btn-primary" disabled={!isValid} id="btn-add-expense">
            Agregar
          </button>
        </form>
      </BaseSheet>
    </>
  );
}
