import React, { useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import './ExchangeView.css';
import { formatAmount } from '../utils/expenses';
import { getCurrencyByCode } from '../utils/currencies';
import { getAccountTypeLabel, computeAccountBalance } from '../utils/accounts';

function ExchangeCard({ record, accounts = [] }) {
  const fromCur = getCurrencyByCode(record.fromCurrency ?? 'USD');
  const toCur   = getCurrencyByCode(record.currency ?? 'PEN');
  const fromAcc = accounts.find(a => a.id === record.fromAccountId);
  const toAcc   = accounts.find(a => a.id === record.accountId);
  const date    = new Date(record.date);
  const dateStr = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="exchange-card">
      <div className="exchange-card-icon">
        <ArrowLeftRight size={18} strokeWidth={2.5} />
      </div>
      <div className="exchange-card-info">
        <div className="exchange-card-title">
          <span className="exchange-card-from">{formatAmount(record.fromAmount)} {fromCur.symbol}</span>
          <span className="exchange-card-arrow">→</span>
          <span className="exchange-card-to">{formatAmount(record.amount)} {toCur.symbol}</span>
        </div>

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

function ExchangeEmptyState() {
  return (
    <div className="exchange-empty-state">
      <div className="exchange-section-title">Saldo por cuenta</div>
      <div className="exchange-totals-grid">
        {[0, 1].map(i => (
          <div key={i} className="exchange-total-card exchange-sk-card">
            <div className="exchange-total-top">
              <div className="exsk-line exsk-line-md" />
              <div className="exsk-line exsk-line-sm" />
            </div>
            <div className="exsk-line exsk-line-lg" />
          </div>
        ))}
      </div>

      <div className="exchange-section-title">Historial de cambios</div>
      <div className="exp-day-block exchange-history-block">
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="exp-day-divider" />}
            <div className="exchange-card exchange-sk-card">
              <div className="exsk-icon" />
              <div className="exchange-card-info">
                <div className="exsk-title-row">
                  <div className="exsk-line exsk-line-md" />
                  <div className="exsk-arrow" />
                  <div className="exsk-line exsk-line-md" />
                </div>
                <div className="exsk-line exsk-line-sm" style={{ marginTop: 7 }} />
                <div className="exsk-line exsk-line-xs" style={{ marginTop: 5 }} />
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <p className="exchange-empty-hint">Toca + para registrar tu primer cambio de moneda.</p>
    </div>
  );
}

export default function ExchangeView({ expenses, accounts = [] }) {
  const exchanges = useMemo(() =>
    expenses.filter(e => e.type === 'cambio')
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [expenses]
  );

  const accountImpacts = useMemo(() => {
    if (accounts.length === 0) return [];
    const involvedIds = new Set();
    exchanges.forEach(e => {
      if (e.accountId)     involvedIds.add(e.accountId);
      if (e.fromAccountId) involvedIds.add(e.fromAccountId);
    });
    return accounts
      .filter(a => involvedIds.has(a.id))
      .map(account => ({
        account,
        currency: account.currency,
        balance: computeAccountBalance(account, expenses),
      }));
  }, [exchanges, accounts, expenses]);

  if (exchanges.length === 0) {
    return (
      <div className="exchange-view">
        <ExchangeEmptyState />
        <div style={{ height: 110 }} />
      </div>
    );
  }

  return (
    <div className="exchange-view">

      {accountImpacts.length > 0 && (
        <div className="exchange-totals-section">
          <div className="exchange-section-title">Saldo por cuenta</div>
          <div className="exchange-totals-grid">
            {accountImpacts.map(({ account, currency, balance }) => {
              const cur = getCurrencyByCode(currency ?? 'MXN');
              return (
                <div key={account.id} className="exchange-total-card">
                  <div className="exchange-total-top">
                    <span className="exchange-total-code">{account.name}</span>
                    <span className="exchange-total-name">{getAccountTypeLabel(account.type)} · {cur.symbol}</span>
                  </div>
                  <span
                    className="exchange-total-amount"
                    style={{ color: balance >= 0 ? '#34A853' : '#EA4335' }}
                  >
                    {balance < 0 ? '-' : ''}{formatAmount(Math.abs(balance))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="exchange-history-section">
        <div className="exchange-section-title">Historial de cambios</div>
        <div className="exp-day-block exchange-history-block">
          {exchanges.map((e, idx) => (
            <React.Fragment key={e.id}>
              {idx > 0 && <div className="exp-day-divider" />}
              <ExchangeCard record={e} accounts={accounts} />
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ height: 110 }} />
    </div>
  );
}
