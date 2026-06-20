import React, { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import BaseSheet from './ui/BaseSheet';
import TransactionRow from './ui/TransactionRow';
import DateGroupHeader from './ui/DateGroupHeader';
import EmptyState from './ui/EmptyState';
import { useGroupedByDate } from '../hooks/useGroupedByDate';

function isIncomeRecord(r) {
  if (r._isOutflow) return false;
  return r.type === 'ingreso' || r.type === 'cambio';
}

function groupTotals(records) {
  let income = 0, expense = 0;
  records.forEach(r => {
    const amt = r._isOutflow ? (r.fromAmount ?? r.amount) : r.amount;
    if (isIncomeRecord(r)) income  += amt;
    else                    expense += amt;
  });
  return { income, expense };
}

function transferToRecord(t, account, accounts) {
  const isOutgoing = t.fromAccountId === account.id;
  const otherAccId = isOutgoing ? t.toAccountId : t.fromAccountId;
  const otherAcc   = accounts.find(a => a.id === otherAccId);
  const otherName  = otherAcc?.name ?? 'Otra cuenta';
  return {
    id:          `transfer-${t.id}`,
    type:        isOutgoing ? 'personal' : 'ingreso',
    category:    'transfer',
    description: t.note || otherName,
    amount:      t.amount,
    currency:    t.currency,
    date:        t.date,
  };
}

export default function AccountTransactionsSheet({ account, expenses = [], transfers = [], accounts = [], onClose }) {
  const allRecords = useMemo(() => {
    const expFiltered = expenses
      .filter(e =>
        e.accountId === account.id ||
        (e.type === 'cambio' && e.fromAccountId === account.id)
      )
      .map(e => {
        if (e.type === 'cambio' && e.fromAccountId === account.id && e.accountId !== account.id) {
          return { ...e, _isOutflow: true };
        }
        return e;
      });
    const txFiltered = transfers
      .filter(t => t.fromAccountId === account.id || t.toAccountId === account.id)
      .map(t => transferToRecord(t, account, accounts));
    return [...expFiltered, ...txFiltered];
  }, [expenses, transfers, accounts, account]);

  const { grouped, dateKeys: groupKeys } = useGroupedByDate(allRecords);
  const currency  = account.currency ?? 'PEN';

  return (
    <BaseSheet title={account.name} onClose={onClose}>
      {allRecords.length > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          <span style={{ color: 'var(--label-tertiary)', fontSize: 13 }}>
            {allRecords.length} movimiento{allRecords.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div style={{ overflowY: 'auto', maxHeight: '70vh', padding: '0 var(--space-md)', paddingBottom: 32 }}>
        {groupKeys.length === 0 ? (
          <EmptyState Icon={Inbox} title="Sin movimientos" />
        ) : (
          groupKeys.map(dateKey => (
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
      </div>
    </BaseSheet>
  );
}
