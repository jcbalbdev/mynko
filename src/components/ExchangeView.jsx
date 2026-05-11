/**
 * ExchangeView.jsx
 * Shows account-linked exchange balances and exchange history.
 *
 * "Saldo por cuenta" — shows the net impact of exchange records on each account.
 * "Historial de cambios" — lists all cambio records with origin/destination accounts.
 */
import React, { useMemo } from 'react';
import './ExchangeView.css';
import { formatAmount } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';
import { getAccountTypeLabel } from '../utils/accounts';

/* Exchange record card */
function ExchangeCard({ record, accounts = [] }) {
  const fromCur  = getCurrencyByCode(record.fromCurrency ?? 'USD');
  const toCur    = getCurrencyByCode(record.currency ?? 'PEN');
  const fromAcc  = accounts.find(a => a.id === record.fromAccountId);
  const toAcc    = accounts.find(a => a.id === record.accountId);
  const date     = new Date(record.date);
  const dateStr  = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr  = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="exchange-card">
      <div className="exchange-card-icon">🔄</div>
      <div className="exchange-card-info">
        <div className="exchange-card-title">
          <span className="exchange-card-from">{formatAmount(record.fromAmount)} {fromCur.code}</span>
          <span className="exchange-card-arrow">→</span>
          <span className="exchange-card-to">{formatAmount(record.amount)} {toCur.code}</span>
        </div>

        {/* Account route */}
        {(fromAcc || toAcc) && (
          <div className="exchange-card-accounts">
            <span className="exchange-card-acc">{fromAcc?.name ?? '—'}</span>
            <span className="exchange-card-acc-arrow">→</span>
            <span className="exchange-card-acc">{toAcc?.name ?? '—'}</span>
          </div>
        )}

        {record.exchangeRate > 0 && (
          <div className="exchange-card-rate">
            1 {fromCur.code} = {record.exchangeRate?.toFixed(4)} {toCur.code}
          </div>
        )}
        <div className="exchange-card-date">{dateStr} · {timeStr}</div>
      </div>
    </div>
  );
}

export default function ExchangeView({ expenses, accounts = [] }) {
  const exchanges = useMemo(() =>
    expenses.filter(e => e.type === 'cambio')
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [expenses]
  );

  /*
   * Net balance impact per account from exchange records:
   *   destination account (+amount in toCurrency)
   *   origin account      (-fromAmount in fromCurrency)
   */
  const accountImpacts = useMemo(() => {
    if (accounts.length === 0) return [];

    const map = {}; // accountId → { account, currency, net }

    exchanges.forEach(e => {
      // Destination
      if (e.accountId) {
        const acc = accounts.find(a => a.id === e.accountId);
        if (acc) {
          const key = acc.id;
          if (!map[key]) map[key] = { account: acc, currency: e.currency, net: 0 };
          map[key].net += e.amount;
        }
      }
      // Origin
      if (e.fromAccountId) {
        const acc = accounts.find(a => a.id === e.fromAccountId);
        if (acc) {
          const key = acc.id;
          if (!map[key]) map[key] = { account: acc, currency: e.fromCurrency, net: 0 };
          map[key].net -= (e.fromAmount ?? 0);
        }
      }
    });

    return Object.values(map);
  }, [exchanges, accounts]);

  return (
    <div className="exchange-view">

      {/* ── Account balance impacts ── */}
      {accountImpacts.length > 0 ? (
        <div className="exchange-totals-section">
          <div className="exchange-section-title">Saldo por cuenta</div>
          <div className="exchange-totals-grid">
            {accountImpacts.map(({ account, currency, net }) => {
              const cur = getCurrencyByCode(currency ?? 'MXN');
              return (
                <div key={account.id} className="exchange-total-card">
                  <div className="exchange-total-top">
                    <span className="exchange-total-code">{account.name}</span>
                    <span className="exchange-total-name">{getAccountTypeLabel(account.type)} · {cur.code}</span>
                  </div>
                  <span
                    className="exchange-total-amount"
                    style={{ color: net >= 0 ? '#34A853' : '#EA4335' }}
                  >
                    {net >= 0 ? '+' : ''}{formatAmount(net)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="exchange-empty-totals">
          <p>Sin cambios de moneda registrados aún.</p>
        </div>
      )}

      {/* ── Exchange history ── */}
      <div className="exchange-history-section">
        <div className="exchange-section-title">Historial de cambios</div>
        {exchanges.length > 0 ? (
          <div className="exchange-history-list">
            {exchanges.map(e => (
              <ExchangeCard key={e.id} record={e} accounts={accounts} />
            ))}
          </div>
        ) : (
          <p className="exchange-empty-text">Sin cambios de moneda registrados.</p>
        )}
      </div>

      <div style={{ height: 110 }} />
    </div>
  );
}
