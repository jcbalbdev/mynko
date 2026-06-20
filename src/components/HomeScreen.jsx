/**
 * HomeScreen.jsx
 * Main dashboard. Fixed header + scrollable views.
 * Logic extracted to: useHomeFilters, useTransactionTotals.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import './HomeScreen.css';
import { useHomeSheets } from '../hooks/useHomeSheets';
import { useQuickAdd }   from '../hooks/useQuickAdd';
import { useMenuConfig } from '../hooks/useMenuConfig';
import { Settings, Menu, Receipt, HandCoins, TrendingUp, Scale, ArrowLeftRight, ChevronLeft, ChevronRight, Wallet, X, CreditCard, Repeat, Search, Zap, ChevronDown, MapPin } from 'lucide-react';
import BarChart               from './BarChart';
import DebtListView          from './DebtListView';
import IncomeListView        from './IncomeListView';
import BalanceView           from './BalanceView';
import ExchangeView          from './ExchangeView';
import AccountsCarouselView  from './AccountsCarouselView';
import AddDebtSheet          from './AddDebtSheet';
import AddIncomeSheet        from './AddIncomeSheet';
import AddExpenseSheet       from './AddExpenseSheet';
import PeriodSheet           from './PeriodSheet';
import LocationSheet        from './LocationSheet';
import AddExchangeSheet      from './AddExchangeSheet';
import AddAccountSheet       from './AddAccountSheet';
import AccountDetailSheet         from './AccountDetailSheet';
import AccountTransactionsSheet   from './AccountTransactionsSheet';
import TransferSheet         from './TransferSheet';
import QuickAddModal         from './QuickAddModal';
import TransactionRow        from './ui/TransactionRow';
import ExpenseEditSheet      from './ExpenseEditSheet';
import CategoryEditSheet     from './CategoryEditSheet';
import ProfileSheet          from './ProfileSheet';
import DateGroupHeader       from './ui/DateGroupHeader';
import { TYPE_FILTERS, getCategoryById } from '../utils/categories';
import { getCurrencyByCode } from '../utils/currencies';
import { useSearchFilter } from '../hooks/useSearchFilter';
import {
  applyFilters,
  applySearchTags,
  groupByCategory,
  groupBySubcategory,
  filterByDrillCategory,
  groupExpensesByDate,
  formatAmount,
  sumExpenses,
  getLastByCategory,
} from '../utils/expenses';
import { useHomeFilters }         from '../hooks/useHomeFilters';
import { useTransactionTotals, effectiveAmount, getExchangeOutflows } from '../hooks/useTransactionTotals';
import { useSwipeBack }           from '../hooks/useSwipeBack';
import { useAnimatedNumber }      from '../hooks/useAnimatedNumber';
import { computeAccountBalance, computeCreditDebt } from '../utils/accounts';
import { CREDIT_PAYMENT_CATEGORY } from '../utils/categories';
import CategoryPillsBar          from './CategoryPillsBar';
import CreditView                from './CreditView';
import AddCreditChargeSheet      from './AddCreditChargeSheet';
import AddCreditPaymentSheet     from './AddCreditPaymentSheet';
import RecurringListView         from './RecurringListView';
import AddRecurringSheet         from './AddRecurringSheet';
import AddSubscriptionSheet      from './AddSubscriptionSheet';
import QuickAccessScreen         from './QuickAccessScreen';
import BaseSheet                from './ui/BaseSheet';
import BudgetQuickSheet         from './BudgetQuickSheet';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];


const NAV_VIEWS = [
  { id: 'gastos',   label: 'Gastos',   Icon: Receipt,        desc: 'Registra y visualiza tus gastos del mes' },
  null,
  { id: 'ingresos', label: 'Ingresos', Icon: TrendingUp,     desc: 'Lleva el control de lo que entra a tu bolsillo' },
  null,
  { id: 'deudas',   label: 'Deudas',   Icon: HandCoins,      desc: 'Gestiona lo que te deben y lo que debes' },
  null,
  { id: 'credito',  label: 'Crédito',  Icon: CreditCard,     desc: 'Consumos y pagos de tus tarjetas de crédito' },
  null,
  { id: 'balance',  label: 'Balance',  Icon: Scale,          desc: 'Ve el resumen entre ingresos y gastos' },
  null,
  { id: 'cambio',   label: 'Cambio',   Icon: ArrowLeftRight, desc: 'Convierte y registra movimientos en otra moneda' },
  null,
  { id: 'cuentas',  label: 'Cuentas',  Icon: Wallet,         desc: 'Administra tus cuentas y tarjetas' },
  null,
  { id: 'recurrentes', label: 'Recurrentes', Icon: Repeat, desc: 'Gastos recurrentes y suscripciones' },
  null,
  { id: 'rapido', label: 'Acceso Rápido', Icon: Zap, desc: 'Accesos directos a tus transacciones frecuentes' },
];

export default function HomeScreen({
  expenses,
  onDelete,
  onUpdate,
  onColorChange,
  onCategoryColorChange,
  onSharedPaidChange,
  onAdd,
  onAddExpense,
  user,
  onSignOut,
  defaultCurrency,
  onCurrencyChange,
  userCategories       = [],
  onCreateSubcategory,
  onDeleteSubcategory,
  onCreateParentCategory,
  onUpdateCategoryColor,
  onUpdateSystemCategoryColor,
  onGoToAccounts,
  accounts             = [],
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransfer,
  transfers            = [],
  charges              = [],
  onAddCharge,
  onAddPayment,
  yapePermission       = false,
  onRequestYapePermission,
  recurring            = [],
  onAddRecurring,
  onConfirmRecurring,
  onMarkRecurringDone,
  onUpdateRecurring,
  onDeleteRecurring,
  quickAccess          = [],
  qaLoading            = false,
  addQuickAccess,
  removeQuickAccess,
  getLastExpense,
  uniqueDescriptions,
  onQuickRegister,
  navigateTo           = null,
  onNavigateDone,
  budgets              = [],
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
}) {
  /* ── Sheet & modal state (via hook) ── */
  const { sheets, actions } = useHomeSheets();
  const {
    showProfile, showDebtSheet, showIncomeSheet, showExchangeSheet,
    showAddAccSheet, showTransferSheet, transferFromAccountId, txSheetAccount, selectedAccount, editExp, editCat,
    showCreditChargeSheet, showCreditPaySheet, creditSheetAccountId,
    showRecurringSheet, showSubscriptionSheet,
  } = sheets;

  /* ── Quick-add gesture state (via hook) ── */
  const {
    quickAdd, hoveredOptionId, quickAddSheet,
    handleBarLongPress: _handleBarLongPress,
    handleHoverOption,
    handleLongPressRelease,
    clearQuickAdd,
    clearQuickAddSheet,
  } = useQuickAdd();

  // Wrap handleBarLongPress to pass the active view automatically
  const handleBarLongPress = (catId, rect, view) => _handleBarLongPress(catId, rect, view);

  /* ── Menu config (order + visibility) ── */
  const { config: menuConfig, toggleHidden: toggleMenuHidden, reorder: reorderMenu } = useMenuConfig();
  const NAV_VIEWS_BASE = NAV_VIEWS.filter(Boolean);
  const orderedNavViews = useMemo(() =>
    menuConfig.order.map(id => NAV_VIEWS_BASE.find(v => v.id === id)).filter(Boolean),
    [menuConfig.order] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const visibleNavViews = useMemo(() =>
    orderedNavViews.filter(v => !menuConfig.hidden.includes(v.id)),
    [orderedNavViews, menuConfig.hidden]
  );
  const hiddenNavViews = useMemo(() =>
    orderedNavViews.filter(v => menuConfig.hidden.includes(v.id)),
    [orderedNavViews, menuConfig.hidden]
  );

  /* ── Other view state ── */
  const [showMenu,       setShowMenu]       = useState(false);
  const [showHiddenNav,  setShowHiddenNav]  = useState(false);
  const [activeView,     setActiveView]     = useState('gastos');
  const [recurringTitle, setRecurringTitle] = useState('Total de gastos recurrentes');

  useEffect(() => {
    if (navigateTo) {
      setActiveView(navigateTo);
      setShowMenu(false);
      if (onNavigateDone) onNavigateDone();
    }
  }, [navigateTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const [drillCategory, setDrillCategory] = useState(null);
  const [balanceYear,         setBalanceYear]         = useState(new Date().getFullYear());
  const [balanceMonth,        setBalanceMonth]        = useState(new Date().getMonth());
  const [showBalancePicker,   setShowBalancePicker]   = useState(false);
  const [stickyBars,   setStickyBars]   = useState(false);
  const scrollRef        = useRef(null);
  const menuRef          = useRef(null);
  const barChartRef       = useRef(null);
  const incomeBarChartRef = useRef(null);
  const searchBarRef     = useRef(null);
  const [showPeriodSheet,    setShowPeriodSheet]    = useState(false);
  const [showLocationSheet,  setShowLocationSheet]  = useState(false);

  /* Swipe right to exit drill-down */
  useSwipeBack(scrollRef, () => setDrillCategory(null), !!drillCategory);

  /* Show sticky category pills when the bar chart scrolls out of view */
  useEffect(() => {
    if (activeView !== 'gastos' && activeView !== 'ingresos') {
      setStickyBars(false);
      return;
    }
    const el   = activeView === 'gastos' ? barChartRef.current : incomeBarChartRef.current;
    const root = scrollRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyBars(!entry.isIntersecting),
      { root, threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeView]);

  const {
    period, periodMode, setPeriodMode, periodLabel,
    typeFilter, cycleType, typeIdx,
    currencyFilter, setCurrencyFilter,
    currencyBalance, setCurrencyBalance,
    locationFilter, setLocationFilter, usedLocations,
    usedCurrencies,
  } = useHomeFilters(expenses, defaultCurrency, activeView);

  /* ── Search filter (needs periodMode, so declared after useHomeFilters) ── */
  const {
    searchOpen, openSearch, closeSearch,
    query, setQuery,
    tags: searchTags, addTag, removeTag,
    suggestions,
  } = useSearchFilter(expenses, userCategories, periodMode);

  const searchInputRef = useRef(null);

  /* Focus input after animation starts */
  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [searchOpen]);

  /* Close search when leaving a search-enabled view */
  useEffect(() => {
    if (!['gastos', 'ingresos', 'deudas'].includes(activeView) && searchOpen) closeSearch();
  }, [activeView]);

  /* Close search on outside tap */
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) closeSearch();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [searchOpen, closeSearch]);

  const handlePeriodSave = (newMode) => {
    setPeriodMode(newMode);
    setDrillCategory(null);
    setShowPeriodSheet(false);
  };

  const cycleCurrency = (isBalance) => {
    if (usedCurrencies.length <= 1) return;
    const current = isBalance ? currencyBalance : currencyFilter;
    const idx = usedCurrencies.findIndex(c => c.code === current);
    const next = usedCurrencies[(idx + 1) % usedCurrencies.length];
    if (isBalance) setCurrencyBalance(next.code);
    else setCurrencyFilter(next.code);
  };

  const handleLocationChange = (loc) => {
    setLocationFilter(loc);
  };

  /* ── Derived data for the Gastos view ── */
  const { expensesOnly, searchFiltered, chartData, total, grouped, dateKeys } = useMemo(() => {
    // Exclude: ingreso, cambio, and paid compartido/debts (they move to ingresos)
    const expensesOnly = expenses.filter(e =>
      e.type !== 'ingreso' &&
      e.type !== 'cambio'  &&
      !(e.type === 'compartido' && e.sharedPaid)
    );
    const filtered        = applyFilters(expensesOnly, period, typeFilter, currencyFilter, locationFilter);
    const searchFiltered = applySearchTags(filtered, searchTags, userCategories);
    return {
      expensesOnly,
      filtered,
      searchFiltered,
      chartData: groupByCategory(searchFiltered, userCategories),
      total:     sumExpenses(searchFiltered),
      grouped:   groupExpensesByDate(searchFiltered),
      dateKeys:  Object.keys(groupExpensesByDate(searchFiltered)),
    };
  }, [expenses, period, typeFilter, currencyFilter, locationFilter, userCategories, searchTags]);

  /* ── Derived data for the Ingresos view (needed for sticky pills) ── */
  const { incomeChartData, incomeDrillChartData } = useMemo(() => {
    const raw = expenses.filter(e =>
      e.type === 'ingreso' || e.type === 'cambio' ||
      (e.type === 'compartido' && e.sharedPaid)
    );
    const incomes = applyFilters(raw, period, 'all', currencyFilter, locationFilter);
    const outflowRaw = currencyFilter !== 'all' ? getExchangeOutflows(expenses, currencyFilter) : [];
    const virtualOutflows = applyFilters(outflowRaw, period, 'all', 'all').map(e => ({
      ...e, amount: e.fromAmount ?? 0, currency: e.fromCurrency,
      category: 'exchange', _isOutflowBar: true,
    }));
    const incomeChartData = groupByCategory([...incomes, ...virtualOutflows], userCategories);
    const drillIncomes = drillCategory ? filterByDrillCategory(incomes, drillCategory, userCategories) : [];
    const incomeDrillChartData = drillCategory ? groupBySubcategory(drillIncomes, userCategories) : [];
    return { incomeChartData, incomeDrillChartData };
  }, [expenses, period, currencyFilter, locationFilter, drillCategory, userCategories]);

  /* ── Drill-down derived data ── */
  const { drillChartData, drillGrouped, drillDateKeys, drillTotal, drillCatLabel } = useMemo(() => {
    if (!drillCategory) return {};
    const catDef   = getCategoryById(drillCategory);
    const subDef   = !catDef ? userCategories.find(s => s.id === drillCategory) : null;
    const catLabel = catDef?.label ?? subDef?.name ?? drillCategory;
    const drillFiltered = filterByDrillCategory(searchFiltered, drillCategory, userCategories);
    const drillGrouped  = groupExpensesByDate(drillFiltered);
    return {
      drillChartData: groupBySubcategory(drillFiltered, userCategories),
      drillGrouped,
      drillDateKeys:  Object.keys(drillGrouped),
      drillTotal:     sumExpenses(drillFiltered),
      drillCatLabel:  catLabel,
    };
  }, [drillCategory, searchFiltered, userCategories]);

  /* ── Keep editCat in sync when expenses change (fixes stale total on bars) ── */
  useEffect(() => {
    if (!editCat) return;
    const fresh = chartData.find(g => g.category === editCat.category);
    if (!fresh) {
      actions.closeCatEdit(); // category no longer exists (all expenses deleted)
    } else if (fresh.amount !== editCat.amount) {
      actions.syncCatEdit(fresh); // update with recalculated total
    }
  }, [chartData]);

  /* ── Totals (using shared hook) ── */
  const { debtTotal, incomeTotal } = useTransactionTotals(expenses, currencyFilter, period);

  /* ── Search-filtered totals for ingresos + deudas headers ── */
  const searchIncomeTotal = useMemo(() => {
    if (!searchTags.length) return null;
    const raw      = expenses.filter(e => e.type === 'ingreso' || e.type === 'cambio' || (e.type === 'compartido' && e.sharedPaid));
    const filtered = applyFilters(raw, period, 'all', currencyFilter, locationFilter);
    return applySearchTags(filtered, searchTags, userCategories).reduce((s, e) => s + e.amount, 0);
  }, [expenses, period, currencyFilter, locationFilter, searchTags, userCategories]);

  const searchDebtTotal = useMemo(() => {
    if (!searchTags.length) return null;
    const shared   = expenses.filter(e => e.type === 'compartido' && e.sharedWith?.trim());
    const filtered = applyFilters(shared, period, 'all', currencyFilter, locationFilter);
    return applySearchTags(filtered, searchTags, userCategories).reduce((s, e) => s + (e.sharedOwes ?? 0), 0);
  }, [expenses, period, currencyFilter, locationFilter, searchTags, userCategories]);

  /* ── Balance net (for the header when activeView === 'balance') ── */
  const balanceNet = useMemo(() => {
    const curr       = currencyBalance;
    const dateFilter = e => {
      const d = new Date(e.date);
      return d.getFullYear() === balanceYear && d.getMonth() === balanceMonth;
    };
    const expOnly    = expenses.filter(e => e.type !== 'ingreso' && e.type !== 'cambio');

    const bInc = expenses
      .filter(e => (e.type === 'ingreso' || e.type === 'cambio') && e.currency === curr)
      .filter(dateFilter)
      .reduce((s, e) => s + e.amount, 0);

    const bOut = getExchangeOutflows(expenses, curr)
      .filter(dateFilter)
      .reduce((s, e) => s + (e.fromAmount ?? 0), 0);

    const bExp = expOnly
      .filter(e => e.currency === curr)
      .filter(dateFilter)
      .reduce((s, e) => s + effectiveAmount(e), 0);

    return bInc - bOut - bExp;
  }, [expenses, balanceYear, balanceMonth, currencyBalance]);

  /* ── Accounts sorted by usage frequency ── */
  const sortedAccounts = useMemo(() => {
    const usage = {};
    expenses.forEach(e => { if (e.accountId) usage[e.accountId] = (usage[e.accountId] || 0) + 1; });
    return [...accounts].sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0));
  }, [accounts, expenses]);

  /* ── Active account (for cuentas header) ── */
  const [activeAccountIdx, setActiveAccountIdx] = useState(0);
  // Reset to 0 whenever user enters cuentas — carousel always remounts at offset=0
  useEffect(() => {
    if (activeView === 'cuentas') setActiveAccountIdx(0);
  }, [activeView]);
  const activeAccount = sortedAccounts[activeAccountIdx] ?? null;
  const activeAccBalance = useMemo(() => {
    if (!activeAccount) return 0;
    return computeAccountBalance(activeAccount, expenses);
  }, [activeAccount, expenses]);
  const activeAccCurrency = activeAccount?.currency ?? 'PEN';
  const animatedAccBalance = useAnimatedNumber(Math.abs(activeAccBalance));
  const accIntPart   = Math.floor(animatedAccBalance).toLocaleString('es-MX');
  const accCentsPart = (animatedAccBalance % 1).toFixed(2).slice(1);
  const accSign = activeAccBalance < 0 ? '-' : '';

  /* ── Drill-down income total (when in ingresos view with a category selected) ── */
  const incomeDrillTotal = useMemo(() => {
    if (!drillCategory || activeView !== 'ingresos') return null;
    const incomeRecords = expenses.filter(e =>
      e.type === 'ingreso' ||
      e.type === 'cambio'  ||
      (e.type === 'compartido' && e.sharedPaid)
    );
    const incFiltered = applyFilters(incomeRecords, period, 'all', currencyFilter, locationFilter);
    const drillFiltered = filterByDrillCategory(incFiltered, drillCategory, userCategories);
    return drillFiltered.reduce((s, e) => s + e.amount, 0);
  }, [drillCategory, activeView, expenses, period, currencyFilter, locationFilter, userCategories]);

  /* ── Total credit debt across all credit accounts ── */
  const creditTotal = useMemo(() => {
    const creditPayments = expenses.filter(e => e.category === CREDIT_PAYMENT_CATEGORY.id);
    return accounts
      .filter(a => a.isCredit)
      .reduce((sum, a) => sum + computeCreditDebt(a, charges, creditPayments), 0);
  }, [accounts, charges, expenses]);

  /* ── Display amount split ── */
  const displayTotal = activeView === 'deudas'   ? (searchDebtTotal   ?? debtTotal)
                     : activeView === 'ingresos'  ? (incomeDrillTotal  ?? searchIncomeTotal ?? incomeTotal)
                     : activeView === 'balance'   ? Math.abs(balanceNet)
                     : activeView === 'credito'   ? creditTotal
                     : activeView === 'cambio'    ? 0
                     : activeView === 'cuentas'   ? 0
                     : drillCategory ? (drillTotal ?? 0)
                     : total;
  const balanceSign = activeView === 'balance' && balanceNet < 0 ? '-'
                    : activeView === 'balance' && balanceNet > 0 ? '+' : '';
  // Animated display value — smoothly counts to new total (iOS feel)
  const animatedTotal = useAnimatedNumber(displayTotal);
  const intPart   = Math.floor(animatedTotal).toLocaleString('es-MX');
  const centsPart = (animatedTotal % 1).toFixed(2).slice(1);
  const drillCatBg = drillCategory ? (getCategoryById(drillCategory)?.bg ?? '#E0E0E0') : null;

  return (
    <div
      className={`home-fullscreen${activeView === 'cuentas' ? ' home-fullscreen--cuentas' : ''}`}
      style={activeView === 'cuentas' ? { background: '#fff' } : undefined}
    >
      {/* ── FIXED HEADER ── */}
      <div className="home-header-minimal">

        {/* ── Top row: search pill + menu ── */}
        <div className="home-header-toprow" ref={searchBarRef}>
          <div
            className={[
              'home-search-pill',
              ['gastos', 'ingresos', 'deudas'].includes(activeView) ? 'home-search-pill--gastos' : '',
              searchOpen ? 'home-search-pill--open' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Profile btn — always visible */}
            <button className="home-pill-profile-btn" onClick={actions.openProfile} id="btn-open-profile" aria-label="Configuración">
              <Settings size={18} strokeWidth={2.5} />
            </button>

            {/* Separator + search icon */}
            {['gastos', 'ingresos', 'deudas'].includes(activeView) && (
              <>
                <span className="home-pill-sep" aria-hidden />
                <button className="home-pill-search-icon-btn" onClick={openSearch} aria-label="Buscar">
                  <Search size={16} strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* Input area — expands when open */}
            <div className="home-pill-input-area">
              <Search size={13} strokeWidth={2} className="home-pill-input-icon" />
              <input
                ref={searchInputRef}
                className="home-pill-input"
                type="text"
                placeholder="Buscar en gastos..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && closeSearch()}
                tabIndex={searchOpen ? 0 : -1}
              />
            </div>

            {/* Close button — appears when open */}
            <button
              className="home-pill-close-btn"
              onClick={closeSearch}
              aria-label="Cerrar búsqueda"
              tabIndex={searchOpen ? 0 : -1}
            >
              <X size={13} strokeWidth={2.5} />
            </button>

          </div>

          {/* Suggestions — outside pill so overflow:hidden doesn't clip it */}
          {searchOpen && suggestions.length > 0 && (
            <div className="home-search-suggestions">
              {suggestions.map((s, i) => (
                <button key={i} className="home-search-suggestion-item" onClick={() => addTag(s)}>
                  <span className="home-search-suggestion-dot" style={{ background: s.color }} />
                  <span className="home-search-suggestion-label">{s.label}</span>
                  <span className="home-search-suggestion-type">
                    {s.type === 'category' ? 'Categoría' : s.type === 'subcategory' ? 'Subcategoría' : s.type === 'date' ? 'Fecha' : 'Descripción'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu button — stays absolutely positioned top-right */}
        <div className="home-menu-wrap" ref={menuRef}>
          <button
            className="home-avatar-btn home-menu-btn"
            onClick={() => setShowMenu(v => !v)}
            id="btn-open-menu"
            aria-label="Menú"
            aria-haspopup="true"
            aria-expanded={showMenu}
          >
            <Menu size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* View label — in drill-down, becomes a tappable back button */}
        {drillCategory ? (
          <button className="home-drill-back-label" onClick={() => setDrillCategory(null)} id="chip-drill-back" aria-label="Volver">
            <ChevronLeft size={13} strokeWidth={3} style={{ flexShrink: 0 }} />
            {activeView === 'ingresos' ? `Ingresos de ${drillCatLabel}` : `Gastos de ${drillCatLabel}`}
          </button>
        ) : (
          <p className="home-total-label">
            {activeView === 'deudas'        ? 'Por cobrar'
             : activeView === 'ingresos'    ? 'Total de ingresos'
             : activeView === 'balance'     ? 'Balance neto'
             : activeView === 'cambio'      ? 'Cambio de moneda'
             : activeView === 'cuentas'     ? (activeAccount?.name ?? 'Mis cuentas')
             : activeView === 'credito'     ? 'Deuda total'
             : activeView === 'recurrentes' ? recurringTitle
             : activeView === 'rapido'      ? 'Acceso Rápido'
             : 'Total de gastos'}
          </p>
        )}

        {/* Big amount — hidden for cambio, recurrentes and rapido */}
        {activeView !== 'cambio' && activeView !== 'recurrentes' && activeView !== 'rapido' && (
          <div className="home-amount-row">
            {activeView === 'cuentas' ? (
              <>
                {accSign && <span className="home-amount-sign">{accSign}</span>}
                <span className="home-amount-int">{accIntPart}</span>
                <span className="home-amount-cents">
                  {accCentsPart} <span style={{ fontSize: '0.55em', letterSpacing: 1 }}>{getCurrencyByCode(activeAccCurrency).symbol}</span>
                </span>
              </>
            ) : (
              <>
                {balanceSign && <span className="home-amount-sign">{balanceSign}</span>}
                <span className="home-amount-int">{intPart}</span>
                <span className="home-amount-cents">
                  {centsPart}{' '}
                  <span
                    className={`home-amount-currency${usedCurrencies.length > 1 ? ' home-amount-currency--clickable' : ''}`}
                    onClick={() => cycleCurrency(activeView === 'balance')}
                    style={{ cursor: usedCurrencies.length > 1 ? 'pointer' : 'default' }}
                  >
                    {(() => { const c = activeView === 'balance' ? currencyBalance : currencyFilter; return c === 'all' ? c : getCurrencyByCode(c).symbol; })()}
                    {usedCurrencies.length > 1 && (
                      <span className="home-amount-currency-arrows">
                        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                          <path d="M5 1.5L8 5H2L5 1.5Z" fill="currentColor"/>
                          <path d="M5 12.5L2 9H8L5 12.5Z" fill="currentColor"/>
                        </svg>
                      </span>
                    )}
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Filter sentence — hidden in cambio, cuentas, balance, recurrentes, rapido */}
        {activeView !== 'cambio' && activeView !== 'cuentas' && activeView !== 'balance' && activeView !== 'recurrentes' && activeView !== 'rapido' && (
          <div className="home-filter-sentence">
            {(() => {
              const dateTags = [...searchTags.filter(t => t.type === 'date')].sort((a, b) => a.id.localeCompare(b.id));
              const isRange  = dateTags.length === 2;
              const dateLabel = isRange
                ? dateTags[0].id.slice(0, 7) === dateTags[1].id.slice(0, 7)
                  ? `${dateTags[0].label.split(' de ')[0]} al ${dateTags[1].label}`
                  : `${dateTags[0].label} al ${dateTags[1].label}`
                : dateTags[0]?.label ?? null;
              const hasDates  = dateTags.length > 0;
              const introWord = !hasDates ? 'En' : isRange ? 'Del' : 'El';
              const clearDates = () => dateTags.forEach(t => removeTag(t.id, 'date'));
              return (
                <>
                  <span className="home-filter-word">{introWord}</span>
                  <button
                    className="home-filter-pill"
                    onClick={hasDates ? undefined : () => setShowPeriodSheet(true)}
                    id="chip-period"
                    style={hasDates ? { cursor: 'default' } : undefined}
                  >
                    {hasDates ? (
                      <>
                        {dateLabel}
                        <span
                          className="home-filter-pill-clear"
                          role="button"
                          aria-label="Quitar filtro de fecha"
                          onClick={e => { e.stopPropagation(); clearDates(); }}
                        >
                          <X size={10} strokeWidth={3} />
                        </span>
                      </>
                    ) : periodLabel}
                  </button>
                  {usedLocations.length > 1 && (
                    <>
                      <span className="home-filter-word">en</span>
                      <button
                        className="home-filter-pill"
                        onClick={() => setShowLocationSheet(true)}
                        id="chip-location"
                      >
                        {locationFilter === 'Todos' ? (
                          <MapPin size={13} strokeWidth={2.5} />
                        ) : (
                          <>
                            {locationFilter}
                            <span
                              className="home-filter-pill-clear"
                              role="button"
                              aria-label="Quitar filtro de ubicación"
                              onClick={e => { e.stopPropagation(); setLocationFilter('Todos'); }}
                            >
                              <X size={10} strokeWidth={3} />
                            </span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Balance filter pill — fixed in header */}
        {activeView === 'balance' && (
          <div className="home-filter-sentence">
            <span className="home-filter-word">En</span>
            <button className="home-filter-pill" onClick={() => setShowBalancePicker(true)}>
              {balanceYear}
            </button>
          </div>
        )}

        {/* Search tag chips — date tags now live in the period pill */}
        {searchTags.some(t => t.type !== 'date') && ['gastos', 'ingresos', 'deudas'].includes(activeView) && (
          <div className="home-search-tags-row">
            {searchTags.filter(t => t.type !== 'date').map(tag => (
              <span key={tag.id + tag.type} className="home-search-tag" style={{ background: tag.color }}>
                <span className="home-search-tag-label">{tag.label}</span>
                <button
                  className="home-search-tag-remove"
                  onClick={() => removeTag(tag.id, tag.type)}
                  aria-label={`Eliminar filtro ${tag.label}`}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Sticky category pills — appear when bar chart scrolls out of view */}
        {(activeView === 'gastos' || activeView === 'ingresos') && stickyBars && (
          <CategoryPillsBar
            items={activeView === 'gastos'
              ? (drillCategory ? drillChartData : chartData)
              : (drillCategory ? incomeDrillChartData : incomeChartData)
            }
            onPress={drillCategory ? null : setDrillCategory}
            onLongPress={(catId, rect) => handleBarLongPress(catId, rect, activeView)}
            onHoverOption={handleHoverOption}
            onLongPressRelease={handleLongPressRelease}
          />
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        className={`home-scroll${drillCategory ? ' drill-enter' : ''}${activeView === 'cuentas' ? ' home-scroll--cuentas' : ''}`}
        style={activeView === 'cuentas' ? { background: '#fff' } : undefined}
        ref={scrollRef}
      >

        {activeView === 'gastos' ? (
          <>
            <div className="barchart-section" ref={barChartRef}>
              <BarChart
                expenses={drillCategory ? drillChartData : chartData}
                budgets={budgets}
                onBarPress={drillCategory ? null : setDrillCategory}
                onBarLongPress={(catId, rect) => handleBarLongPress(catId, rect, 'gastos')}
                onHoverOption={handleHoverOption}
                onLongPressRelease={handleLongPressRelease}
                emptyLabel="gastos"
              />
            </div>
            {(drillCategory ? drillDateKeys : dateKeys).length > 0 ? (
              <div className="exp-list-section">
                {(drillCategory ? drillDateKeys : dateKeys).map(dateKey => {
                  const dayExpenses = (drillCategory ? drillGrouped : grouped)[dateKey];
                  const dayTotal    = sumExpenses(dayExpenses);
                  return (
                    <div key={dateKey} className="exp-date-group">
                      <DateGroupHeader label={dateKey} total={dayTotal} currency={currencyFilter} />
                      <div className="exp-day-block">
                        {dayExpenses.map((exp, idx) => (
                          <React.Fragment key={exp.id}>
                            {idx > 0 && <div className="exp-day-divider" />}
                            <TransactionRow record={exp} onPress={actions.openExpEdit} />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div style={{ height: 110 }} />
              </div>
            ) : (
              <div style={{ height: 110 }} />
            )}
          </>
        ) : activeView === 'deudas' ? (
          <DebtListView expenses={expenses} onTogglePaid={onSharedPaidChange} onPress={actions.openExpEdit} period={period} currencyFilter={currencyFilter} locationFilter={locationFilter} searchTags={searchTags} />
        ) : activeView === 'ingresos' ? (
          <IncomeListView
            expenses={expenses}
            onPress={actions.openExpEdit}
            period={period}
            currencyFilter={currencyFilter}
            locationFilter={locationFilter}
            searchTags={searchTags}
            drillCategory={drillCategory}
            onDrillCategory={setDrillCategory}
            onBarLongPress={drillCategory ? null : (catId, rect) => handleBarLongPress(catId, rect, 'ingresos')}
            onHoverOption={handleHoverOption}
            onLongPressRelease={handleLongPressRelease}
            barChartRef={incomeBarChartRef}
          />
        ) : activeView === 'credito' ? (
          <CreditView
            accounts={accounts}
            charges={charges}
            expenses={expenses}
            onAddCharge={(accountId) => actions.openCreditChargeSheet(accountId)}
            onAddPayment={(accountId) => actions.openCreditPaySheet(accountId)}
          />
        ) : activeView === 'cambio' ? (
          <ExchangeView expenses={expenses} accounts={accounts} />
        ) : activeView === 'cuentas' ? (
          <AccountsCarouselView
            accounts={sortedAccounts}
            expenses={expenses}
            onOpenAddAccount={actions.openAddAccSheet}
            onCardPress={actions.openTxSheet}
            onInfo={actions.selectAccount}
            onTransfer={actions.openTransferSheet}
            onActiveChange={(idx) => setActiveAccountIdx(idx)}
          />
        ) : activeView === 'recurrentes' ? (
          <RecurringListView
            recurring={recurring}
            onConfirmRecurring={onConfirmRecurring}
            onMarkRecurringDone={onMarkRecurringDone}
            onUpdateRecurring={onUpdateRecurring}
            onDeleteRecurring={onDeleteRecurring}
            onAddRecurring={actions.openRecurringSheet}
            onAddSubscription={actions.openSubscriptionSheet}
            userCategories={userCategories}
            accounts={accounts}
            onTitleChange={setRecurringTitle}
          />
        ) : activeView === 'rapido' ? (
          <QuickAccessScreen
            quickAccess={quickAccess}
            loading={qaLoading}
            addQuickAccess={addQuickAccess}
            removeQuickAccess={removeQuickAccess}
            getLastExpense={getLastExpense}
            uniqueDescriptions={uniqueDescriptions}
            onRegister={onQuickRegister}
          />
        ) : (
          <BalanceView
            expenses={expenses}
            year={balanceYear}
            currency={currencyBalance}
            onMonthSelect={setBalanceMonth}
          />
        )}
      </div>

      {/* FAB — hidden in balance, cuentas, credito and recurrentes (which has its own FAB) */}
      {activeView !== 'balance' && activeView !== 'cuentas' && activeView !== 'credito' && activeView !== 'recurrentes' && activeView !== 'rapido' && (
        <div className="fab-fade" />
      )}
      {activeView !== 'balance' && activeView !== 'cuentas' && activeView !== 'credito' && activeView !== 'recurrentes' && activeView !== 'rapido' && (
        <button
          className="add-pill-btn"
          onClick={
            activeView === 'deudas'   ? actions.openDebtSheet
          : activeView === 'ingresos' ? actions.openIncomeSheet
          : activeView === 'cambio'   ? actions.openExchangeSheet
          : onAdd
          }
          id="home-add-btn"
          aria-label={
            activeView === 'deudas'   ? 'Agregar deuda'
          : activeView === 'ingresos' ? 'Agregar ingreso'
          : activeView === 'cambio'   ? 'Registrar cambio'
          : 'Agregar gasto'
          }
        >+</button>
      )}

      {/* ── SHEETS ── */}
      {showProfile && (
        <ProfileSheet
          user={user}
          onClose={actions.closeProfile}
          onSignOut={onSignOut}
          defaultCurrency={defaultCurrency}
          onCurrencyChange={onCurrencyChange}
          userCategories={userCategories}
          onCreateSubcategory={onCreateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          onCreateParentCategory={onCreateParentCategory}
          onUpdateCategoryColor={onUpdateCategoryColor}
          onUpdateSystemCategoryColor={onUpdateSystemCategoryColor}
          yapePermission={yapePermission}
          onRequestYapePermission={onRequestYapePermission}
          navViews={NAV_VIEWS_BASE}
          menuConfig={menuConfig}
          onMenuToggleHidden={toggleMenuHidden}
          onMenuReorder={reorderMenu}
          budgets={budgets}
          onAddBudget={onAddBudget}
          onUpdateBudget={onUpdateBudget}
          onDeleteBudget={onDeleteBudget}
          expenses={expenses}
        />
      )}
      {editCat && (
        <CategoryEditSheet
          catGroup={chartData.find(g => g.category === editCat.category) ?? editCat}
          onClose={actions.closeCatEdit}
          onCategoryColorChange={onCategoryColorChange}
        />
      )}
      {editExp && (
        <ExpenseEditSheet
          expense={editExp}
          onClose={actions.closeExpEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onColorChange={onColorChange}
          onSharedPaidChange={onSharedPaidChange}
          accounts={accounts}
        />
      )}
      {showDebtSheet && (
        <AddDebtSheet
          onAdd={onAddExpense}
          onClose={actions.closeDebtSheet}
          defaultCurrency={defaultCurrency}
          expenses={expenses}
          onCreateSubcategory={onCreateSubcategory}
          accounts={accounts}
        />
      )}
      {showIncomeSheet && (
        <AddIncomeSheet
          onAdd={onAddExpense}
          onClose={actions.closeIncomeSheet}
          defaultCurrency={defaultCurrency}
          expenses={expenses}
          onCreateSubcategory={onCreateSubcategory}
          accounts={accounts}
        />
      )}
      {showExchangeSheet && (
        <AddExchangeSheet
          onAdd={onAddExpense}
          onClose={actions.closeExchangeSheet}
          defaultCurrency={defaultCurrency}
          accounts={accounts}
        />
      )}
      {/* ── Account sheets ── */}
      {showAddAccSheet && (
        <AddAccountSheet
          defaultCurrency={defaultCurrency}
          onAdd={async (data) => { await onAddAccount?.(data); actions.closeAddAccSheet(); }}
          onClose={actions.closeAddAccSheet}
        />
      )}
      {txSheetAccount && (
        <AccountTransactionsSheet
          account={txSheetAccount}
          expenses={expenses}
          transfers={transfers}
          accounts={accounts}
          onClose={actions.closeTxSheet}
        />
      )}
      {selectedAccount && (
        <AccountDetailSheet
          account={selectedAccount}
          expenses={expenses}
          onUpdate={onUpdateAccount}
          onDelete={async (id) => { await onDeleteAccount?.(id); actions.clearAccount(); }}
          onClose={actions.clearAccount}
        />
      )}
      {showTransferSheet && (
        <TransferSheet
          accounts={accounts}
          expenses={expenses}
          fromAccountId={transferFromAccountId}
          onTransfer={async (data) => { await onTransfer?.(data); actions.closeTransferSheet(); }}
          onClose={actions.closeTransferSheet}
        />
      )}
      {/* ── Quick-add gesture flow ── */}
      {quickAdd && (
        <QuickAddModal
          parentCategoryId={quickAdd.parentCatId}
          barRect={quickAdd.rect}
          hoveredId={hoveredOptionId}
          onClose={clearQuickAdd}
        />
      )}
      {showPeriodSheet && (
        <PeriodSheet
          periodMode={periodMode}
          onSave={handlePeriodSave}
          onClose={() => setShowPeriodSheet(false)}
        />
      )}
      {showLocationSheet && (
        <LocationSheet
          locations={usedLocations}
          selected={locationFilter}
          onSelect={handleLocationChange}
          onClose={() => setShowLocationSheet(false)}
        />
      )}
      {showRecurringSheet && (
        <AddRecurringSheet
          onAdd={async (data) => { await onAddRecurring?.(data); actions.closeRecurringSheet(); }}
          onClose={actions.closeRecurringSheet}
          defaultCurrency={defaultCurrency}
          expenses={expenses}
          onCreateSubcategory={onCreateSubcategory}
          accounts={accounts}
        />
      )}
      {showSubscriptionSheet && (
        <AddSubscriptionSheet
          onAdd={async (data) => { await onAddRecurring?.(data); actions.closeSubscriptionSheet(); }}
          onClose={actions.closeSubscriptionSheet}
          defaultCurrency={defaultCurrency}
          expenses={expenses}
          onCreateSubcategory={onCreateSubcategory}
          accounts={accounts}
        />
      )}

      {/* ── Balance year picker sheet ── */}
      {showBalancePicker && (
        <BaseSheet title="Selecciona un año" onClose={() => setShowBalancePicker(false)}>
          <div className="balance-picker-year-row">
            <button className="balance-nav-btn" onClick={() => setBalanceYear(y => y - 1)}><ChevronLeft size={16} /></button>
            <span className="balance-year-label">{balanceYear}</span>
            <button className="balance-nav-btn" onClick={() => setBalanceYear(y => y + 1)}><ChevronRight size={16} /></button>
          </div>
        </BaseSheet>
      )}

      {/* ── Nav Sheet ── */}
      {showMenu && (
        <>
          <div className="sheet-overlay" onClick={() => { setShowMenu(false); setShowHiddenNav(false); }} />
          <div className="sheet home-nav-sheet" role="menu">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <span className="sheet-title">Navegación</span>
              <button className="sheet-close" onClick={() => { setShowMenu(false); setShowHiddenNav(false); }} aria-label="Cerrar menú">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="home-nav-sheet-body">
              {visibleNavViews.map((item, i) => (
                <React.Fragment key={item.id}>
                  <button
                    className={`home-menu-item home-nav-sheet-item${activeView === item.id ? ' active' : ''}`}
                    role="menuitem"
                    id={`menu-item-${item.id}`}
                    onClick={() => {
                      setActiveView(item.id);
                      setDrillCategory(null);
                      setShowMenu(false);
                      setShowHiddenNav(false);
                      if (item.id === 'cuentas') onGoToAccounts?.();
                    }}
                  >
                    <item.Icon size={20} strokeWidth={2} className="home-nav-sheet-icon" />
                    <span className="home-nav-sheet-text">
                      <span className="home-nav-sheet-label">{item.label}</span>
                      <span className="home-nav-sheet-desc">{item.desc}</span>
                    </span>
                  </button>
                </React.Fragment>
              ))}

              {hiddenNavViews.length > 0 && (
                <>
                  <button
                    className="home-nav-more-btn"
                    onClick={() => setShowHiddenNav(v => !v)}
                  >
                    <ChevronDown
                      size={14}
                      strokeWidth={2.5}
                      className={`home-nav-more-chevron${showHiddenNav ? ' open' : ''}`}
                    />
                    <span>{showHiddenNav ? 'Menos secciones' : 'Más secciones'}</span>
                  </button>
                  {showHiddenNav && hiddenNavViews.map((item) => (
                    <React.Fragment key={item.id}>
                      <button
                        className={`home-menu-item home-nav-sheet-item home-nav-hidden-item${activeView === item.id ? ' active' : ''}`}
                        role="menuitem"
                        id={`menu-item-${item.id}`}
                        onClick={() => {
                          setActiveView(item.id);
                          setDrillCategory(null);
                          setShowMenu(false);
                          setShowHiddenNav(false);
                          if (item.id === 'cuentas') onGoToAccounts?.();
                        }}
                      >
                        <item.Icon size={20} strokeWidth={2} className="home-nav-sheet-icon" />
                        <span className="home-nav-sheet-text">
                          <span className="home-nav-sheet-label">{item.label}</span>
                          <span className="home-nav-sheet-desc">{item.desc}</span>
                        </span>
                      </button>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
      {quickAddSheet?.type === 'budget' && (
        <BudgetQuickSheet
          categoryId={quickAddSheet.parentCatId}
          budgets={budgets}
          userCategories={userCategories}
          expenses={expenses}
          defaultCurrency={defaultCurrency}
          onAdd={onAddBudget}
          onUpdate={onUpdateBudget}
          onDelete={onDeleteBudget}
          onClose={clearQuickAddSheet}
        />
      )}
      {quickAddSheet?.view === 'gastos' && quickAddSheet.subcatId === CREDIT_PAYMENT_CATEGORY.id && (
        <AddCreditPaymentSheet
          onAdd={onAddPayment}
          onClose={clearQuickAddSheet}
          defaultCurrency={defaultCurrency}
          creditAccounts={accounts.filter(a => a.isCredit)}
          debitAccounts={accounts.filter(a => !a.isCredit && computeAccountBalance(a, expenses) > 0)}
        />
      )}
      {quickAddSheet?.view === 'gastos' && quickAddSheet.subcatId !== CREDIT_PAYMENT_CATEGORY.id && (
        <AddExpenseSheet
          onAdd={onAddExpense}
          onClose={clearQuickAddSheet}
          defaultCurrency={currencyFilter !== 'all' ? currencyFilter : defaultCurrency}
          expenses={expenses}
          onCreateSubcategory={onCreateSubcategory}
          initialCategory={quickAddSheet.subcatId}
          initialAccountId={getLastByCategory(expenses, quickAddSheet.subcatId).accountId}
          initialLocation={getLastByCategory(expenses, quickAddSheet.subcatId).location}
          accounts={accounts.filter(a => computeAccountBalance(a, expenses) > 0)}
        />
      )}
      {quickAddSheet?.view === 'ingresos' && (
        <AddIncomeSheet
          onAdd={onAddExpense}
          onClose={clearQuickAddSheet}
          defaultCurrency={currencyFilter !== 'all' ? currencyFilter : defaultCurrency}
          expenses={expenses}
          onCreateSubcategory={onCreateSubcategory}
          initialCategory={quickAddSheet.subcatId}
          accounts={accounts}
        />
      )}

      {/* ── Credit sheets ── */}
      {showCreditChargeSheet && (
        <AddCreditChargeSheet
          onAdd={onAddCharge}
          onClose={actions.closeCreditChargeSheet}
          defaultCurrency={defaultCurrency}
          creditAccounts={accounts.filter(a => a.isCredit)}
          initialAccountId={creditSheetAccountId}
        />
      )}
      {showCreditPaySheet && (
        <AddCreditPaymentSheet
          onAdd={onAddPayment}
          onClose={actions.closeCreditPaySheet}
          defaultCurrency={defaultCurrency}
          creditAccounts={accounts.filter(a => a.isCredit)}
          debitAccounts={accounts.filter(a => !a.isCredit && computeAccountBalance(a, expenses) > 0)}
          initialCreditAccountId={creditSheetAccountId}
        />
      )}
    </div>
  );
}
