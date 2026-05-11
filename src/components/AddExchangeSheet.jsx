/**
 * AddExchangeSheet.jsx
 * Register a currency exchange between two accounts.
 *
 * Fields:
 *  - fromAccountId  → account that delivers money (origin)
 *  - accountId      → account that receives money (destination)
 *  - fromCurrency   → pre-filled from origin account, editable
 *  - fromAmount     → amount delivered
 *  - exchangeRate   → optional, auto-calculates toAmount ↔ rate
 *  - toCurrency     → pre-filled from destination account, editable
 *  - toAmount       → amount received
 *  - date
 *
 * Bidirectional: rate ↔ toAmount auto-fill each other.
 */
import React, { useState, useEffect } from 'react';
import './FormSheets.css';
import BaseSheet      from './ui/BaseSheet';
import FormSection    from './ui/FormSection';
import DateField      from './ui/DateField';
import CurrencyPicker from './ui/CurrencyPicker';
import AccountPicker  from './ui/AccountPicker';
import { EXPENSE_COLORS } from '../utils/categories';

const DEFAULT_COLOR = EXPENSE_COLORS[3].hex; // mint

export default function AddExchangeSheet({ onAdd, onClose, defaultCurrency = 'USD', accounts = [] }) {
  const [fromAccountId,  setFromAccountId]  = useState('');
  const [toAccountId,    setToAccountId]    = useState('');
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen,   setToPickerOpen]   = useState(false);

  const [fromCurrency, setFromCurrency] = useState(defaultCurrency);
  const [fromAmount,   setFromAmount]   = useState('');
  const [toCurrency,   setToCurrency]   = useState('PEN');
  const [toAmount,     setToAmount]     = useState('');
  const [rate,         setRate]         = useState('');
  const [date,         setDate]         = useState(new Date());

  /* Pre-fill currencies when accounts are selected */
  useEffect(() => {
    const acc = accounts.find(a => a.id === fromAccountId);
    if (acc?.currency) setFromCurrency(acc.currency);
  }, [fromAccountId]);

  useEffect(() => {
    const acc = accounts.find(a => a.id === toAccountId);
    if (acc?.currency) setToCurrency(acc.currency);
  }, [toAccountId]);

  /* ── Bidirectional auto-calc ── */
  const handleRateChange = (val) => {
    const r = val.replace(/[^0-9.]/g, '');
    setRate(r);
    const from = parseFloat(fromAmount), rv = parseFloat(r);
    if (!isNaN(from) && !isNaN(rv) && rv > 0) setToAmount((from * rv).toFixed(2));
  };

  const handleToAmountChange = (val) => {
    const t = val.replace(/[^0-9.]/g, '');
    setToAmount(t);
    const from = parseFloat(fromAmount), tv = parseFloat(t);
    if (!isNaN(from) && !isNaN(tv) && from > 0) setRate((tv / from).toFixed(4));
  };

  const handleFromAmountChange = (val) => {
    const f = val.replace(/[^0-9.]/g, '');
    setFromAmount(f);
    const rv = parseFloat(rate), fv = parseFloat(f);
    if (!isNaN(fv) && !isNaN(rv) && rv > 0) setToAmount((fv * rv).toFixed(2));
  };

  const parsedFrom = parseFloat(fromAmount);
  const parsedTo   = parseFloat(toAmount);
  const isValid    = (
    parsedFrom > 0 &&
    parsedTo   > 0 &&
    fromCurrency !== toCurrency &&
    fromAccountId &&
    toAccountId &&
    fromAccountId !== toAccountId
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    const parsedRate = parseFloat(rate) || parsedTo / parsedFrom;
    onAdd({
      amount:        parsedTo,
      currency:      toCurrency,
      category:      'exchange',
      color:         DEFAULT_COLOR,
      type:          'cambio',
      date,
      description:   `${parsedFrom} ${fromCurrency} → ${parsedTo} ${toCurrency}`,
      fromCurrency,
      fromAmount:    parsedFrom,
      exchangeRate:  parsedRate,
      accountId:     toAccountId,      // destination account (receives money)
      fromAccountId: fromAccountId,    // origin account (delivers money)
    });
    onClose();
  };

  return (
    <BaseSheet title="Cambio de Moneda" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* ── Origin account ── */}
        <FormSection label="Cuenta origen">
          <AccountPicker
            accounts={accounts}
            value={fromAccountId}
            onChange={setFromAccountId}
            open={fromPickerOpen}
            onOpen={() => setFromPickerOpen(true)}
            onClose={() => setFromPickerOpen(false)}
          />
        </FormSection>

        {/* ── Amount delivered ── */}
        <FormSection label="Entrego">
          <div className="exchange-amount-row">
            <input
              id="exchange-from-amount"
              className="exchange-amount-input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={fromAmount}
              onChange={e => handleFromAmountChange(e.target.value)}
              min="0"
              step="0.01"
              autoFocus
            />
            <div className="exchange-currency-inline">
              <CurrencyPicker selected={fromCurrency} onSelect={setFromCurrency} compact />
            </div>
          </div>
        </FormSection>

        {/* ── Exchange rate ── */}
        <FormSection label="Tipo de cambio" hint="(opcional)">
          <div className="exchange-rate-row">
            <span className="exchange-rate-label">1 {fromCurrency} =</span>
            <input
              id="exchange-rate"
              className="exchange-rate-input"
              type="number"
              inputMode="decimal"
              placeholder="0.0000"
              value={rate}
              onChange={e => handleRateChange(e.target.value)}
              min="0"
              step="0.0001"
            />
            <span className="exchange-rate-label">{toCurrency}</span>
          </div>
        </FormSection>

        {/* ── Amount received ── */}
        <FormSection label="Recibo">
          <div className="exchange-amount-row">
            <input
              id="exchange-to-amount"
              className="exchange-amount-input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={toAmount}
              onChange={e => handleToAmountChange(e.target.value)}
              min="0"
              step="0.01"
            />
            <div className="exchange-currency-inline">
              <CurrencyPicker selected={toCurrency} onSelect={setToCurrency} compact />
            </div>
          </div>
        </FormSection>

        {/* ── Destination account ── */}
        <FormSection label="Cuenta destino">
          <AccountPicker
            accounts={accounts}
            value={toAccountId}
            onChange={setToAccountId}
            open={toPickerOpen}
            onOpen={() => setToPickerOpen(true)}
            onClose={() => setToPickerOpen(false)}
          />
        </FormSection>

        {/* ── Date ── */}
        <FormSection label="Fecha">
          <DateField value={date} onChange={setDate} id="btn-open-calendar-exchange" />
        </FormSection>

        {/* ── Validation hints ── */}
        {fromCurrency === toCurrency && fromCurrency && (
          <p className="exchange-error">Las monedas deben ser diferentes</p>
        )}
        {fromAccountId && toAccountId && fromAccountId === toAccountId && (
          <p className="exchange-error">Las cuentas deben ser diferentes</p>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={!isValid}
          id="btn-confirm-exchange"
        >
          Registrar cambio
        </button>
      </form>
    </BaseSheet>
  );
}
