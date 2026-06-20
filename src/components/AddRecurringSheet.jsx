/**
 * AddRecurringSheet.jsx
 * Form for creating a new recurring expense (manual confirmation).
 * Frequency options: weekly (select days) or monthly (select day of month).
 */
import React, { useState } from 'react';
import './FormSheets.css';
import BaseSheet              from './ui/BaseSheet';
import FormSection            from './ui/FormSection';
import ToggleGroup            from './ui/ToggleGroup';
import TransactionFormFields  from './ui/TransactionFormFields';
import { useTransactionForm } from '../hooks/useTransactionForm';

const WEEK_DAYS = [
  { label: 'D', value: 0 }, { label: 'L', value: 1 }, { label: 'M', value: 2 },
  { label: 'X', value: 3 }, { label: 'J', value: 4 }, { label: 'V', value: 5 },
  { label: 'S', value: 6 },
];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const FREQ_OPTIONS = [
  { value: 'weekly',  label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

export default function AddRecurringSheet({
  onAdd, onClose,
  defaultCurrency = 'MXN',
  expenses = [],
  onCreateSubcategory,
  accounts = [],
}) {
  const [frequency,  setFrequency]  = useState('monthly');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);

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

  const toggleWeekDay = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const isValid =
    parseFloat(form.amount) > 0 &&
    form.category !== '' &&
    (frequency === 'monthly' || daysOfWeek.length > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd(form.buildPayload({
      entryType:   'recurring',
      frequency,
      daysOfWeek:  frequency === 'weekly'  ? daysOfWeek : [],
      dayOfMonth:  frequency === 'monthly' ? dayOfMonth : null,
      yearlyDay:   null,
      yearlyMonth: null,
    }));
    onClose();
  };

  return (
    <BaseSheet title="Nuevo gasto recurrente" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <TransactionFormFields
          amount={form.amount}           onAmountChange={form.setAmount}
          description={form.description} onDescriptionChange={form.setDescription}
          onDescriptionPick={form.handleDescriptionPick}
          descriptionSuggestions={form.descriptionSuggestions}
          descriptionPlaceholder="Descripción (opcional)"
          location={form.location}       onLocationChange={form.setLocation}
          locationSuggestions={form.locationSuggestions}
          locationPlaceholder="Tienda, restaurante, etc."
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

        {frequency === 'weekly' && (
          <FormSection label="Días de la semana">
            <div className="recurring-days-row">
              {WEEK_DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  className={`recurring-day-chip${daysOfWeek.includes(d.value) ? ' active' : ''}`}
                  onClick={() => toggleWeekDay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </FormSection>
        )}

        {frequency === 'monthly' && (
          <FormSection label="Día del mes">
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
                Los meses que no tienen el día {dayOfMonth}, el recordatorio será el último día del mes.
              </p>
            )}
          </FormSection>
        )}

        <button type="submit" className="btn-primary" disabled={!isValid}>
          Agregar gasto recurrente
        </button>
      </form>
    </BaseSheet>
  );
}
