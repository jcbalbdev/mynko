/**
 * AddRecurringSheet.jsx
 * Form for creating a new recurring expense (manual confirmation).
 * Frequency options: weekly (select days) or monthly (select day of month).
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

const WEEK_DAYS = [
  { label: 'D', value: 0 },
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function AddRecurringSheet({
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
  const [daysOfWeek,  setDaysOfWeek]  = useState([]);
  const [dayOfMonth,  setDayOfMonth]  = useState(1);

  const {
    category, setCategory, activeColor,
    showCreateSubcat, openCreateSubcat, closeCreateSubcat,
    handleCreateSubcategory,
  } = useSubcategoryForm(onCreateSubcategory, '');

  /* Auto-fill amount/currency/account/location/description from last expense in category */
  const lastInCategory = useMemo(() => {
    if (!category) return null;
    return expenses.find(e => e.category === category && e.type !== 'ingreso') ?? null;
  }, [category, expenses]);

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

  const toggleWeekDay = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const isValid =
    parseFloat(amount) > 0 &&
    category !== '' &&
    (frequency === 'monthly' || daysOfWeek.length > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({
      entryType:   'recurring',
      amount:      parseFloat(amount),
      currency,
      description: description.trim(),
      location:    location.trim() || null,
      category,
      color:       activeColor,
      accountId:   accountId || null,
      frequency,
      daysOfWeek:  frequency === 'weekly'   ? daysOfWeek : [],
      dayOfMonth:  frequency === 'monthly'  ? dayOfMonth : null,
      yearlyDay:   null,
      yearlyMonth: null,
    });
    onClose();
  };

  return (
    <BaseSheet title="Nuevo gasto recurrente" onClose={onClose}>
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
          placeholder="Tienda, restaurante, etc."
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
              className={`type-btn${frequency === 'weekly' ? ' active' : ''}`}
              onClick={() => setFrequency('weekly')}
            >Semanal</button>
            <button
              type="button"
              className={`type-btn${frequency === 'monthly' ? ' active' : ''}`}
              onClick={() => setFrequency('monthly')}
            >Mensual</button>
          </div>
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
