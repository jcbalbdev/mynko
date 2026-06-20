/**
 * AccountsScreen.jsx
 * Main screen for the Accounts section.
 *
 * Shows:
 * - Summary total across all accounts
 * - List of account cards (name, type, currency, real balance)
 * - FAB-style buttons: New Account + New Transfer
 */
import React, { useState } from 'react';
import { Plus, ArrowLeftRight, Banknote, Building2, PiggyBank, Wallet } from 'lucide-react';
import './AccountsScreen.css';
import AddAccountSheet    from './AddAccountSheet';
import AccountDetailSheet from './AccountDetailSheet';
import TransferSheet      from './TransferSheet';
import { getCurrencyByCode }   from '../utils/currencies';
import { getAccountTypeColor, getAccountTypeLabel, computeAccountBalance } from '../utils/accounts';

const TYPE_ICONS = {
  efectivo: Banknote,
  banco:    Building2,
  ahorro:   PiggyBank,
};

/* ── Single account card ── */
function AccountCard({ account, expenses, onClick }) {
  const Icon        = TYPE_ICONS[account.type] ?? Banknote;
  const color       = getAccountTypeColor(account.type);
  const realBalance = computeAccountBalance(account, expenses);
  const cur         = getCurrencyByCode(account.currency);
  const isNegative  = realBalance < 0;

  return (
    <button
      className="account-card"
      style={{ '--acc-color': color }}
      onClick={onClick}
      id={`account-card-${account.id}`}
      type="button"
    >
      <div className="account-card-icon">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="account-card-info">
        <span className="account-card-name">{account.name}</span>
        <span className="account-card-type">{getAccountTypeLabel(account.type)}</span>
      </div>
      <div className="account-card-balance-block">
        <span className={`account-card-balance${isNegative ? ' negative' : ''}`}>
          {cur.symbol} {realBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="account-card-currency">{cur.symbol}</span>
      </div>
    </button>
  );
}

/* ══════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════ */
export default function AccountsScreen({
  accounts = [],
  expenses = [],
  transfers = [],
  defaultCurrency = 'MXN',
  onAdd,
  onUpdate,
  onDelete,
  onTransfer,
}) {
  const [showAddSheet,      setShowAddSheet]      = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [selectedAccount,   setSelectedAccount]   = useState(null);

  /* Total balance across all accounts (in their own currencies — shown as a list) */
  const balanceByCurrency = accounts.reduce((map, acc) => {
    const real = computeAccountBalance(acc, expenses);
    const code = acc.currency;
    map[code] = (map[code] ?? 0) + real;
    return map;
  }, {});

  return (
    <div className="accounts-screen">

      {/* ── Header ── */}
      <div className="accounts-header">
        <div className="accounts-header-icon">
          <Wallet size={26} strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="accounts-header-title">Cuentas</h1>
          <p className="accounts-header-subtitle">
            {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
          </p>
        </div>
      </div>

      {/* ── Balance summary ── */}
      {Object.keys(balanceByCurrency).length > 0 && (
        <div className="accounts-balance-summary">
          {Object.entries(balanceByCurrency).map(([code, total]) => {
            const cur = getCurrencyByCode(code);
            return (
              <div key={code} className="accounts-balance-item">
                <span className="accounts-balance-label">Total {code}</span>
                <span className={`accounts-balance-value${total < 0 ? ' negative' : ''}`}>
                  {cur.symbol} {total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="accounts-actions-row">
        <button
          className="accounts-action-btn"
          onClick={() => setShowAddSheet(true)}
          id="btn-new-account"
          type="button"
        >
          <Plus size={18} strokeWidth={2.5} />
          Nueva cuenta
        </button>
        {accounts.length >= 2 && (
          <button
            className="accounts-action-btn secondary"
            onClick={() => setShowTransferSheet(true)}
            id="btn-new-transfer"
            type="button"
          >
            <ArrowLeftRight size={18} strokeWidth={2} />
            Transferir
          </button>
        )}
      </div>

      {/* ── Account list ── */}
      <div className="accounts-list">
        {accounts.length === 0 ? (
          <div className="accounts-empty">
            <Wallet size={48} strokeWidth={1} />
            <p>No tienes cuentas aún.</p>
            <p>Crea tu primera cuenta para comenzar.</p>
          </div>
        ) : (
          accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              expenses={expenses}
              onClick={() => setSelectedAccount(account)}
            />
          ))
        )}
      </div>

      {/* ── Sheets ── */}
      {showAddSheet && (
        <AddAccountSheet
          defaultCurrency={defaultCurrency}
          onAdd={onAdd}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {showTransferSheet && (
        <TransferSheet
          accounts={accounts}
          onTransfer={onTransfer}
          onClose={() => setShowTransferSheet(false)}
        />
      )}

      {selectedAccount && (
        <AccountDetailSheet
          account={selectedAccount}
          expenses={expenses}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
