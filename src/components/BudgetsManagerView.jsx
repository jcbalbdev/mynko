import React, { useState, useMemo } from 'react';
import { ChevronRight, Bell } from 'lucide-react';
import './BudgetsManagerView.css';
import { CATEGORIES, resolveCategory } from '../utils/categories';
import { getCurrencyByCode } from '../utils/currencies';
import CurrencyPicker from './ui/CurrencyPicker';

const SKIP_CATS  = new Set(['credit_payment', 'initial_balance', 'exchange']);
const ALERTS_KEY = 'budget_alerts_enabled';
const PCT_MIN    = 10;
const PCT_MAX    = 100;

/* ── Helpers ── */
function getAllParentCategories(userCategories) {
  const sys = CATEGORIES.map(c => {
    const ov = userCategories.find(u => u.parent_id === '__override__' && u.name === c.id);
    return { id: c.id, label: c.label, color: ov ? ov.color : c.color };
  });
  const custom = userCategories
    .filter(c => !c.parent_id)
    .map(c => ({ id: c.id, label: c.name, color: c.color }));
  return [...sys, ...custom];
}

function getSubcategoriesOf(parentId, userCategories) {
  return userCategories
    .filter(c => c.parent_id === parentId)
    .map(c => ({ id: c.id, label: c.name, color: c.color }));
}

function isSubcategory(categoryId, userCategories) {
  const cat = userCategories.find(c => c.id === categoryId);
  return !!(cat?.parent_id && cat.parent_id !== '__override__');
}

function matchesCategory(expense, categoryId, userCategories) {
  if (expense.category === categoryId) return true;
  return userCategories.find(c => c.id === expense.category)?.parent_id === categoryId;
}

function monthSpent(expenses, categoryId, userCategories, currency, exactMatch = false) {
  const now = new Date();
  return expenses
    .filter(e => {
      const d = new Date(e.date);
      const catMatch = exactMatch
        ? e.category === categoryId
        : matchesCategory(e, categoryId, userCategories);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth()    === now.getMonth()    &&
        e.type          !== 'ingreso'         &&
        !SKIP_CATS.has(e.category)            &&
        e.currency      === currency          &&
        catMatch
      );
    })
    .reduce((s, e) => s + e.amount, 0);
}

function monthlyAvg(expenses, categoryId, userCategories, currency, months = 3, exactMatch = false) {
  const now = new Date();
  const totals = [];
  for (let i = 1; i <= months; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const tot = expenses
      .filter(e => {
        const ed = new Date(e.date);
        const catMatch = exactMatch
          ? e.category === categoryId
          : matchesCategory(e, categoryId, userCategories);
        return (
          ed.getFullYear() === d.getFullYear() &&
          ed.getMonth()    === d.getMonth()    &&
          e.type           !== 'ingreso'       &&
          !SKIP_CATS.has(e.category)           &&
          e.currency       === currency        &&
          catMatch
        );
      })
      .reduce((s, e) => s + e.amount, 0);
    totals.push(tot);
  }
  const nonZero = totals.filter(t => t > 0);
  return nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
}

function currenciesForCategory(expenses, budgets, categoryId, userCategories, exactMatch = false) {
  const fromExp = expenses
    .filter(e => {
      if (e.type === 'ingreso' || SKIP_CATS.has(e.category)) return false;
      return exactMatch
        ? e.category === categoryId
        : matchesCategory(e, categoryId, userCategories);
    })
    .map(e => e.currency)
    .filter(Boolean);

  const fromBudgets = budgets
    .filter(b => b.categoryId === categoryId)
    .map(b => b.currency);

  return [...new Set([...fromExp, ...fromBudgets])];
}

const fmt = (n) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function BudgetsManagerView({
  budgets        = [],
  userCategories = [],
  defaultCurrency = 'PEN',
  expenses       = [],
  onAdd,
  onUpdate,
  onDelete,
  onTitleChange,
  onSetBack,
}) {
  const [view,          setView]          = useState('list');
  const [subView,       setSubView]       = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => localStorage.getItem(ALERTS_KEY) !== 'false'
  );

  const allCategories = useMemo(
    () => getAllParentCategories(userCategories),
    [userCategories]
  );

  function makePill(info) {
    return (
      <span className="budget-header-pill" style={{ background: info.color }}>
        {info.label}
      </span>
    );
  }

  function backToList() {
    setView('list');
    setSubView(null);
    onTitleChange?.(null);
    onSetBack?.(null);
  }

  function openParent(categoryId) {
    const info = resolveCategory(categoryId, userCategories);
    setView(categoryId);
    setSubView(null);
    onTitleChange?.(makePill(info));
    onSetBack?.(backToList);
  }

  function openSub(parentId, subId) {
    const info = resolveCategory(subId, userCategories);
    setSubView(subId);
    onTitleChange?.(makePill(info));
    onSetBack?.(() => {
      const parentInfo = resolveCategory(parentId, userCategories);
      setSubView(null);
      onTitleChange?.(makePill(parentInfo));
      onSetBack?.(backToList);
    });
  }

  function toggleAlerts() {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    localStorage.setItem(ALERTS_KEY, String(next));
  }

  /* Split categories: Recomendaciones vs Otras */
  const { recommended, others } = useMemo(() => {
    const enriched = allCategories.map(cat => {
      const now = new Date();
      const totalSpent = expenses
        .filter(e => {
          const d = new Date(e.date);
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth()    === now.getMonth()    &&
            e.type          !== 'ingreso'         &&
            !SKIP_CATS.has(e.category)            &&
            matchesCategory(e, cat.id, userCategories)
          );
        })
        .reduce((s, e) => s + e.amount, 0);
      const subs = getSubcategoriesOf(cat.id, userCategories);
      const subHasBudget = subs.some(s => budgets.some(b => b.categoryId === s.id));
      return {
        ...cat,
        totalSpent,
        hasBudget: budgets.some(b => b.categoryId === cat.id),
        subHasBudget,
      };
    });
    const rec = enriched
      .filter(c => c.totalSpent > 0 || c.hasBudget || c.subHasBudget)
      .sort((a, b) => b.totalSpent - a.totalSpent);
    const oth = enriched.filter(c => c.totalSpent === 0 && !c.hasBudget && !c.subHasBudget);
    return { recommended: rec, others: oth };
  }, [allCategories, expenses, userCategories, budgets]);

  /* Sub detail view */
  if (subView) {
    return (
      <BudgetDetailView
        categoryId={subView}
        budgets={budgets}
        userCategories={userCategories}
        expenses={expenses}
        exactMatch={true}
        defaultCurrency={defaultCurrency}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  /* Parent detail view */
  if (view !== 'list') {
    const categoryId = view;
    const subs = getSubcategoriesOf(categoryId, userCategories);
    return (
      <BudgetDetailView
        categoryId={categoryId}
        budgets={budgets}
        userCategories={userCategories}
        expenses={expenses}
        exactMatch={false}
        defaultCurrency={defaultCurrency}
        subcategories={subs}
        onSubOpen={(subId) => openSub(categoryId, subId)}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  /* Row renderer */
  function renderRow(cat) {
    const catBudgets = budgets.filter(b => b.categoryId === cat.id);

    return (
      <button key={cat.id} className="budget-row" onClick={() => openParent(cat.id)}>
        <span className="budget-row-dot" style={{ background: cat.color }} />
        <span className="budget-row-content">
          <span className="budget-row-name">{cat.label}</span>
          {catBudgets.length > 0 ? (
            <div className="budget-row-currencies">
              {catBudgets.map(budget => {
                const spent = monthSpent(expenses, cat.id, userCategories, budget.currency, false);
                const pct   = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                const over  = pct >= 100;
                const warn  = !over && pct >= budget.alertPercentage;
                return (
                  <div key={budget.id} className="budget-row-currency-line">
                    <span className="budget-row-currency-tag">{budget.currency}</span>
                    <span className={`budget-row-amount${over ? ' over' : warn ? ' warn' : ''}`}>
                      {fmt(budget.amount)}
                    </span>
                    <div className="budget-row-bar-wrap">
                      <div className="budget-row-bar">
                        <div
                          className={`budget-row-bar-fill${over ? ' over' : warn ? ' warn' : ''}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className={`budget-row-pct${over ? ' over' : warn ? ' warn' : ''}`}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="budget-row-empty">Sin presupuesto establecido</span>
          )}
        </span>
        <ChevronRight size={15} strokeWidth={2.5} className="budget-row-chevron" />
      </button>
    );
  }

  return (
    <div className="budgets-manager">

      {/* Alerts toggle */}
      <div className="budget-alerts-card">
        <Bell size={17} strokeWidth={2} className="budget-alerts-bell" />
        <span className="budget-alerts-label">Alertas de presupuesto</span>
        <button
          className={`notif-toggle${alertsEnabled ? ' on' : ''}`}
          onClick={toggleAlerts}
          aria-pressed={alertsEnabled}
        >
          <span className="notif-toggle-thumb" />
        </button>
      </div>

      {/* Recomendaciones */}
      {recommended.length > 0 && (
        <div className="budget-section">
          <div className="budget-section-title">Recomendaciones</div>
          <div className="budget-list-card">
            {recommended.map((cat, i) => (
              <React.Fragment key={cat.id}>
                {renderRow(cat)}
                {i < recommended.length - 1 && <div className="budget-row-divider" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Otras */}
      {others.length > 0 && (
        <div className="budget-section">
          <div className="budget-section-title">Otras</div>
          <div className="budget-list-card">
            {others.map((cat, i) => (
              <React.Fragment key={cat.id}>
                {renderRow(cat)}
                {i < others.length - 1 && <div className="budget-row-divider" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════
   DETAIL VIEW — one section per currency
══════════════════════════════════════ */
export function BudgetDetailView({
  categoryId,
  budgets,
  userCategories,
  expenses,
  exactMatch = false,
  subcategories = [],
  defaultCurrency = 'PEN',
  onSubOpen,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const info       = resolveCategory(categoryId, userCategories);
  const currencies = useMemo(
    () => currenciesForCategory(expenses, budgets, categoryId, userCategories, exactMatch),
    [expenses, budgets, categoryId, userCategories, exactMatch]
  );

  const [extraCurrencies, setExtraCurrencies] = useState([]);
  const [addingCurrency,  setAddingCurrency]  = useState(false);
  const [pickedCurrency,  setPickedCurrency]  = useState(defaultCurrency);

  const allCurrencies = useMemo(
    () => [...new Set([...currencies, ...extraCurrencies])],
    [currencies, extraCurrencies]
  );

  const relevantSubs = useMemo(() => {
    return subcategories.filter(sub => {
      const hasExpense = expenses.some(
        e => e.category === sub.id && e.type !== 'ingreso' && !SKIP_CATS.has(e.category)
      );
      const hasBudget = budgets.some(b => b.categoryId === sub.id);
      return hasExpense || hasBudget;
    });
  }, [subcategories, expenses, budgets]);

  const noDirectBudgets = allCurrencies.length === 0;

  return (
    <div className="budget-detail">

      {/* ── Existing currency sections ── */}
      {allCurrencies.map((currency, i) => {
        const budget = budgets.find(
          b => b.categoryId === categoryId && b.currency === currency
        );
        const avg = monthlyAvg(expenses, categoryId, userCategories, currency, 3, exactMatch);
        return (
          <BudgetCurrencySection
            key={budget?.id ?? `new-${currency}`}
            currency={currency}
            budget={budget}
            average={avg}
            first={i === 0}
            onSave={async (amount, alertPercentage) => {
              if (budget) {
                await onUpdate(budget.id, { amount, alertPercentage });
              } else {
                await onAdd({ categoryId, currency, amount, alertPercentage });
              }
            }}
            onDelete={budget ? () => onDelete(budget.id) : null}
          />
        );
      })}

      {/* ── Add currency form (shown when empty OR when user taps "+ Agregar moneda") ── */}
      {(noDirectBudgets || addingCurrency) && (
        <>
          {!noDirectBudgets && (
            <div style={{ height: '0.5px', background: 'var(--separator)' }} />
          )}
          <div className="budget-form-field">
            <span className="budget-form-label">Moneda</span>
            <CurrencyPicker selected={pickedCurrency} onSelect={setPickedCurrency} />
          </div>
          <BudgetCurrencySection
            key={`adding-${pickedCurrency}`}
            currency={pickedCurrency}
            budget={undefined}
            average={monthlyAvg(expenses, categoryId, userCategories, pickedCurrency, 3, exactMatch)}
            first={true}
            onSave={async (amount, alertPercentage) => {
              await onAdd({ categoryId, currency: pickedCurrency, amount, alertPercentage });
              if (!currencies.includes(pickedCurrency)) {
                setExtraCurrencies(prev => [...new Set([...prev, pickedCurrency])]);
              }
              setAddingCurrency(false);
            }}
            onDelete={null}
          />
        </>
      )}

      {/* ── Add another currency button ── */}
      {!noDirectBudgets && !addingCurrency && (
        <button className="budget-add-currency-btn" onClick={() => setAddingCurrency(true)}>
          + Agregar otra moneda
        </button>
      )}

      {/* Subcategories section */}
      {relevantSubs.length > 0 && (
        <div className="budget-section">
          <div className="budget-section-title">Subcategorías</div>
          <div className="budget-list-card">
            {relevantSubs.map((sub, i) => {
              const subBudgets = budgets.filter(b => b.categoryId === sub.id);
              return (
                <React.Fragment key={sub.id}>
                  <button className="budget-row" onClick={() => onSubOpen?.(sub.id)}>
                    <span className="budget-row-dot" style={{ background: sub.color ?? info.color }} />
                    <span className="budget-row-content">
                      <span className="budget-row-name">{sub.label}</span>
                      {subBudgets.length > 0 ? (
                        <div className="budget-row-currencies">
                          {subBudgets.map(budget => {
                            const spent = monthSpent(expenses, sub.id, userCategories, budget.currency, true);
                            const pct   = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                            const over  = pct >= 100;
                            const warn  = !over && pct >= budget.alertPercentage;
                            return (
                              <div key={budget.id} className="budget-row-currency-line">
                                <span className="budget-row-currency-tag">{budget.currency}</span>
                                <span className={`budget-row-amount${over ? ' over' : warn ? ' warn' : ''}`}>
                                  {fmt(budget.amount)}
                                </span>
                                <div className="budget-row-bar-wrap">
                                  <div className="budget-row-bar">
                                    <div
                                      className={`budget-row-bar-fill${over ? ' over' : warn ? ' warn' : ''}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`budget-row-pct${over ? ' over' : warn ? ' warn' : ''}`}>
                                    {Math.round(pct)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="budget-row-empty">Sin presupuesto establecido</span>
                      )}
                    </span>
                    <ChevronRight size={15} strokeWidth={2.5} className="budget-row-chevron" />
                  </button>
                  {i < relevantSubs.length - 1 && <div className="budget-row-divider" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

/* ── One currency section ── */
function BudgetCurrencySection({ currency, budget, average, first, onSave, onDelete }) {
  const [amount,          setAmount]          = useState(budget ? String(budget.amount) : '');
  const [alertPercentage, setAlertPercentage] = useState(budget?.alertPercentage ?? 80);
  const [saving,          setSaving]          = useState(false);

  const sliderPct = `${(alertPercentage - PCT_MIN) / (PCT_MAX - PCT_MIN) * 100}%`;
  const symbol    = getCurrencyByCode(currency)?.symbol ?? currency;

  async function handleSave() {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    try { await onSave(val, alertPercentage); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try { await onDelete(); }
    finally { setSaving(false); }
  }

  return (
    <div className={`budget-currency-section${first ? '' : ' sep'}`}>

      {/* Slider */}
      <div className="budget-form-field">
        <div className="budget-slider-header">
          <span className="budget-form-label">Umbral de alerta</span>
          <span className="budget-slider-value">{alertPercentage}%</span>
        </div>
        <input
          type="range"
          className="budget-slider"
          min={PCT_MIN}
          max={PCT_MAX}
          step={1}
          value={alertPercentage}
          onChange={e => setAlertPercentage(Number(e.target.value))}
          style={{ '--pct': sliderPct }}
        />
      </div>

      {/* Amount input with inline symbol */}
      <div className="budget-form-field">
        <div className="budget-form-label">
          Monto mensual
          {average > 0 && (
            <span className="budget-detail-avg"> · prom. {symbol} {fmt(average)}/mes</span>
          )}
        </div>
        <div className="budget-amount-wrap">
          <span className="budget-amount-symbol">{symbol}</span>
          <input
            type="number"
            className="budget-amount-input"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="0.01"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Save */}
      <button
        className="budget-save-btn"
        onClick={handleSave}
        disabled={saving || !amount || parseFloat(amount) <= 0}
      >
        {saving ? 'Guardando…' : budget ? 'Guardar cambios' : 'Establecer presupuesto'}
      </button>

      {/* Delete */}
      {onDelete && (
        <button className="budget-delete-btn" onClick={handleDelete} disabled={saving}>
          Eliminar presupuesto
        </button>
      )}

    </div>
  );
}
