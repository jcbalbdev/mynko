/**
 * AddAccountSheet.jsx
 * Sheet for creating a new account (debit or credit).
 */
import { useState } from 'react';
import { Banknote, Building2, PiggyBank, CreditCard } from 'lucide-react';
import './FormSheets.css';
import './AddAccountSheet.css';
import BaseSheet      from './ui/BaseSheet';
import FormSection    from './ui/FormSection';
import CurrencyPicker from './ui/CurrencyPicker';

const ACCOUNT_TYPES = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote,   color: '#111214' },
  { value: 'banco',    label: 'Banco',    icon: Building2,  color: '#111214' },
  { value: 'ahorro',   label: 'Ahorro',   icon: PiggyBank,  color: '#111214' },
];

export default function AddAccountSheet({ onAdd, onClose, defaultCurrency = 'MXN' }) {
  const [isCredit,  setIsCredit]  = useState(false);

  // Debit fields
  const [name,     setName]     = useState('');
  const [type,     setType]     = useState('banco');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [balance,  setBalance]  = useState('');

  // Credit fields
  const [creditLimit, setCreditLimit] = useState('');
  const [cutDay,      setCutDay]      = useState('');
  const [paymentDay,  setPaymentDay]  = useState('');
  const [tcea,        setTcea]        = useState('');
  const [currentDebt, setCurrentDebt] = useState('');

  const cutDayNum = parseInt(cutDay);
  const payDayNum = parseInt(paymentDay);
  const isCutDayValid = cutDayNum >= 1 && cutDayNum <= 31;
  const isPayDayValid = payDayNum >= 1 && payDayNum <= 31;

  const isValid = isCredit
    ? name.trim().length > 0 && parseFloat(creditLimit) > 0 && isCutDayValid && isPayDayValid
    : name.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    if (isCredit) {
      const parsedDebt = Math.round((parseFloat(currentDebt) || 0) * 100) / 100;
      await onAdd({
        name:        name.trim(),
        type:        'banco',
        currency,
        balance:     -parsedDebt,
        isCredit:    true,
        creditLimit: parseFloat(creditLimit),
        cutDay:      cutDayNum,
        paymentDay:  payDayNum,
        tcea:        tcea ? parseFloat(tcea) : null,
      });
    } else {
      const parsedBalance = Math.round((parseFloat(balance) || 0) * 100) / 100;
      if (parsedBalance < 0) return;
      await onAdd({ name: name.trim(), type, currency, balance: parsedBalance });
    }
    onClose();
  };

  return (
    <BaseSheet title="Nueva Cuenta" onClose={onClose}>
      <form onSubmit={handleSubmit}>

        {/* Credit toggle */}
        <div className="credit-mode-toggle-row">
          <div className="credit-mode-toggle-info">
            <CreditCard size={16} color="#111214" />
            <span className="credit-mode-label">¿Es de crédito?</span>
          </div>
          <label className="ios-toggle">
            <input
              type="checkbox"
              checked={isCredit}
              onChange={e => setIsCredit(e.target.checked)}
            />
            <span className="ios-toggle-track" />
          </label>
        </div>

        {/* Account Name */}
        <FormSection label="Nombre de la cuenta">
          <input
            id="account-name-input"
            className="text-input"
            type="text"
            placeholder={isCredit ? 'Ej: Visa BCP, MC Scotiabank…' : 'Ej: BCP, Billetera, Fondo viaje…'}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            maxLength={40}
          />
        </FormSection>

        {isCredit ? (
          <>
            {/* Currency */}
            <FormSection label="Moneda">
              <CurrencyPicker selected={currency} onSelect={setCurrency} />
            </FormSection>

            {/* Credit Limit */}
            <FormSection label="Línea de crédito">
              <div className="amount-input-wrapper">
                <input
                  className="amount-input-field"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                />
              </div>
            </FormSection>

            {/* Cut day & Payment day */}
            <FormSection label="Fechas del ciclo">
              <div className="credit-dates-inputs">
                <div className="credit-date-field">
                  <span className="credit-date-sublabel">Corte</span>
                  <input
                    className="text-input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="15"
                    value={cutDay}
                    onChange={e => setCutDay(e.target.value)}
                  />
                  <p className="form-hint-text">Día del mes</p>
                </div>
                <div className="credit-date-field">
                  <span className="credit-date-sublabel">Pago</span>
                  <input
                    className="text-input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="5"
                    value={paymentDay}
                    onChange={e => setPaymentDay(e.target.value)}
                  />
                  <p className="form-hint-text">Día del mes</p>
                </div>
              </div>
            </FormSection>

            {/* TCEA */}
            <FormSection label="TCEA" hint="(opcional)">
              <div className="amount-input-wrapper">
                <input
                  className="amount-input-field"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tcea}
                  onChange={e => setTcea(e.target.value)}
                />
                <span className="amount-input-suffix">%</span>
              </div>
            </FormSection>

            {/* Current Debt */}
            <FormSection label="Deuda actual" hint="(opcional)">
              <div className="amount-input-wrapper">
                <input
                  className="amount-input-field"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={currentDebt}
                  onChange={e => setCurrentDebt(e.target.value)}
                />
              </div>
              <p className="form-hint-text">
                Ingresa la deuda actual de esta tarjeta. Podrás actualizarla registrando gastos e ingresos.
              </p>
            </FormSection>
          </>
        ) : (
          <>
            {/* Account Type */}
            <FormSection label="Tipo de cuenta">
              <div className="account-type-toggle" role="group" aria-label="Tipo de cuenta">
                {ACCOUNT_TYPES.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    id={`account-type-${value}`}
                    className={`account-type-btn${type === value ? ' active' : ''}`}
                    style={type === value ? { '--acc-color': color } : {}}
                    onClick={() => setType(value)}
                  >
                    <Icon size={18} strokeWidth={type === value ? 2.5 : 2} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </FormSection>

            {/* Currency */}
            <FormSection label="Moneda">
              <CurrencyPicker selected={currency} onSelect={setCurrency} />
            </FormSection>

            {/* Initial Balance */}
            <FormSection label="Saldo inicial" hint="(opcional)">
              <div className="amount-input-wrapper">
                <input
                  id="account-balance-input"
                  className="amount-input-field"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                />
              </div>
            </FormSection>
          </>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={!isValid}
          id="btn-add-account"
        >
          Crear cuenta
        </button>
      </form>
    </BaseSheet>
  );
}
