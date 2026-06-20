/**
 * AddDebtSheet.jsx
 * Sheet for registering pure debts — supports multiple debtors.
 */
import React, { useState } from 'react';
import './FormSheets.css';
import { Trash2 } from 'lucide-react';
import BaseSheet              from './ui/BaseSheet';
import FormSection            from './ui/FormSection';
import TransactionFormFields  from './ui/TransactionFormFields';
import { useTransactionForm } from '../hooks/useTransactionForm';

let _uid = 1;
const uid = () => _uid++;
const newDebtor = () => ({ id: uid(), name: '', amount: '' });

export default function AddDebtSheet({
  onAdd, onClose,
  defaultCurrency = 'MXN',
  expenses = [],
  onCreateSubcategory,
  accounts = [],
}) {
  const [debtors, setDebtors] = useState([newDebtor()]);

  const form = useTransactionForm({
    defaultCurrency, expenses, accounts, onCreateSubcategory,
  });

  /* ── Debtor row helpers ── */
  const updateDebtor = (id, field, value) =>
    setDebtors(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  const addDebtor    = () => setDebtors(prev => [...prev, newDebtor()]);
  const removeDebtor = (id) => {
    if (debtors.length === 1) return;
    setDebtors(prev => prev.filter(d => d.id !== id));
  };

  const validDebtors = debtors.filter(d => d.name.trim() && parseFloat(d.amount) > 0);
  const isValid = validDebtors.length > 0 && form.category !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    validDebtors.forEach(d => {
      const amt = parseFloat(d.amount);
      onAdd(form.buildPayload({
        amount:     amt,
        type:       'compartido',
        sharedWith: d.name.trim(),
        sharedOwes: amt,
        sharedPaid: false,
      }));
    });
    onClose();
  };

  const btnLabel = `Registrar deuda${validDebtors.length > 1 ? `s (${validDebtors.length})` : ''}`;

  return (
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
                <span className="debt-debtor-currency">{form.currency}</span>
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

        <TransactionFormFields
          showAmount={false}
          description={form.description} onDescriptionChange={form.setDescription}
          onDescriptionPick={form.handleDescriptionPick}
          descriptionSuggestions={form.descriptionSuggestions}
          descriptionPlaceholder="¿Por qué concepto?"
          location={form.location}       onLocationChange={form.setLocation}
          locationSuggestions={form.locationSuggestions}
          locationPlaceholder="Lugar del gasto"
          date={form.date}               onDateChange={form.setDate}
          dateLabel="Fecha"              dateId="btn-open-calendar-debt"
          currency={form.currency}       onCurrencyChange={form.setCurrency}
          accounts={accounts}            accountId={form.accountId}  onAccountIdChange={form.setAccountId}
          expenses={expenses}
          category={form.category}       onCategoryChange={form.setCategory}
          showCreateSubcat={form.showCreateSubcat}
          onOpenCreate={form.openCreateSubcat}   onCloseCreate={form.closeCreateSubcat}
          onCreated={form.handleCreateSubcategory}
        />

        <button type="submit" className="btn-primary" disabled={!isValid} id="btn-confirm-add-debt">
          {btnLabel}
        </button>
      </form>
    </BaseSheet>
  );
}
