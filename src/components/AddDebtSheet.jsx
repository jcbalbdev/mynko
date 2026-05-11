/**
 * AddDebtSheet.jsx
 * Sheet for registering pure debts — supports multiple debtors.
 */
import React, { useState, useMemo } from 'react';
import './FormSheets.css';
import { Trash2 } from 'lucide-react';
import BaseSheet        from './ui/BaseSheet';
import FormSection      from './ui/FormSection';
import DateField        from './ui/DateField';
import CategoryPickerField from './ui/CategoryPickerField';
import CurrencyPicker   from './ui/CurrencyPicker';
import DescriptionInput from './ui/DescriptionInput';
import LocationInput    from './ui/LocationInput';
import { useSubcategoryForm } from '../hooks/useSubcategoryForm';
import { expenseDateLabel }   from '../utils/expenses';
import AccountPickerField from './ui/AccountPickerField';

let _uid = 1;
const uid = () => _uid++;
const newDebtor = () => ({ id: uid(), name: '', amount: '' });

export default function AddDebtSheet({ onAdd, onClose, defaultCurrency = 'MXN', expenses = [], onCreateSubcategory, accounts = [] }) {
  const [debtors,     setDebtors]     = useState([newDebtor()]);
  const [description, setDescription] = useState('');
  const [location,    setLocation]    = useState('');
  const [currency,    setCurrency]    = useState(defaultCurrency);

  const locationSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.location?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const descriptionSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.description?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);
  const [date,        setDate]        = useState(new Date());
  const [accountId,   setAccountId]   = useState(accounts[0]?.id ?? '');

  const {
    category, setCategory, activeColor,
    showCreateSubcat, openCreateSubcat, closeCreateSubcat,
    handleCreateSubcategory,
  } = useSubcategoryForm(onCreateSubcategory);

  /* ── Debtor row helpers ── */
  const updateDebtor = (id, field, value) =>
    setDebtors(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  const addDebtor    = () => setDebtors(prev => [...prev, newDebtor()]);
  const removeDebtor = (id) => {
    if (debtors.length === 1) return;
    setDebtors(prev => prev.filter(d => d.id !== id));
  };

  const handleDescriptionPick = (desc) => {
    const last = expenses
      .filter(e => e.description?.trim() === desc)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!last) return;
    if (last.location)  setLocation(last.location);
    if (last.accountId) setAccountId(last.accountId);
    if (last.category)  setCategory(last.category);
  };

  const validDebtors = debtors.filter(d => d.name.trim() && parseFloat(d.amount) > 0);
  const isValid = validDebtors.length > 0 && category !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    validDebtors.forEach(d => {
      const amt = parseFloat(d.amount);
      onAdd({
        amount:      amt,
        description: description.trim(),
        location:    location.trim() || null,
        category,
        color:       activeColor,
        type:        'compartido',
        currency,
        date,
        sharedWith:  d.name.trim(),
        sharedOwes:  amt,
        sharedPaid:  false,
        accountId:   accountId || null,
      });
    });
    onClose();
  };

  const btnLabel = `Registrar deuda${validDebtors.length > 1 ? `s (${validDebtors.length})` : ''}`;

  return (
    <>
      <BaseSheet title="Nueva Deuda" onClose={onClose}>
        <form onSubmit={handleSubmit}>

          {/* ── Debtors ── */}
          <FormSection label="Deudores">
            <div className="debt-col-headers">
              <span className="debt-col-header">Deudor</span>
              <span className="debt-col-header debt-col-header--right">Deuda</span>
            </div>

            {debtors.map((d, idx) => (
              <div key={d.id} className="debt-debtor-row">
                <input
                  id={`debtor-name-${idx}`}
                  className="debt-debtor-name"
                  type="text"
                  placeholder="Nombre"
                  value={d.name}
                  onChange={e => updateDebtor(d.id, 'name', e.target.value)}
                  maxLength={40}
                  autoComplete="off"
                />
                <div className="debt-debtor-amount-wrap">
                  <input
                    id={`debtor-amount-${idx}`}
                    className="debt-debtor-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={d.amount}
                    onChange={e => updateDebtor(d.id, 'amount', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className="debt-debtor-currency">{currency}</span>
                </div>
                {debtors.length > 1 && (
                  <button
                    type="button"
                    className="debt-remove-row-btn"
                    onClick={() => removeDebtor(d.id)}
                    aria-label="Eliminar deudor"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="debt-add-row-btn"
              onClick={addDebtor}
              id="btn-add-debtor-row"
            >
              Agregar deudor
            </button>
          </FormSection>

          <DescriptionInput
            id="debt-desc"
            value={description}
            onChange={setDescription}
            onPick={handleDescriptionPick}
            suggestions={descriptionSuggestions}
            placeholder="¿Por qué concepto?"
          />

          <LocationInput
            id="debt-location"
            value={location}
            onChange={setLocation}
            suggestions={locationSuggestions}
            placeholder="Lugar del gasto"
            maxLength={60}
          />

          <FormSection label="Fecha">
            <DateField value={date} onChange={setDate} id="btn-open-calendar-debt" />
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

          <button type="submit" className="btn-primary" disabled={!isValid} id="btn-confirm-add-debt">
            {btnLabel}
          </button>
        </form>
      </BaseSheet>
    </>
  );
}
