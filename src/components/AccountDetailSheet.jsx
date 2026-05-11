/**
 * AccountDetailSheet.jsx
 * Sheet to view and edit an existing account (debit or credit).
 */
import { useState } from 'react';
import { Banknote, Building2, PiggyBank, CreditCard, Trash2, Lock } from 'lucide-react';
import './AccountDetailSheet.css';
import BaseSheet      from './ui/BaseSheet';
import FormSection    from './ui/FormSection';
import CurrencyPicker from './ui/CurrencyPicker';
import { getCurrencyByCode } from '../utils/currencies';
import { getAccountTypeColor, getAccountTypeLabel, computeAccountBalance, CREDIT_COLOR } from '../utils/accounts';

const TYPE_ICONS = {
  efectivo: Banknote,
  banco:    Building2,
  ahorro:   PiggyBank,
};

const ACCOUNT_TYPES = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'banco',    label: 'Banco',    icon: Building2 },
  { value: 'ahorro',   label: 'Ahorro',   icon: PiggyBank },
];

export default function AccountDetailSheet({ account, expenses = [], onUpdate, onDelete, onClose }) {
  const [name,         setName]         = useState(account.name);
  const [type,         setType]         = useState(account.type);
  const [currency,     setCurrency]     = useState(account.currency);
  const [balanceInput, setBalanceInput] = useState(account.balance.toString());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Credit-specific state
  const [creditLimit, setCreditLimit] = useState(account.creditLimit?.toString() ?? '');
  const [cutDay,      setCutDay]      = useState(account.cutDay?.toString()      ?? '');
  const [paymentDay,  setPaymentDay]  = useState(account.paymentDay?.toString()  ?? '');
  const [tcea,        setTcea]        = useState(account.tcea?.toString()        ?? '');

  const cur          = getCurrencyByCode(account.currency);
  const computedBal  = computeAccountBalance(account, expenses);

  // Credit-specific computed values
  const currentDebt  = account.isCredit ? Math.max(0, -computedBal) : 0;
  const creditLimitN = account.creditLimit ?? 0;
  const available    = Math.max(0, creditLimitN - currentDebt);
  const debtRatio    = creditLimitN > 0 ? Math.min(currentDebt / creditLimitN, 1) : 0;

  // Debit-specific
  const accentColor  = account.isCredit ? CREDIT_COLOR : getAccountTypeColor(account.type);
  const TypeIcon     = account.isCredit ? CreditCard : (TYPE_ICONS[account.type] ?? Banknote);
  const realBalance  = computedBal;
  const balanceDirty = !account.hasBeenSet && parseFloat(balanceInput) !== account.balance;

  const handleSave = async () => {
    const updates = {};

    if (account.isCredit) {
      if (name.trim() !== account.name) updates.name = name.trim();
      if (currency !== account.currency) updates.currency = currency;
      const newLimit = parseFloat(creditLimit);
      if (!isNaN(newLimit) && newLimit !== account.creditLimit) updates.creditLimit = newLimit;
      const newCut = parseInt(cutDay);
      if (!isNaN(newCut) && newCut !== account.cutDay) updates.cutDay = newCut;
      const newPay = parseInt(paymentDay);
      if (!isNaN(newPay) && newPay !== account.paymentDay) updates.paymentDay = newPay;
      const newTcea = tcea ? parseFloat(tcea) : null;
      if (newTcea !== account.tcea) updates.tcea = newTcea;
    } else {
      if (name.trim() !== account.name)   updates.name     = name.trim();
      if (type         !== account.type)   updates.type     = type;
      if (currency     !== account.currency) updates.currency = currency;
      if (!account.hasBeenSet && balanceDirty) {
        updates.balance = parseFloat(balanceInput) || 0;
      }
    }

    if (Object.keys(updates).length > 0) {
      await onUpdate(account.id, updates);
    }
    onClose();
  };

  const handleDelete = async () => {
    await onDelete(account.id);
    onClose();
  };

  return (
    <BaseSheet
      title={account.name}
      onClose={onClose}
      onSave={handleSave}
    >
      {/* ── Header ── */}
      {account.isCredit ? (
        <div className="account-detail-header" style={{ '--acc-color': CREDIT_COLOR }}>
          <div className="account-detail-icon">
            <CreditCard size={28} strokeWidth={1.8} />
          </div>
          <div className="account-detail-balance-block">
            <span className="account-detail-balance-label">Deuda actual</span>
            <span className="account-detail-balance-value">
              {cur.symbol} {currentDebt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {creditLimitN > 0 && (
              <>
                <div className="credit-progress-bar">
                  <div
                    className="credit-progress-fill"
                    style={{ width: `${debtRatio * 100}%` }}
                  />
                </div>
                <span className="credit-available-text">
                  Disponible: {cur.symbol} {available.toLocaleString('es-MX', { minimumFractionDigits: 2 })} de {cur.symbol} {creditLimitN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </>
            )}
            <span className="account-detail-type-badge">Crédito</span>
          </div>
        </div>
      ) : (
        <div className="account-detail-header" style={{ '--acc-color': accentColor }}>
          <div className="account-detail-icon">
            <TypeIcon size={28} strokeWidth={1.8} />
          </div>
          <div className="account-detail-balance-block">
            <span className="account-detail-balance-label">Saldo actual</span>
            <span className="account-detail-balance-value">
              {cur.symbol} {realBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="account-detail-type-badge">
              {getAccountTypeLabel(account.type)}
            </span>
          </div>
        </div>
      )}

      {/* ── Name (shared) ── */}
      <FormSection label="Nombre de la cuenta">
        <input
          id="account-detail-name"
          className="text-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
        />
      </FormSection>

      {account.isCredit ? (
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
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
              />
            </div>
          </FormSection>

          {/* Cut & Payment days */}
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
                value={tcea}
                onChange={e => setTcea(e.target.value)}
              />
              <span className="amount-input-suffix">%</span>
            </div>
          </FormSection>
        </>
      ) : (
        <>
          {/* Type */}
          <FormSection label="Tipo de cuenta">
            <div className="account-type-toggle" role="group">
              {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  id={`account-detail-type-${value}`}
                  className={`account-type-btn${type === value ? ' active' : ''}`}
                  style={type === value ? { '--acc-color': getAccountTypeColor(value) } : {}}
                  onClick={() => setType(value)}
                >
                  <Icon size={16} strokeWidth={type === value ? 2.5 : 2} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </FormSection>

          {/* Currency */}
          <FormSection label="Moneda">
            <CurrencyPicker selected={currency} onSelect={setCurrency} />
          </FormSection>

          {/* Balance */}
          <FormSection label="Saldo base">
            {account.hasBeenSet ? (
              <div className="account-balance-locked">
                <Lock size={15} />
                <span className="account-balance-locked-value">
                  {cur.symbol} {account.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <div className="amount-input-wrapper">
                <input
                  id="account-detail-balance"
                  className="amount-input-field"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value)}
                />
              </div>
            )}
            {account.hasBeenSet && (
              <div className="account-balance-locked-message">
                <p>
                  El saldo base ya fue establecido. Para reflejar cambios en esta cuenta,
                  registra un <strong>ingreso</strong> o <strong>gasto de ajuste</strong> vinculado a ella.
                </p>
              </div>
            )}
          </FormSection>
        </>
      )}

      {/* ── Delete (shared) ── */}
      <div className="account-detail-delete-section">
        {!showDeleteConfirm ? (
          <button
            type="button"
            className="btn-danger-outline"
            id="btn-delete-account"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={15} />
            Eliminar cuenta
          </button>
        ) : (
          <div className="delete-confirm-box">
            <p>¿Seguro que quieres eliminar <strong>{account.name}</strong>? Esta acción no se puede deshacer.</p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowDeleteConfirm(false)}
                id="btn-cancel-delete-account"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                id="btn-confirm-delete-account"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseSheet>
  );
}
