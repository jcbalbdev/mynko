/**
 * AddSubscriptionSheet.jsx
 * Form for creating a subscription (auto-registered on due date).
 * Frequency options: monthly (day of month) or yearly (day + month).
 */
import React, { useState, useMemo } from 'react';
import './FormSheets.css';
import BaseSheet           from './ui/BaseSheet';
import FormSection         from './ui/FormSection';
import AmountInput         from './ui/AmountInput';
import CurrencyPicker      from './ui/CurrencyPicker';
import DescriptionInput    from './ui/DescriptionInput';
import LocationInput       from './ui/LocationInput';
import CategoryPickerField from './ui/CategoryPickerField';
import AccountPickerField  from './ui/AccountPickerField';
import { useSubcategoryForm } from '../hooks/useSubcategoryForm';

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function AddSubscriptionSheet({
  onAdd,
  onClose,
  defaultCurrency = 'MXN',
  expenses = [],
  onCreateSubcategory,
  accounts = [],
}) {
  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState(defaultCurrency);
  const [description, setDescription] = useState('');
  const [location,    setLocation]    = useState('');
  const [accountId,   setAccountId]   = useState(accounts[0]?.id ?? '');
  const [frequency,   setFrequency]   = useState('monthly');
  const [dayOfMonth,  setDayOfMonth]  = useState(1);
  const [yearlyDay,   setYearlyDay]   = useState(1);
  const [yearlyMonth, setYearlyMonth] = useState(1);

  const {
    category, setCategory, activeColor,
    showCreateSubcat, openCreateSubcat, closeCreateSubcat,
    handleCreateSubcategory,
  } = useSubcategoryForm(onCreateSubcategory, '');

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    const last = expenses.find(e => e.category === cat && e.type !== 'ingreso');
    if (!last) return;
    if (!amount)      setAmount(String(last.amount));
    if (!description) setDescription(last.description ?? '');
    if (!location)    setLocation(last.location ?? '');
    if (last.currency)  setCurrency(last.currency);
    if (last.accountId) setAccountId(last.accountId);
  };

  const locationSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.location?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const descriptionSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.description?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

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
      entryType:   'subscription',
      amount:      parseFloat(amount),
      currency,
      description: description.trim(),
      location:    location.trim() || null,
      category,
      color:       activeColor,
      accountId:   accountId || null,
      frequency,
      daysOfWeek:  [],
      dayOfMonth:  frequency === 'monthly' ? dayOfMonth : null,
      yearlyDay:   frequency === 'yearly'  ? yearlyDay  : null,
      yearlyMonth: frequency === 'yearly'  ? yearlyMonth : null,
    });
    onClose();
  };

  return (
    <BaseSheet title="Nueva suscripción" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
        />

        <DescriptionInput
          value={description}
          onChange={setDescription}
          onPick={handleDescriptionPick}
          suggestions={descriptionSuggestions}
          placeholder="Descripción (opcional)"
        />

        <LocationInput
          value={location}
          onChange={setLocation}
          suggestions={locationSuggestions}
          placeholder="Plataforma, proveedor, etc."
          maxLength={60}
        />

        <FormSection label="Moneda">
          <CurrencyPicker selected={currency} onSelect={setCurrency} />
        </FormSection>

        <AccountPickerField accounts={accounts} value={accountId} onChange={setAccountId} />

        <CategoryPickerField
          selected={category}
          onSelect={handleCategoryChange}
          expenses={expenses}
          showCreateSubcat={showCreateSubcat}
          onOpenCreate={openCreateSubcat}
          onCloseCreate={closeCreateSubcat}
          onCreated={handleCreateSubcategory}
        />

        <FormSection label="Frecuencia">
          <div className="type-toggle" role="group">
            <button
              type="button"
              className={`type-btn${frequency === 'monthly' ? ' active' : ''}`}
              onClick={() => setFrequency('monthly')}
            >Mensual</button>
            <button
              type="button"
              className={`type-btn${frequency === 'yearly' ? ' active' : ''}`}
              onClick={() => setFrequency('yearly')}
            >Anual</button>
          </div>
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

        <button type="submit" className="btn-primary" disabled={!isValid}>
          Agregar suscripción
        </button>
      </form>
    </BaseSheet>
  );
}
