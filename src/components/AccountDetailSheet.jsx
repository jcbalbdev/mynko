/**
 * AccountDetailSheet.jsx
 * Sheet to view and edit an existing account (debit or credit).
 */
import { useState } from 'react';
import { Banknote, Building2, PiggyBank, CreditCard, Trash2, Bell } from 'lucide-react';
import './AccountDetailSheet.css';
import BaseSheet      from './ui/BaseSheet';
import FormSection    from './ui/FormSection';
import { getCurrencyByCode } from '../utils/currencies';
import { getAccountTypeColor, getAccountTypeLabel, computeAccountBalance, CREDIT_COLOR } from '../utils/accounts';

const TYPE_ICONS = {
  efectivo: Banknote,
  banco:    Building2,
  ahorro:   PiggyBank,
};


export default function AccountDetailSheet({ account, expenses = [], onUpdate, onDelete, onClose }) {
  const [name,         setName]         = useState(account.name);
  const [type,         setType]         = useState(account.type);
const [balanceInput, setBalanceInput] = useState(account.balance.toString());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Min-balance alert state (debit only)
  const [minBalanceEnabled,   setMinBalanceEnabled]   = useState(account.minBalanceEnabled ?? false);
  const [minBalanceThreshold, setMinBalanceThreshold] = useState(account.minBalanceThreshold?.toString() ?? '');

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
      const newLimit = parseFloat(creditLimit);
      if (!isNaN(newLimit) && newLimit !== account.creditLimit) updates.creditLimit = newLimit;
      const newCut = parseInt(cutDay);
      if (!isNaN(newCut) && newCut !== account.cutDay) updates.cutDay = newCut;
      const newPay = parseInt(paymentDay);
      if (!isNaN(newPay) && newPay !== account.paymentDay) updates.paymentDay = newPay;
      const newTcea = tcea ? parseFloat(tcea) : null;
      if (newTcea !== account.tcea) updates.tcea = newTcea;
    } else {
      if (name.trim() !== account.name) updates.name = name.trim();
      if (type         !== account.type) updates.type = type;
      if (!account.hasBeenSet && balanceDirty) {
        updates.balance = parseFloat(balanceInput) || 0;
      }
      // Min-balance alert
      if (minBalanceEnabled !== account.minBalanceEnabled) {
        updates.minBalanceEnabled  = minBalanceEnabled;
        updates.minBalanceNotified = false; // reset so next crossing re-notifies
      }
      const newThreshold = minBalanceEnabled && minBalanceThreshold !== ''
        ? parseFloat(minBalanceThreshold)
        : null;
      if (newThreshold !== account.minBalanceThreshold) {
        updates.minBalanceThreshold = newThreshold;
        updates.minBalanceNotified  = false; // threshold changed → re-arm
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
    <BaseSheet title="Información de la cuenta" onClose={onClose}>

      {/* ── Balance hero ── */}
      {account.isCredit ? (
        <div className="account-detail-balance-hero">
          <span className="account-detail-hero-label">Deuda actual</span>
          <span className="account-detail-hero-value">
            {cur.symbol} {currentDebt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {creditLimitN > 0 && (
            <>
              <div className="credit-progress-bar">
                <div className="credit-progress-fill" style={{ width: `${debtRatio * 100}%` }} />
              </div>
              <span className="credit-available-text">
                Disponible: {cur.symbol} {available.toLocaleString('es-MX', { minimumFractionDigits: 2 })} de {cur.symbol} {creditLimitN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="account-detail-balance-hero">
          <span className="account-detail-hero-label">Saldo actual</span>
          <span className={`account-detail-hero-value${realBalance < 0 ? ' negative' : ''}`}>
            {realBalance < 0 ? '-' : ''}{cur.symbol} {Math.abs(realBalance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
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
          <FormSection label="Fechas del ciclo">
            <div className="credit-dates-inputs">
              <div className="credit-date-field">
                <span className="credit-date-sublabel">Corte</span>
                <input className="text-input" type="number" inputMode="numeric" min="1" max="31" value={cutDay} onChange={e => setCutDay(e.target.value)} />
                <p className="form-hint-text">Día del mes</p>
              </div>
              <div className="credit-date-field">
                <span className="credit-date-sublabel">Pago</span>
                <input className="text-input" type="number" inputMode="numeric" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} />
                <p className="form-hint-text">Día del mes</p>
              </div>
            </div>
          </FormSection>
          <FormSection label="TCEA" hint="(opcional)">
            <div className="amount-input-wrapper">
              <input className="amount-input-field" type="number" inputMode="decimal" min="0" step="0.01" value={tcea} onChange={e => setTcea(e.target.value)} />
              <span className="amount-input-suffix">%</span>
            </div>
          </FormSection>
        </>
      ) : (
        <>
          <FormSection label="Alerta de saldo mínimo">
            <div className="min-balance-alert-row">
              <div className="min-balance-alert-label">
                <Bell size={14} strokeWidth={2} />
                <span>Notificarme cuando baje de</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={minBalanceEnabled}
                className={`toggle-switch${minBalanceEnabled ? ' active' : ''}`}
                onClick={() => setMinBalanceEnabled(v => !v)}
              />
            </div>
            <div className={`min-balance-input-wrap${minBalanceEnabled ? '' : ' disabled'}`} style={{ marginTop: 10, padding: '0 var(--space-md)' }}>
              <input
                className="amount-input-field"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={minBalanceThreshold}
                onChange={e => setMinBalanceThreshold(e.target.value)}
                disabled={!minBalanceEnabled}
              />
            </div>
            <p className="form-hint-text">Recibirás un aviso cuando tu saldo esté cerca o por debajo de este monto.</p>
          </FormSection>
        </>
      )}

      {/* ── Actions ── */}
      <div className="account-detail-actions">
        <button type="button" className="btn-save-primary" onClick={handleSave} id="btn-save-account">
          Guardar cambios
        </button>

        {!showDeleteConfirm ? (
          <button type="button" className="btn-danger-solid" id="btn-delete-account" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={15} />
            Eliminar cuenta
          </button>
        ) : (
          <div className="delete-confirm-box">
            <p>¿Seguro que quieres eliminar <strong>{account.name}</strong>? Esta acción no se puede deshacer.</p>
            <div className="delete-confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowDeleteConfirm(false)} id="btn-cancel-delete-account">Cancelar</button>
              <button type="button" className="btn-danger" onClick={handleDelete} id="btn-confirm-delete-account">Eliminar</button>
            </div>
          </div>
        )}
      </div>
    </BaseSheet>
  );
}
