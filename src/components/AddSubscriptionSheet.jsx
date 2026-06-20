/**
 * AddSubscriptionSheet.jsx
 * Form for creating a subscription (auto-registered on due date).
 * Frequency options: monthly (day of month) or yearly (day + month).
 */
import React, { useState } from 'react';
import './FormSheets.css';
import BaseSheet              from './ui/BaseSheet';
import FormSection            from './ui/FormSection';
import ToggleGroup            from './ui/ToggleGroup';
import TransactionFormFields  from './ui/TransactionFormFields';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { MONTHS }             from '../utils/dates';

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const FREQ_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly',  label: 'Anual'   },
];

export default function AddSubscriptionSheet({
  onAdd, onClose,
  defaultCurrency = 'MXN',
  expenses = [],
  onCreateSubcategory,
  accounts = [],
}) {
  const [frequency,   setFrequency]   = useState('monthly');
  const [dayOfMonth,  setDayOfMonth]  = useState(1);
  const [yearlyDay,   setYearlyDay]   = useState(1);
  const [yearlyMonth, setYearlyMonth] = useState(1);

  const form = useTransactionForm({
    defaultCurrency, expenses, accounts, onCreateSubcategory,
  });

  /* Auto-fill from last expense in the selected category */
  const handleCategoryChange = (cat) => {
    form.setCategory(cat);
    const last = expenses.find(e => e.category === cat && e.type !== 'ingreso');
    if (!last) return;
    if (!form.amount)      form.setAmount(String(last.amount));
    if (!form.description) form.setDescription(last.description ?? '');
    if (!form.location)    form.setLocation(last.location ?? '');
    if (last.currency)     form.setCurrency(last.currency);
    if (last.accountId)    form.setAccountId(last.accountId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.isValid) return;
    onAdd(form.buildPayload({
      entryType:   'subscription',
      frequency,
      daysOfWeek:  [],
      dayOfMonth:  frequency === 'monthly' ? dayOfMonth : null,
      yearlyDay:   frequency === 'yearly'  ? yearlyDay  : null,
      yearlyMonth: frequency === 'yearly'  ? yearlyMonth : null,
    }));
    onClose();
  };

  return (
    <BaseSheet title="Nueva suscripción" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <TransactionFormFields
          amount={form.amount}           onAmountChange={form.setAmount}
          description={form.description} onDescriptionChange={form.setDescription}
          onDescriptionPick={form.handleDescriptionPick}
          descriptionSuggestions={form.descriptionSuggestions}
          descriptionPlaceholder="Descripción (opcional)"
          location={form.location}       onLocationChange={form.setLocation}
          locationSuggestions={form.locationSuggestions}
          locationPlaceholder="Plataforma, proveedor, etc."
          showDate={false}
          currency={form.currency}       onCurrencyChange={form.setCurrency}
          accounts={accounts}            accountId={form.accountId}  onAccountIdChange={form.setAccountId}
          expenses={expenses}
          category={form.category}       onCategoryChange={handleCategoryChange}
          showCreateSubcat={form.showCreateSubcat}
          onOpenCreate={form.openCreateSubcat}   onCloseCreate={form.closeCreateSubcat}
          onCreated={form.handleCreateSubcategory}
        />

        <FormSection label="Frecuencia">
          <ToggleGroup options={FREQ_OPTIONS} value={frequency} onChange={setFrequency} />
        </FormSection>

        {frequency === 'monthly' && (
          <FormSection label="Día de cobro">
            <div className="recurring-month-day-grid">
              {MONTH_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`recurring-day-chip${dayOfMonth === d ? ' active' : ''}`}
                  onClick={() => setDayOfMonth(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            {dayOfMonth > 28 && (
              <p className="form-hint-text">
                Los meses que no tienen el día {dayOfMonth}, el cobro se registrará el último día del mes.
              </p>
            )}
          </FormSection>
        )}

        {frequency === 'yearly' && (
          <>
            <FormSection label="Día de cobro anual">
              <div className="recurring-month-day-grid">
                {MONTH_DAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`recurring-day-chip${yearlyDay === d ? ' active' : ''}`}
                    onClick={() => setYearlyDay(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </FormSection>
            <FormSection label="Mes de cobro">
              <div className="recurring-months-grid">
                {MONTHS.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`recurring-month-chip${yearlyMonth === idx + 1 ? ' active' : ''}`}
                    onClick={() => setYearlyMonth(idx + 1)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {yearlyDay > 28 && (
                <p className="form-hint-text">
                  Si el mes seleccionado no tiene el día {yearlyDay}, se usará el último día de ese mes.
                </p>
              )}
            </FormSection>
          </>
        )}

        <button type="submit" className="btn-primary" disabled={!form.isValid}>
          Agregar suscripción
        </button>
      </form>
    </BaseSheet>
  );
}
