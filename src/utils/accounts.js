/**
 * utils/accounts.js
 * Pure helpers for accounts feature.
 */

/** Icon name by account type (lucide-react) */
export const ACCOUNT_TYPE_ICONS = {
  efectivo: 'Banknote',
  banco:    'Building2',
  ahorro:   'PiggyBank',
};

/** Accent color per account type */
export const ACCOUNT_TYPE_COLORS = {
  efectivo: '#34A853',
  banco:    '#4285F4',
  ahorro:   '#FBBC05',
};

/** Human-readable label per type */
export const ACCOUNT_TYPE_LABELS = {
  efectivo: 'Efectivo',
  banco:    'Banco',
  ahorro:   'Ahorro',
};

export const CREDIT_COLOR = '#7C3AED';
export const CREDIT_ICON  = 'CreditCard';

export function isCreditAccount(account) {
  return account?.isCredit === true;
}

export function getAccountTypeColor(type) {
  return ACCOUNT_TYPE_COLORS[type] ?? '#8e8e93';
}

export function getAccountTypeLabel(type) {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

/**
 * Compute how much of a credit charge has accrued as debt up to today.
 * Sin cuotas (installments=1): full amount immediately.
 * Con cuotas: installmentAmount × elapsed months (capped at total installments).
 */
function accrueChargeDebt(charge) {
  if (charge.installments === 1) return charge.amount;
  const start = new Date(charge.date);
  const now   = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12
             + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) months += 1;
  const due     = Math.min(charge.installments, Math.max(0, months));
  const instAmt = charge.installmentAmount ?? charge.amount / charge.installments;
  return Math.round(due * instAmt * 100) / 100;
}

/**
 * Calculate interest info for a credit account using TCEA (compound interest).
 * Returns null if tcea or cutDay is not set, or debt is zero.
 */
export function calcTceaInterest(account, currentDebt) {
  if (!account.tcea || !account.cutDay || currentDebt <= 0) return null;

  const dailyRate = Math.pow(1 + account.tcea / 100, 1 / 365) - 1;
  const now       = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today     = now.getDate();

  // Last cut date (previous month if today < cutDay)
  const lastCut = today >= account.cutDay
    ? new Date(now.getFullYear(), now.getMonth(),     account.cutDay)
    : new Date(now.getFullYear(), now.getMonth() - 1, account.cutDay);

  const daysSinceCut   = Math.round((todayDate - lastCut) / 86400000);
  const accruedInterest = Math.round(
    currentDebt * (Math.pow(1 + dailyRate, daysSinceCut) - 1) * 100
  ) / 100;
  const dailyAmount = Math.round(currentDebt * dailyRate * 100) / 100;

  let daysToPayment = null;
  let projectedDebt = null;
  if (account.paymentDay) {
    const nextPay = today < account.paymentDay
      ? new Date(now.getFullYear(), now.getMonth(),     account.paymentDay)
      : new Date(now.getFullYear(), now.getMonth() + 1, account.paymentDay);
    daysToPayment = Math.round((nextPay - todayDate) / 86400000);
    projectedDebt = Math.round(
      currentDebt * Math.pow(1 + dailyRate, daysToPayment) * 100
    ) / 100;
  }

  return { dailyRate, daysSinceCut, accruedInterest, dailyAmount, daysToPayment, projectedDebt };
}

/**
 * Compute the current debt of a credit account (positive number).
 * Debt = initial debt + accrued charges - payments made to this card.
 */
export function computeCreditDebt(account, charges = [], paymentExpenses = []) {
  const initialDebt    = Math.max(0, -(account.balance ?? 0));
  const chargesTotal   = charges
    .filter(c => c.accountId === account.id)
    .reduce((sum, c) => sum + accrueChargeDebt(c), 0);
  const paymentsTotal  = paymentExpenses
    .filter(p => p.creditAccountId === account.id)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, Math.round((initialDebt + chargesTotal - paymentsTotal) * 100) / 100);
}

/**
 * Calculate the real balance of an account considering linked transactions.
 *
 * Rules per transaction type:
 *   ingreso    → +amount  (money received into this account)
 *   gasto/etc  → -amount  (money spent from this account)
 *   cambio (accountId     === account.id) → +amount      (currency received)
 *   cambio (fromAccountId === account.id) → -fromAmount  (currency delivered)
 */
export function computeAccountBalance(account, expenses = []) {
  if (!account) return 0;

  let delta = 0;

  for (const e of expenses) {
    if (e.type === 'cambio') {
      // Destination account — receives the converted amount
      if (e.accountId === account.id) {
        delta += e.amount;
      }
      // Origin account — delivers the from-amount
      if (e.fromAccountId === account.id) {
        delta -= (e.fromAmount ?? 0);
      }
    } else if (e.accountId === account.id) {
      if (e.type === 'ingreso') {
        delta += e.amount;
      } else {
        // gastos, compartido, etc.
        delta -= e.amount;
      }
    }
  }

  // Round to 2 decimal places to avoid floating-point drift
  return Math.round((account.balance + delta) * 100) / 100;
}
