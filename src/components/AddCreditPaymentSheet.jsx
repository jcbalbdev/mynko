/**
 * AddCreditPaymentSheet.jsx
 * Sheet para registrar el pago de una tarjeta de crédito.
 * El pago reduce la deuda de la tarjeta Y aparece en la lista de gastos
 * con la categoría especial 'credit_payment'.
 */
import { useState } from 'react';
import './FormSheets.css';
import BaseSheet      from './ui/BaseSheet';
import FormSection    from './ui/FormSection';
import AmountInput    from './ui/AmountInput';
import DateField      from './ui/DateField';
import CurrencyPicker from './ui/CurrencyPicker';
import { CREDIT_PAYMENT_CATEGORY } from '../utils/categories';

export default function AddCreditPaymentSheet({
  onAdd,
  onClose,
  defaultCurrency = 'PEN',
  creditAccounts  = [],   // accounts con isCredit === true
  debitAccounts   = [],   // accounts con isCredit === false
  initialCreditAccountId = '',
}) {
  const [creditAccountId, setCreditAccountId] = useState(
    initialCreditAccountId || creditAccounts[0]?.id || ''
  );
  const [sourceAccountId, setSourceAccountId] = useState(debitAccounts[0]?.id || '');
  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [currency,    setCurrency]    = useState(defaultCurrency);
  const [date,        setDate]        = useState(new Date());

  const selectedCard = creditAccounts.find(a => a.id === creditAccountId);
  const isValid = parseFloat(amount) > 0 && creditAccountId !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({
      amount:          parseFloat(amount),
      description:     description.trim() || `Pago ${selectedCard?.name ?? 'tarjeta'}`,
      category:        CREDIT_PAYMENT_CATEGORY.id,
      color:           CREDIT_PAYMENT_CATEGORY.bg,
      label:           CREDIT_PAYMENT_CATEGORY.label,
      type:            'personal',
      currency,
      date,
      accountId:       sourceAccountId || null,
      creditAccountId: creditAccountId,
    });
    onClose();
  };

  return (
    <BaseSheet title="Pagar tarjeta" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        <FormSection label="Monto del pago">
          <AmountInput
            id="payment-amount"
            value={amount}
            onChange={setAmount}
            currency={currency}
            autoFocus
          />
        </FormSection>

        <FormSection label="Descripción" hint="(opcional)">
          <input
            className="form-text-input"
            type="text"
            placeholder="Ej: Pago mínimo, Abono parcial…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={60}
          />
        </FormSection>

        <FormSection label="Tarjeta a pagar">
          <div className="form-picker-row">
            {creditAccounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                className={`form-picker-chip${creditAccountId === acc.id ? ' active' : ''}`}
                onClick={() => setCreditAccountId(acc.id)}
              >
                {acc.name}
              </button>
            ))}
          </div>
        </FormSection>

        {debitAccounts.length > 0 && (
          <FormSection label="Cuenta origen" hint="(opcional)">
            <div className="form-picker-row">
              {debitAccounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  className={`form-picker-chip${sourceAccountId === acc.id ? ' active' : ''}`}
                  onClick={() => setSourceAccountId(acc.id)}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </FormSection>
        )}

        <FormSection label="Fecha">
          <DateField value={date} onChange={setDate} id="btn-open-calendar-payment" />
        </FormSection>

        <FormSection label="Moneda">
          <CurrencyPicker selected={currency} onSelect={setCurrency} />
        </FormSection>

        <button type="submit" className="btn-primary" disabled={!isValid} id="btn-confirm-payment">
          Registrar pago
        </button>
      </form>
    </BaseSheet>
  );
}
