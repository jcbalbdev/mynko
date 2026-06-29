import React, { useState, useMemo } from 'react';
import './CreditView.css';
import { CreditCard, ChevronRight, ChevronLeft, ArrowDownLeft, ArrowUpRight, Inbox } from 'lucide-react';
import { computeCreditDebt, calcTceaInterest, CREDIT_COLOR } from '../utils/accounts';
import { CREDIT_PAYMENT_CATEGORY } from '../utils/categories';
import { formatAmount } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';
import { useGroupedByDate } from '../hooks/useGroupedByDate';
import TransactionRow          from './ui/TransactionRow';
import DateGroupHeader         from './ui/DateGroupHeader';
import CreditChargeEditSheet   from './CreditChargeEditSheet';

/* ── Helpers ── */
function installmentLabel(charge) {
  if (charge.installments <= 1) return null;
  const start   = new Date(charge.date);
  const now     = new Date();
  let months    = (now.getFullYear() - start.getFullYear()) * 12
                + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) months += 1;
  const elapsed = Math.min(charge.installments, Math.max(0, months));
  return `Cuota ${elapsed}/${charge.installments}`;
}

/* ══════════════════════════════════════
   DRILL VIEW — detalle de una tarjeta
══════════════════════════════════════ */
function CreditDrillView({ account, charges, payments, onBack, onDeleteCharge, onUpdateCharge, onPressExpense }) {
  const [selectedChargeId, setSelectedChargeId] = useState(null);

  const debt      = computeCreditDebt(account, charges, payments);
  const interest  = calcTceaInterest(account, debt);
  const limit     = account.creditLimit ?? 0;
  const available = limit > 0 ? Math.max(0, limit - debt) : null;
  const pct       = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;
  const cur       = getCurrencyByCode(account.currency);

  // Map charges + payments to TransactionRow-compatible records
  const allRecords = useMemo(() => {
    const chargeRecs = charges.map(c => ({
      id:          `charge-${c.id}`,
      type:        'personal',
      category:    c.category || 'other',
      description: c.description || 'Consumo',
      amount:      c.amount,
      currency:    c.currency ?? account.currency,
      date:        c.date,
      _installmentLabel: installmentLabel(c),
    }));
    const paymentRecs = payments.map(p => ({ ...p, type: 'ingreso' }));
    return [...chargeRecs, ...paymentRecs];
  }, [charges, payments, account.currency]);

  const { grouped, dateKeys } = useGroupedByDate(allRecords);

  function groupTotals(records) {
    let income = 0, expense = 0;
    records.forEach(r => {
      if (r.type === 'ingreso') income  += r.amount;
      else                      expense += r.amount;
    });
    return { income, expense };
  }

  const handleRowPress = (rec) => {
    if (rec.id.startsWith('charge-')) {
      const originalId = rec.id.replace(/^charge-/, '');
      const charge = charges.find(c => String(c.id) === originalId);
      if (charge) setSelectedChargeId(charge.id);
    } else {
      const original = payments.find(p => p.id === rec.id);
      if (original) onPressExpense?.(original);
    }
  };

  const selectedCharge = selectedChargeId ? charges.find(c => c.id === selectedChargeId) : null;

  return (
    <>
    <div className="credit-drill">
      {/* Back */}
      <button className="credit-drill-back" onClick={onBack}>
        <ChevronLeft size={14} strokeWidth={3} />
        Mis tarjetas
      </button>

      {/* Card summary — shows only Disponible */}
      <div className="credit-drill-card" style={{ background: CREDIT_COLOR }}>
        {available !== null && (
          <>
            <div className="credit-drill-card-avail-label">Disponible</div>
            <div className="credit-drill-card-avail-row">
              <span className="credit-drill-card-avail-sym">{cur.symbol}</span>
              <span className="credit-drill-card-avail-amt">
                {available.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
        {limit > 0 && (
          <div className="credit-drill-bar">
            <div className="credit-drill-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
        {interest && (
          <div className="credit-drill-interest">
            <div className="credit-drill-interest-row">
              <span className="credit-drill-interest-label">Interés acumulado</span>
              <span className="credit-drill-interest-value">
                +{formatAmount(interest.accruedInterest)} {account.currency}
              </span>
            </div>
            {interest.projectedDebt && interest.daysToPayment > 0 && (
              <div className="credit-drill-interest-row">
                <span className="credit-drill-interest-label">
                  Al día {account.paymentDay} ({interest.daysToPayment}d)
                </span>
                <span className="credit-drill-interest-value">
                  ~{formatAmount(interest.projectedDebt)} {account.currency}
                </span>
              </div>
            )}
            <div className="credit-drill-interest-daily">
              +{formatAmount(interest.dailyAmount)} {account.currency}/día
            </div>
          </div>
        )}
      </div>

      {/* Transactions — gastos-style */}
      {dateKeys.length === 0 ? (
        <div className="credit-drill-empty">
          <Inbox size={32} strokeWidth={1.5} />
          <p>Sin movimientos</p>
          <span>Registra un consumo o un pago</span>
        </div>
      ) : (
        <div className="credit-txns">
          {dateKeys.map(dateKey => (
            <div key={dateKey} className="exp-date-group">
              <DateGroupHeader
                label={dateKey}
                currency={account.currency}
                {...groupTotals(grouped[dateKey])}
              />
              <div className="exp-day-block">
                {grouped[dateKey].map((rec, idx) => (
                  <React.Fragment key={rec.id}>
                    {idx > 0 && <div className="exp-day-divider" />}
                    <TransactionRow record={rec} onPress={handleRowPress} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          <div style={{ height: 110 }} />
        </div>
      )}
    </div>

    {selectedCharge && (
      <CreditChargeEditSheet
        charge={selectedCharge}
        accountName={account.name}
        onClose={() => setSelectedChargeId(null)}
        onDelete={onDeleteCharge}
        onUpdate={onUpdateCharge}
      />
    )}
    </>
  );
}

/* ══════════════════════════════════════
   MAIN VIEW — lista de tarjetas
══════════════════════════════════════ */
export default function CreditView({ accounts, charges, expenses, drillId, onDrillChange, onAddCharge, onAddPayment, onDeleteCharge, onUpdateCharge, onPressExpense }) {
  const creditAccounts = useMemo(
    () => accounts.filter(a => a.isCredit),
    [accounts]
  );

  const creditPayments = useMemo(
    () => expenses.filter(e => e.category === CREDIT_PAYMENT_CATEGORY.id),
    [expenses]
  );

  const drillAccount = drillId ? creditAccounts.find(a => a.id === drillId) : null;

  if (creditAccounts.length === 0) {
    return (
      <div className="credit-empty">
        <CreditCard size={48} strokeWidth={1.2} style={{ color: '#c7c7cc' }} />
        <p>Sin tarjetas de crédito</p>
        <span>Agrega una cuenta de tipo crédito desde la sección Cuentas</span>
      </div>
    );
  }

  const fab = (
    <div className="credit-fab-wrap">
      <button
        className="credit-fab-pill credit-fab-pill--charge"
        onClick={() => onAddCharge(drillId)}
      >
        <ArrowUpRight size={16} strokeWidth={2.5} />
        Consumo
      </button>
      <button
        className="credit-fab-pill credit-fab-pill--pay"
        onClick={() => onAddPayment(drillId)}
      >
        <ArrowDownLeft size={16} strokeWidth={2.5} />
        Pagar
      </button>
    </div>
  );

  if (drillAccount) {
    return (
      <>
        <CreditDrillView
          account={drillAccount}
          charges={charges.filter(c => c.accountId === drillId)}
          payments={creditPayments.filter(p => p.creditAccountId === drillId)}
          onBack={() => onDrillChange(null)}
          onDeleteCharge={onDeleteCharge}
          onUpdateCharge={onUpdateCharge}
          onPressExpense={onPressExpense}
        />
        {fab}
      </>
    );
  }

  return (
    <>
    <div className="credit-list">
      {creditAccounts.map(account => {
        const debt      = computeCreditDebt(account, charges, creditPayments);
        const interest  = calcTceaInterest(account, debt);
        const limit     = account.creditLimit ?? 0;
        const available = limit > 0 ? Math.max(0, limit - debt) : null;
        const pct       = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;

        return (
          <button
            key={account.id}
            className="credit-card-item"
            onClick={() => onDrillChange(account.id)}
          >
            <div className="credit-card-item-strip" />
            <div className="credit-card-item-body">
              <div className="credit-card-item-header">
                <span className="credit-card-item-name">{account.name}</span>
                <span className="credit-card-item-debt">
                  {formatAmount(debt)} {account.currency}
                </span>
              </div>
              {limit > 0 && (
                <>
                  <div className="credit-card-item-bar">
                    <div className="credit-card-item-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="credit-card-item-footer">
                    <span className="credit-card-item-label">Deuda actual</span>
                    <span className="credit-card-item-avail">
                      Disponible: {formatAmount(available)} {account.currency}
                    </span>
                  </div>
                </>
              )}
              {account.paymentDay && (
                <span className="credit-card-item-due">Pago el día {account.paymentDay}</span>
              )}
              {interest && interest.dailyAmount > 0 && (
                <span className="credit-card-item-interest">
                  +{formatAmount(interest.dailyAmount)} {account.currency}/día en intereses
                </span>
              )}
            </div>
            <ChevronRight size={16} strokeWidth={2} style={{ color: '#c7c7cc', flexShrink: 0 }} />
          </button>
        );
      })}
      <div style={{ height: 110 }} />
    </div>
    {fab}
    </>
  );
}
