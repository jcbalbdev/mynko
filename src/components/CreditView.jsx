/**
 * CreditView.jsx
 * Vista principal de la sección Crédito.
 * Muestra todas las tarjetas de crédito con su deuda actual.
 * Al hacer tap en una tarjeta → vista detalle con consumos y pagos.
 */
import React, { useState, useMemo } from 'react';
import './CreditView.css';
import { CreditCard, ChevronRight, ChevronLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { computeCreditDebt, calcTceaInterest, CREDIT_COLOR } from '../utils/accounts';
import { CREDIT_PAYMENT_CATEGORY } from '../utils/categories';
import { formatAmount, friendlyDate } from '../utils/expenses';

/* ── Helpers ── */
function installmentLabel(charge) {
  if (charge.installments <= 1) return null;
  const start    = new Date(charge.date);
  const now      = new Date();
  let months     = (now.getFullYear() - start.getFullYear()) * 12
                 + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) months += 1;
  const elapsed  = Math.min(charge.installments, Math.max(0, months));
  return `Cuota ${elapsed}/${charge.installments}`;
}

/* ══════════════════════════════════════
   DRILL VIEW — detalle de una tarjeta
══════════════════════════════════════ */
function CreditDrillView({ account, charges, payments, onBack }) {
  // Merge charges and payments into a single chronological list
  const timeline = useMemo(() => {
    const items = [
      ...charges.map(c  => ({ ...c,  _kind: 'charge'  })),
      ...payments.map(p => ({ ...p,  _kind: 'payment' })),
    ];
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [charges, payments]);

  const debt      = computeCreditDebt(account, charges, payments);
  const interest  = calcTceaInterest(account, debt);
  const limit     = account.creditLimit ?? 0;
  const available = limit > 0 ? Math.max(0, limit - debt) : null;
  const pct       = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;

  return (
    <div className="credit-drill">
      {/* Back */}
      <button className="credit-drill-back" onClick={onBack}>
        <ChevronLeft size={14} strokeWidth={3} />
        Mis tarjetas
      </button>

      {/* Card summary */}
      <div className="credit-drill-card" style={{ background: CREDIT_COLOR }}>
        <div className="credit-drill-card-name">{account.name}</div>
        <div className="credit-drill-card-debt">
          <span className="credit-drill-card-debt-label">Deuda actual</span>
          <span className="credit-drill-card-debt-amount">
            {formatAmount(debt)} {account.currency}
          </span>
        </div>
        {available !== null && (
          <div className="credit-drill-card-avail">
            Disponible: {formatAmount(available)} {account.currency}
          </div>
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

      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="credit-drill-empty">
          <p>Sin movimientos</p>
          <span>Registra un consumo o un pago</span>
        </div>
      ) : (
        <div className="credit-timeline">
          {timeline.map(item =>
            item._kind === 'charge' ? (
              <div key={item.id} className="credit-timeline-row credit-timeline-row--charge">
                <div className="credit-timeline-icon credit-timeline-icon--charge">
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                </div>
                <div className="credit-timeline-info">
                  <span className="credit-timeline-desc">
                    {item.description || 'Consumo'}
                  </span>
                  <span className="credit-timeline-meta">
                    {friendlyDate(item.date)}
                    {installmentLabel(item) && (
                      <span className="credit-timeline-badge">{installmentLabel(item)}</span>
                    )}
                  </span>
                </div>
                <span className="credit-timeline-amount credit-timeline-amount--charge">
                  -{formatAmount(item.amount)} {item.currency}
                </span>
              </div>
            ) : (
              <div key={item.id} className="credit-timeline-row credit-timeline-row--payment">
                <div className="credit-timeline-icon credit-timeline-icon--payment">
                  <ArrowDownLeft size={14} strokeWidth={2.5} />
                </div>
                <div className="credit-timeline-info">
                  <span className="credit-timeline-desc">
                    {item.description || 'Pago'}
                  </span>
                  <span className="credit-timeline-meta">{friendlyDate(item.date)}</span>
                </div>
                <span className="credit-timeline-amount credit-timeline-amount--payment">
                  +{formatAmount(item.amount)} {item.currency}
                </span>
              </div>
            )
          )}
          <div style={{ height: 110 }} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN VIEW — lista de tarjetas
══════════════════════════════════════ */
export default function CreditView({ accounts, charges, expenses, onAddCharge, onAddPayment }) {
  const [drillId, setDrillId] = useState(null);

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
          onBack={() => setDrillId(null)}
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
            onClick={() => setDrillId(account.id)}
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
