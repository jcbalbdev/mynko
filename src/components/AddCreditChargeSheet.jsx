/**
 * AddCreditChargeSheet.jsx
 * Sheet para registrar un consumo en una tarjeta de crédito.
 * Sin cuotas → cargo único. Con cuotas → se acumula mes a mes.
 */
import React, { useState, useMemo, useCallback } from 'react';
import './FormSheets.css';
import BaseSheet          from './ui/BaseSheet';
import FormSection        from './ui/FormSection';
import AmountInput        from './ui/AmountInput';
import DateField          from './ui/DateField';
import CurrencyPicker     from './ui/CurrencyPicker';
import DescriptionInput   from './ui/DescriptionInput';
import CategoryPickerField from './ui/CategoryPickerField';

export default function AddCreditChargeSheet({
  onAdd,
  onClose,
  defaultCurrency = 'PEN',
  creditAccounts = [],       // solo accounts con isCredit === true
  initialAccountId = '',
  expenses = [],
}) {
  const [accountId,    setAccountId]    = useState(initialAccountId || creditAccounts[0]?.id || '');
  const [amount,       setAmount]       = useState('');
  const [description,  setDescription]  = useState('');
  const [category,     setCategory]     = useState('');
  const [currency,     setCurrency]     = useState(defaultCurrency);
  const [date,         setDate]         = useState(new Date());
  const [withInstall,  setWithInstall]  = useState(false);
  const [installments, setInstallments] = useState('');
  const [customInstAmt, setCustomInstAmt] = useState('');

  const descriptionSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.description?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const creditAccountIds = useMemo(() => new Set(creditAccounts.map(a => a.id)), [creditAccounts]);

  const handleDescriptionPick = useCallback((desc) => {
    const last = expenses
      .filter(e => e.description?.trim() === desc)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!last) return;
    if (last.accountId && creditAccountIds.has(last.accountId)) setAccountId(last.accountId);
  }, [expenses, creditAccountIds]);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedInst   = parseInt(installments, 10) || 0;

  // Auto-calculated installment amount, overridable by user
  const autoInstAmt = parsedInst > 1 ? parsedAmount / parsedInst : 0;
  const instAmtDisplay = customInstAmt !== ''
    ? customInstAmt
    : autoInstAmt > 0 ? autoInstAmt.toFixed(2) : '';

  const isValid = parsedAmount > 0 && accountId !== ''
    && (!withInstall || parsedInst >= 2);

  const handleInstallmentsChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setInstallments(val);
    setCustomInstAmt(''); // reset override when cuotas changes
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    const instAmt = withInstall && parsedInst >= 2
      ? (parseFloat(customInstAmt) || autoInstAmt)
      : null;
    onAdd({
      accountId,
      amount:            parsedAmount,
      description:       description.trim(),
      category:          category || 'other',
      currency,
      date,
      installments:      withInstall && parsedInst >= 2 ? parsedInst : 1,
      installmentAmount: instAmt,
    });
    onClose();
  };

  return (
    <BaseSheet title="Nuevo consumo" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <FormSection label="Monto">
          <AmountInput
            id="charge-amount"
            value={amount}
            onChange={setAmount}
            currency={currency}
            autoFocus
          />
        </FormSection>

        <DescriptionInput
          id="charge-desc"
          value={description}
          onChange={setDescription}
          onPick={handleDescriptionPick}
          suggestions={descriptionSuggestions}
          placeholder="¿En qué consumiste?"
        />

        <CategoryPickerField
          selected={category}
          onSelect={setCategory}
          expenses={expenses}
        />

        <FormSection label="Tarjeta">
          <div className="form-picker-row">
            {creditAccounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                className={`form-picker-chip${accountId === acc.id ? ' active' : ''}`}
                onClick={() => setAccountId(acc.id)}
              >
                {acc.name}
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection label="Fecha">
          <DateField value={date} onChange={setDate} id="btn-open-calendar-charge" />
        </FormSection>

        <FormSection label="Moneda">
          <CurrencyPicker selected={currency} onSelect={setCurrency} />
        </FormSection>

        {/* Cuotas toggle */}
        <div className="form-section">
          <div className="form-toggle-row">
            <span className="form-section-label" style={{ margin: 0 }}>Con cuotas</span>
            <button
              type="button"
              className={`form-toggle-btn${withInstall ? ' active' : ''}`}
              onClick={() => { setWithInstall(v => !v); setInstallments(''); setCustomInstAmt(''); }}
              aria-pressed={withInstall}
            >
              <span className="form-toggle-knob" />
            </button>
          </div>
        </div>

        {withInstall && (
          <>
            <FormSection label="Número de cuotas">
              <input
                className="form-text-input"
                type="number"
                inputMode="numeric"
                min="2"
                max="60"
                placeholder="Ej. 6"
                value={installments}
                onChange={handleInstallmentsChange}
              />
            </FormSection>

            {parsedInst >= 2 && (
              <FormSection label="Monto por cuota" hint="(opcional — editar si difiere)">
                <input
                  className="form-text-input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder={autoInstAmt.toFixed(2)}
                  value={customInstAmt}
                  onChange={e => setCustomInstAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </FormSection>
            )}
          </>
        )}

        <button type="submit" className="btn-primary" disabled={!isValid} id="btn-confirm-charge">
          Registrar consumo
        </button>
      </form>
    </BaseSheet>
  );
}
