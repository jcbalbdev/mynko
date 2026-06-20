/**
 * TransferSheet.jsx
 * Sheet to register a transfer between two accounts.
 * Transfers are neutral — they do not count as income or expense.
 * Uses AccountPicker (iOS-style) for both origin and destination.
 */
import React, { useState } from 'react';
import './FormSheets.css';
import { ArrowDown } from 'lucide-react';
import BaseSheet    from './ui/BaseSheet';
import FormSection  from './ui/FormSection';
import AccountPicker from './ui/AccountPicker';
import { getCurrencyByCode } from '../utils/currencies';

function getLastDestination(expenses, fromAccountId) {
  if (!fromAccountId) return null;
  const last = [...expenses]
    .filter(e => e.type === 'cambio' && e.fromAccountId === fromAccountId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  return last?.accountId ?? null;
}

export default function TransferSheet({ accounts = [], expenses = [], fromAccountId = null, onTransfer, onClose }) {
  const initialFromId = fromAccountId ?? accounts[0]?.id ?? '';
  const lastDest      = getLastDestination(expenses, initialFromId);
  const initialToId   = lastDest
    ?? accounts.find(a => a.id !== initialFromId)?.id
    ?? '';

  const [fromId,       setFromId]       = useState(initialFromId);
  const [toId,         setToId]         = useState(initialToId);
  const [amount,       setAmount]       = useState('');
  const [note,         setNote]         = useState('');
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen,   setToPickerOpen]   = useState(false);

  const fromAccount = accounts.find(a => a.id === fromId);
  const toAccount   = accounts.find(a => a.id === toId);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = fromId && toId && fromId !== toId && parsedAmount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    await onTransfer({
      fromAccountId: fromId,
      toAccountId:   toId,
      amount:        parsedAmount,
      currency:      fromAccount?.currency ?? 'MXN',
      note,
      date:          new Date(),
    });
    onClose();
  };

  return (
    <BaseSheet title="Transferencia" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* ── Account selectors ── */}
        <FormSection label="De">
          <AccountPicker
            accounts={accounts}
            value={fromId}
            onChange={setFromId}
            open={fromPickerOpen}
            onOpen={() => setFromPickerOpen(true)}
            onClose={() => setFromPickerOpen(false)}
          />
        </FormSection>

        {/* Arrow separator */}
        <div className="transfer-arrow-divider">
          <ArrowDown size={18} strokeWidth={2.5} />
        </div>

        <FormSection label="A">
          <AccountPicker
            accounts={accounts}
            value={toId}
            onChange={setToId}
            open={toPickerOpen}
            onOpen={() => setToPickerOpen(true)}
            onClose={() => setToPickerOpen(false)}
          />
        </FormSection>

        {fromId === toId && fromId && (
          <p className="form-error-text">La cuenta origen y destino no pueden ser la misma.</p>
        )}

        {/* ── Amount ── */}
        <FormSection label="Monto a transferir">
          <div className="amount-input-wrapper">
            {fromAccount && (
              <span className="amount-currency-badge">
                {getCurrencyByCode(fromAccount.currency).symbol}
              </span>
            )}
            <input
              id="transfer-amount-input"
              className="amount-input-field"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
          </div>
        </FormSection>

        {/* ── Note (optional) ── */}
        <FormSection label="Nota" hint="(opcional)">
          <input
            id="transfer-note-input"
            className="text-input"
            type="text"
            placeholder="Ej: Ahorro mensual, pago de tarjeta…"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={80}
          />
        </FormSection>

        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: 'var(--space-lg)' }}
          disabled={!isValid}
          id="btn-confirm-transfer"
        >
          Transferir
        </button>
      </form>
    </BaseSheet>
  );
}
