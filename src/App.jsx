/**
 * App.jsx
 * Root component — auth gate only.
 * AuthenticatedApp is a separate component so useExpenses
 * is only called when there is a valid user (avoids hooks violations).
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth }                from './hooks/useAuth';
import { usePushNotifications }   from './hooks/usePushNotifications';
import { useBudgets }             from './hooks/useBudgets';
import { useBudgetAlerts }        from './hooks/useBudgetAlerts';
import { useYapeListener }        from './hooks/useYapeListener';
import { useExpenses }            from './hooks/useExpenses';
import { useUserSettings }        from './hooks/useUserSettings';
import { useUserCategories }      from './hooks/useUserCategories';
import { useAccounts }            from './hooks/useAccounts';
import { useTransfers }           from './hooks/useTransfers';
import { useCreditCharges }       from './hooks/useCreditCharges';
import { useRecurringExpenses }   from './hooks/useRecurringExpenses';
import { useQuickAccess }         from './hooks/useQuickAccess';
import { useWidgetAction }        from './hooks/useWidgetAction';
import { syncAuthToWidget }       from './lib/widgetBridge';
import { computeAccountBalance } from './utils/accounts';
import { INITIAL_BALANCE_CATEGORY } from './utils/categories';
import { UserCategoriesProvider } from './context/UserCategoriesContext';
import { ThemeProvider }          from './context/ThemeContext';
import TabBar               from './components/TabBar';
import HomeScreen           from './components/HomeScreen';
import HistoryScreen        from './components/HistoryScreen';
import QuickAccessScreen    from './components/QuickAccessScreen';
import AddExpenseSheet      from './components/AddExpenseSheet';
import YapeExpenseSheet    from './components/YapeExpenseSheet';
import LoginScreen          from './components/LoginScreen';
import OnboardingScreen     from './components/OnboardingScreen';
import Toast                from './components/ui/Toast';
import LoadingScreen        from './components/ui/LoadingScreen';

/* ══════════════════════════════════════
   AUTHENTICATED APP
   Only rendered when session exists.
   useExpenses lives here so userId is always defined.
══════════════════════════════════════ */
function AuthenticatedApp({ user, signOut }) {
  usePushNotifications(user.id);

  const { yapeExpense, clearYapeExpense, hasPermission, requestPermission } = useYapeListener();

  const {
    expenses,
    addExpense,
    deleteExpense,
    updateExpense,
    updateExpenseColor,
    updateCategoryColor,
    updateSharedPaid,
    getMonthExpenses,
    getMonthTotal,
    refetch: refetchExpenses,
  } = useExpenses(user.id);

  // Re-fetch when app comes back to foreground (picks up widget-registered transactions)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetchExpenses();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetchExpenses]);

  const { settings, updateSetting } = useUserSettings(user.id);
  const defaultCurrency = settings.default_currency;

  const {
    userCategories,
    createSubcategory,
    createParentCategory,
    deleteSubcategory,
    updateCategoryColor: updateCustomCategoryColor,
    upsertSystemColorOverride,
  } = useUserCategories(user.id);

  const activeCategories = useMemo(() => {
    try {
      const raw = settings?.active_categories;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [settings?.active_categories]);


  const {
    accounts,
    loading: accountsLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccounts(user.id, defaultCurrency);

  const { transfers, createTransfer } = useTransfers(user.id);

  const { charges, addCharge } = useCreditCharges(user.id);

  const {
    recurring,
    addRecurring,
    updateRecurring,
    confirmRecurring,
    markRecurringDone,
    deleteRecurring,
    autoRegisterSubscriptions,
  } = useRecurringExpenses(user.id);

  const {
    quickAccess,
    loading: qaLoading,
    addQuickAccess,
    removeQuickAccess,
    getLastExpense,
    uniqueDescriptions,
  } = useQuickAccess(user.id, expenses);

  const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets(user.id);
  useBudgetAlerts({ expenses, budgets, userCategories });

  const [activeTab, setActiveTab] = useState('home');
  const [homeNav,   setHomeNav]   = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [toast,     setToast]     = useState(null);

  // Tracks which accounts have already triggered a balance alert this session
  const alertedRef = useRef(new Set());

  /* ── Min-balance alert check ── */
  useEffect(() => {
    if (!accounts.length) return;

    const pending = [];
    for (const acc of accounts) {
      if (!acc.minBalanceEnabled || acc.isCredit || acc.minBalanceThreshold == null) continue;
      const balance   = computeAccountBalance(acc, expenses);
      const threshold = acc.minBalanceThreshold;
      const isAt      = balance <= threshold;
      const isNear    = !isAt && balance <= threshold * 1.10;
      if (!isAt && !isNear) continue;

      const key = `${acc.id}:${isAt ? 'at' : 'near'}`;
      if (!alertedRef.current.has(key)) {
        alertedRef.current.add(key);
        pending.push({ acc, balance, threshold, isAt });
      }
    }

    if (!pending.length) return;
    // Show the most critical alert (lowest balance relative to threshold)
    pending.sort((a, b) => (a.balance / a.threshold) - (b.balance / b.threshold));
    const { acc, balance, threshold, isAt } = pending[0];
    const sym = acc.currency;
    const fmt = (n) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const msg = isAt
      ? `¡Alerta! ${acc.name}: tu saldo es ${sym} ${fmt(balance)}, ha llegado al mínimo de ${sym} ${fmt(threshold)}`
      : `${acc.name}: tu saldo es ${sym} ${fmt(balance)}, cerca del mínimo de ${sym} ${fmt(threshold)}`;
    setToast({ message: msg, duration: 5000 });
  }, [accounts, expenses]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Auto-register overdue subscriptions on load */
  useEffect(() => {
    if (recurring.length > 0) {
      autoRegisterSubscriptions(addExpense);
    }
  }, [recurring.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Quick access handler ── */
  const handleQuickRegister = useCallback(async (description) => {
    const last = getLastExpense(description);
    if (!last) return;
    try {
      await addExpense({
        amount:      last.amount,
        description: last.description,
        category:    last.category,
        color:       last.color,
        type:        last.type,
        currency:    last.currency,
        accountId:   last.accountId,
        date:        new Date().toISOString(),
      });
      setToast('Registrado');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [getLastExpense, addExpense]);

  /* ── Widget navigation (tap "+" or notification) ── */
  const handleWidgetNavigate = useCallback((target) => {
    if (target === 'quickaccess') {
      setActiveTab('home');
      setHomeNav('rapido');
    } else if (target === 'home') {
      setActiveTab('home');
    }
  }, []);

  /* ── Widget action (tap from home screen widget) ── */
  useWidgetAction(handleQuickRegister, handleWidgetNavigate);

  /* ── Recurring expense handlers ── */
  const handleAddRecurring = useCallback(async (data) => {
    try {
      await addRecurring(data);
      setToast(data.entryType === 'subscription' ? 'Suscripción agregada' : 'Gasto recurrente agregado');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [addRecurring]);

  const handleConfirmRecurring = useCallback(async (id) => {
    try {
      await confirmRecurring(id, addExpense);
      setToast('Pago registrado');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [confirmRecurring, addExpense]);

  const handleMarkRecurringDone = useCallback(async (id) => {
    try {
      await markRecurringDone(id);
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [markRecurringDone]);

  const handleUpdateRecurring = useCallback(async (id, fields) => {
    await updateRecurring(id, fields);
  }, [updateRecurring]);

  const handleDeleteRecurring = useCallback(async (id) => {
    await deleteRecurring(id);
    setToast('Eliminado');
  }, [deleteRecurring]);

  /* ── Expense handlers ── */
  const handleAdd = useCallback(async (data) => {
    try {
      await addExpense(data);
      const label = data.type === 'ingreso'   ? 'Ingreso'
                  : data.type === 'compartido' && data.sharedWith ? 'Deuda'
                  : 'Gasto';
      setToast(`${label} agregado`);
    } catch (err) {
      console.error('[handleAdd] error:', err.message);
      setToast(`Error: ${err.message}`);
    }
  }, [addExpense]);

  const handleDelete = useCallback(async (id, expenseType) => {
    await deleteExpense(id);
    const label = expenseType === 'ingreso' ? 'Ingreso' : 'Gasto';
    setToast(`${label} eliminado`);
  }, [deleteExpense]);

  const handleColorChange = useCallback(async (id, color) => {
    await updateExpenseColor(id, color);
    setToast('Color actualizado');
  }, [updateExpenseColor]);

  const handleUpdate = useCallback(async (id, fields) => {
    await updateExpense(id, fields);
    setToast('Cambios guardados');
  }, [updateExpense]);

  const handleCategoryColorChange = useCallback(async (categoryId, color) => {
    await updateCategoryColor(categoryId, color);
    setToast('Color actualizado');
  }, [updateCategoryColor]);

  const handleUpdateSystemCategoryColor = useCallback(async (catId, color) => {
    await upsertSystemColorOverride(catId, color);
    await updateCategoryColor(catId, color);
    const subcats = userCategories.filter(c => c.parent_id === catId);
    await Promise.all(subcats.map(async sub => {
      await updateCustomCategoryColor(sub.id, color);
      await updateCategoryColor(sub.id, color);
    }));
    setToast('Color actualizado');
  }, [upsertSystemColorOverride, updateCategoryColor, updateCustomCategoryColor, userCategories]);

  /* ── Onboarding: create initial accounts + category preferences ── */
  const handleOnboardingComplete = useCallback(async (accountsData, categoriesData) => {
    for (const acc of accountsData) {
      const balance = Number(acc.balance) || 0;
      const newAccount = await createAccount({
        name:       acc.name,
        type:       acc.type,
        currency:   acc.currency,
        balance:    0,
        hasBeenSet: balance > 0,
      });
      if (balance > 0) {
        await addExpense({
          type:        'ingreso',
          category:    INITIAL_BALANCE_CATEGORY.id,
          color:       INITIAL_BALANCE_CATEGORY.bg,
          amount:      balance,
          currency:    newAccount.currency,
          accountId:   newAccount.id,
          description: 'Saldo inicial',
          date:        new Date().toISOString(),
        });
      }
    }
    if (categoriesData) {
      const { selectedDefaults = [], customParents = [], systemOverrides = {} } = categoriesData;
      const createdIds = [];
      for (const { name, color } of customParents) {
        const { data } = await createParentCategory(name, color);
        if (data?.id) createdIds.push(data.id);
      }
      for (const [catId, color] of Object.entries(systemOverrides)) {
        await upsertSystemColorOverride(catId, color);
      }
      await updateSetting('active_categories', JSON.stringify([...selectedDefaults, ...createdIds]));
    }
  }, [createAccount, addExpense, createParentCategory, updateSetting]);

  /* ── Account handlers ── */
  const handleAddAccount = useCallback(async (data) => {
    try {
      const originalBalance = !data.isCredit ? (Number(data.balance) || 0) : 0;
      const newAccount = await createAccount({
        ...data,
        balance:     data.isCredit ? data.balance : 0,
        hasBeenSet:  data.isCredit ? true : originalBalance > 0,
      });
      if (!data.isCredit && originalBalance > 0) {
        await addExpense({
          type:        'ingreso',
          category:    INITIAL_BALANCE_CATEGORY.id,
          color:       INITIAL_BALANCE_CATEGORY.bg,
          amount:      originalBalance,
          currency:    newAccount.currency,
          accountId:   newAccount.id,
          description: 'Saldo inicial',
          date:        new Date().toISOString(),
        });
      }
      setToast('Cuenta creada');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [createAccount, addExpense]);

  const handleUpdateAccount = useCallback(async (id, fields) => {
    try {
      await updateAccount(id, fields);
      setToast('Cuenta actualizada');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [updateAccount]);

  const handleDeleteAccount = useCallback(async (id) => {
    await deleteAccount(id);
    setToast('Cuenta eliminada');
  }, [deleteAccount]);

  /* ── Credit handlers ── */
  const handleAddCharge = useCallback(async (data) => {
    try {
      await addCharge(data);
      setToast('Consumo registrado');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [addCharge]);

  const handleAddPayment = useCallback(async (data) => {
    try {
      await addExpense(data);
      setToast('Pago registrado');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [addExpense]);

  /* ── Transfer handler ── */
  const handleTransfer = useCallback(async (data) => {
    try {
      await createTransfer(data);
      // Update balances of both accounts
      const fromAcc = accounts.find(a => a.id === data.fromAccountId);
      const toAcc   = accounts.find(a => a.id === data.toAccountId);
      if (fromAcc) {
        await updateAccount(data.fromAccountId, {
          balance: fromAcc.balance - data.amount,
        });
      }
      if (toAcc) {
        await updateAccount(data.toAccountId, {
          balance: toAcc.balance + data.amount,
        });
      }
      setToast('Transferencia realizada');
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  }, [createTransfer, updateAccount, accounts]);

  /* Tabs that show the TabBar */
  const showTabBar = activeTab !== 'home';

  if (accountsLoading) return <LoadingScreen />;
  if (accounts.length === 0) return (
    <OnboardingScreen
      onComplete={handleOnboardingComplete}
      defaultCurrency={defaultCurrency || 'MXN'}
    />
  );

  return (
    <UserCategoriesProvider userCategories={userCategories} activeCategories={activeCategories}>
    <div className="app-shell">
      <div className="screen-content" id="screen-content">

        {activeTab === 'home' && (
          <HomeScreen
            expenses={expenses}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onColorChange={handleColorChange}
            onCategoryColorChange={handleCategoryColorChange}
            onSharedPaidChange={updateSharedPaid}
            onAdd={() => setShowSheet(true)}
            onAddExpense={handleAdd}
            user={user}
            onSignOut={signOut}
            defaultCurrency={defaultCurrency}
            onCurrencyChange={(code) => updateSetting('default_currency', code)}
            userCategories={userCategories}
            onCreateSubcategory={createSubcategory}
            onDeleteSubcategory={deleteSubcategory}
            onCreateParentCategory={createParentCategory}
            onUpdateCategoryColor={updateCustomCategoryColor}
            onUpdateSystemCategoryColor={handleUpdateSystemCategoryColor}
            onGoToAccounts={() => {/* Cuentas lives inside HomeScreen now */}}
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onTransfer={handleTransfer}
            transfers={transfers}
            charges={charges}
            onAddCharge={handleAddCharge}
            onAddPayment={handleAddPayment}
            yapePermission={hasPermission}
            onRequestYapePermission={requestPermission}
            recurring={recurring}
            onAddRecurring={handleAddRecurring}
            onConfirmRecurring={handleConfirmRecurring}
            onMarkRecurringDone={handleMarkRecurringDone}
            onUpdateRecurring={handleUpdateRecurring}
            onDeleteRecurring={handleDeleteRecurring}
            quickAccess={quickAccess}
            qaLoading={qaLoading}
            addQuickAccess={addQuickAccess}
            removeQuickAccess={removeQuickAccess}
            getLastExpense={getLastExpense}
            uniqueDescriptions={uniqueDescriptions}
            onQuickRegister={handleQuickRegister}
            navigateTo={homeNav}
            onNavigateDone={() => setHomeNav(null)}
            budgets={budgets}
            onAddBudget={addBudget}
            onUpdateBudget={updateBudget}
            onDeleteBudget={deleteBudget}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            expenses={expenses}
            getMonthExpenses={getMonthExpenses}
            getMonthTotal={getMonthTotal}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'quickaccess' && (
          <QuickAccessScreen
            quickAccess={quickAccess}
            loading={qaLoading}
            addQuickAccess={addQuickAccess}
            removeQuickAccess={removeQuickAccess}
            getLastExpense={getLastExpense}
            uniqueDescriptions={uniqueDescriptions}
            onRegister={handleQuickRegister}
          />
        )}

      </div>

      {/* Tab bar — visible on all tabs except home */}
      {showTabBar && (
        <TabBar
          active={activeTab}
          onTabChange={setActiveTab}
          onAdd={() => setShowSheet(true)}
        />
      )}

      {/* History / Accounts nav bar */}
      {showTabBar && (
        <div className="history-nav-bar">
          <button
            className="history-nav-back"
            onClick={() => setActiveTab('home')}
            id="btn-back-home"
          >
            ← Inicio
          </button>
          <button
            className="history-nav-signout"
            onClick={signOut}
            id="btn-sign-out-history"
          >
            Salir
          </button>
        </div>
      )}

      {/* Add expense sheet */}
      {showSheet && (
        <AddExpenseSheet
          onAdd={handleAdd}
          onClose={() => setShowSheet(false)}
          defaultCurrency={defaultCurrency}
          expenses={expenses}
          userCategories={userCategories}
          onCreateSubcategory={createSubcategory}
          accounts={accounts.filter(a => computeAccountBalance(a, expenses) > 0)}
        />
      )}

      {/* Yape auto-detected payment */}
      {yapeExpense && (
        <YapeExpenseSheet
          yapeExpense={yapeExpense}
          onAdd={handleAdd}
          onClose={clearYapeExpense}
          accounts={accounts.filter(a => computeAccountBalance(a, expenses) > 0)}
          expenses={expenses}
          onCreateSubcategory={createSubcategory}
        />
      )}

      {/* Toast */}
      {toast && (() => {
        const msg      = typeof toast === 'string' ? toast : toast.message;
        const duration = typeof toast === 'object'  ? toast.duration : undefined;
        return (
          <Toast
            key={msg + Date.now()}
            message={msg}
            duration={duration}
            onDone={() => setToast(null)}
          />
        );
      })()}
    </div>
    </UserCategoriesProvider>
  );
}

/* ══════════════════════════════════════
   ROOT — auth gate only
══════════════════════════════════════ */
export default function App() {
  const { session, user, loading, signIn, signUp, signOut } = useAuth();

  useEffect(() => {
    if (session?.access_token && user?.id) {
      syncAuthToWidget({
        url:          import.meta.env.VITE_SUPABASE_URL      ?? '',
        anonKey:      import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        userId:       user.id,
        token:        session.access_token,
        refreshToken: session.refresh_token ?? '',
      });
    }
  }, [session?.access_token, user?.id]);

  // Re-sync auth token when app comes to foreground so widget always has a valid token
  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncAuthToWidget({
          url:          import.meta.env.VITE_SUPABASE_URL      ?? '',
          anonKey:      import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
          userId:       user.id,
          token:        session.access_token,
          refreshToken: session.refresh_token ?? '',
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [session?.access_token, user?.id]);

  if (loading)  return <LoadingScreen />;
  if (!session) return <LoginScreen onSignIn={signIn} onSignUp={signUp} />;

  return (
    <ThemeProvider>
      <AuthenticatedApp user={user} signOut={signOut} />
    </ThemeProvider>
  );
}


