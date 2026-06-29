import React, { useMemo } from 'react';
import { ArrowLeftRight, Inbox } from 'lucide-react';
import './AccountsCarouselView.css';
import { getCurrencyByCode } from '../utils/currencies';
import { computeAccountBalance, computeCreditDebt } from '../utils/accounts';
import { CREDIT_PAYMENT_CATEGORY, EXPENSE_COLORS } from '../utils/categories';
import { useGroupedByDate } from '../hooks/useGroupedByDate';
import TransactionRow  from './ui/TransactionRow';
import DateGroupHeader from './ui/DateGroupHeader';

const CARD_HEIGHT = 200;
const PEEK        = 60;
const OVERLAP     = CARD_HEIGHT - PEEK;

// Step 7 is coprime with 48 → visits all 48 palette colors before repeating
function getCardColor(idx) {
  return EXPENSE_COLORS[(idx * 7) % EXPENSE_COLORS.length].hex;
}

function transferToRecord(t, account, accounts) {
  const isOutgoing = t.fromAccountId === account.id;
  const otherAcc   = accounts.find(a => a.id === (isOutgoing ? t.toAccountId : t.fromAccountId));
  return {
    id:          `transfer-${t.id}`,
    type:        isOutgoing ? 'personal' : 'ingreso',
    category:    'transfer',
    description: t.note || otherAcc?.name || 'Otra cuenta',
    amount:      t.amount,
    currency:    t.currency,
    date:        t.date,
  };
}

/* ── Inline full transaction list ── */
function InlineTxList({ account, expenses, transfers, accounts }) {
  const allRecords = useMemo(() => {
    const expFiltered = expenses
      .filter(e => e.accountId === account.id || (e.type === 'cambio' && e.fromAccountId === account.id))
      .map(e => (e.type === 'cambio' && e.fromAccountId === account.id && e.accountId !== account.id)
        ? { ...e, _isOutflow: true } : e);
    const txFiltered = transfers
      .filter(t => t.fromAccountId === account.id || t.toAccountId === account.id)
      .map(t => transferToRecord(t, account, accounts));
    return [...expFiltered, ...txFiltered];
  }, [expenses, transfers, accounts, account]);

  const { grouped, dateKeys } = useGroupedByDate(allRecords);
  const currency = account.currency ?? 'PEN';

  function groupTotals(records) {
    let income = 0, expense = 0;
    records.forEach(r => {
      const amt = r._isOutflow ? (r.fromAmount ?? r.amount) : r.amount;
      if (r._isOutflow || (r.type !== 'ingreso' && r.type !== 'cambio')) expense += amt;
      else income += amt;
    });
    return { income, expense };
  }

  return (
    <div className="wallet-inline-txns">
      {allRecords.length > 0 && (
        <p className="wallet-inline-count">
          {allRecords.length} movimiento{allRecords.length !== 1 ? 's' : ''}
        </p>
      )}
      {dateKeys.length === 0 ? (
        <div className="wallet-inline-empty">
          <Inbox size={32} strokeWidth={1.5} />
          <span>Sin movimientos</span>
        </div>
      ) : (
        dateKeys.map(dateKey => (
          <div key={dateKey} className="exp-date-group">
            <DateGroupHeader
              label={dateKey}
              currency={currency}
              {...groupTotals(grouped[dateKey])}
            />
            <div className="exp-day-block">
              {grouped[dateKey].map((rec, idx) => (
                <React.Fragment key={rec.id}>
                  {idx > 0 && <div className="exp-day-divider" />}
                  <TransactionRow record={rec} readonly />
                </React.Fragment>
              ))}
            </div>
          </div>
        ))
      )}
      <div style={{ height: 32 }} />
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function AccountsCarouselView({
  accounts  = [],
  expenses  = [],
  charges   = [],
  transfers = [],
  expandedIdx = -1,
  onExpandedChange,
  onOpenAddAccount,
  onInfo,
  onTransfer,
}) {
  const creditPayments = expenses.filter(e => e.category === CREDIT_PAYMENT_CATEGORY.id);

  const getBalance = (account) => {
    if (account.isCredit) {
      const debt  = computeCreditDebt(account, charges, creditPayments);
      const limit = account.creditLimit ?? 0;
      return { value: limit > 0 ? limit - debt : -debt, label: 'Disponible' };
    }
    return { value: computeAccountBalance(account, expenses), label: 'Saldo' };
  };

  const colorMap = accounts.map((_, idx) => getCardColor(idx));

  const isAnyExpanded = expandedIdx >= 0;

  /* ── EXPANDED MODE ── */
  if (isAnyExpanded) {
    const account = accounts[expandedIdx];
    if (!account) return null;

    const color = colorMap[expandedIdx];
    const cur   = getCurrencyByCode(account.currency);
    const { value: balance, label: balLabel } = getBalance(account);
    const isNeg = balance < 0;

    return (
      <div className="wallet-stack">
        {/* Card face */}
        <div
          className="wallet-card wallet-card--open"
          style={{ '--wc': color, position: 'relative' }}
        >
          <div className="wallet-strip">
            <span className="wallet-strip-name">{account.name}</span>
            <div className="wallet-strip-actions">
              <button
                className="wallet-icon-btn"
                onClick={e => { e.stopPropagation(); onTransfer?.(account); }}
                aria-label="Transferir"
              >
                <ArrowLeftRight size={14} strokeWidth={2.2} />
              </button>
              <button
                className="wallet-icon-btn"
                onClick={e => { e.stopPropagation(); onInfo?.(account); }}
                aria-label="Información"
              >
                <span className="wallet-info-i">i</span>
              </button>
            </div>
          </div>

          <div className="wallet-card-face wallet-card-face--visible">
            <span className="wallet-face-label">{balLabel}</span>
            <div className="wallet-face-amount-row">
              <span className="wallet-face-sym">{cur.symbol}</span>
              <span className={`wallet-face-amt${isNeg ? ' neg' : ''}`}>
                {Math.abs(balance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Full inline transaction list */}
        <InlineTxList
          account={account}
          expenses={expenses}
          transfers={transfers}
          accounts={accounts}
        />
      </div>
    );
  }

  /* ── COLLAPSED MODE ── */
  return (
    <div className="wallet-stack">
      {accounts.map((account, idx) => (
        <div
          key={account.id}
          className="wallet-card"
          style={{
            '--wc': colorMap[idx],
            marginTop: idx === 0 ? 0 : -OVERLAP,
            zIndex: idx + 1,
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={() => onExpandedChange?.(idx)}
        >
          <div className="wallet-strip">
            <span className="wallet-strip-name">{account.name}</span>
            <div className="wallet-strip-actions">
              <button
                className="wallet-icon-btn"
                onClick={e => { e.stopPropagation(); onTransfer?.(account); }}
                aria-label="Transferir"
              >
                <ArrowLeftRight size={14} strokeWidth={2.2} />
              </button>
              <button
                className="wallet-icon-btn"
                onClick={e => { e.stopPropagation(); onInfo?.(account); }}
                aria-label="Información"
              >
                <span className="wallet-info-i">i</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
