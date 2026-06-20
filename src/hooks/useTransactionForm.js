/**
 * useTransactionForm.js
 * Encapsulates the repeated form state + auto-fill logic shared by
 * AddExpenseSheet, AddIncomeSheet, AddDebtSheet, AddRecurringSheet,
 * AddSubscriptionSheet and YapeExpenseSheet.
 *
 * Each sheet keeps only its unique state (type toggle, shared fields, etc.)
 * and delegates common state to this hook.
 */
import { useState, useMemo } from 'react';
import { useSubcategoryForm } from './useSubcategoryForm';

/**
 * @param {object}   opts
 * @param {string}   opts.defaultCurrency
 * @param {object[]} opts.expenses          - Full expenses list for suggestions
 * @param {object[]} opts.accounts
 * @param {string}   opts.initialCategory
 * @param {string|null} opts.initialAccountId
 * @param {string}   opts.initialAmount
 * @param {string}   opts.initialDescription
 * @param {string}   opts.initialLocation
 * @param {Function} opts.onCreateSubcategory
 */
export function useTransactionForm({
  defaultCurrency   = 'MXN',
  expenses          = [],
  accounts          = [],
  initialCategory   = '',
  initialAccountId  = null,
  initialAmount     = '',
  initialDescription = '',
  initialLocation   = '',
  onCreateSubcategory,
} = {}) {
  const [amount,      setAmount]      = useState(initialAmount);
  const [description, setDescription] = useState(initialDescription);
  const [location,    setLocation]    = useState(initialLocation);
  const [currency,    setCurrency]    = useState(defaultCurrency);
  const [date,        setDate]        = useState(new Date());
  const [accountId,   setAccountId]   = useState(
    accounts.some(a => a.id === initialAccountId) ? initialAccountId : (accounts[0]?.id ?? '')
  );

  /* ── Category state from the existing hook ── */
  const subcategoryForm = useSubcategoryForm(onCreateSubcategory, initialCategory);
  const { category, setCategory } = subcategoryForm;

  /* ── Autocomplete suggestions derived from history ── */
  const descriptionSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.description?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  const locationSuggestions = useMemo(() => {
    const set = new Set(expenses.map(e => e.location?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [expenses]);

  /**
   * Auto-fill location, account and category from the last expense
   * that has the same description.
   */
  const handleDescriptionPick = (desc) => {
    const last = expenses
      .filter(e => e.description?.trim() === desc)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!last) return;
    if (last.location)  setLocation(last.location);
    if (last.accountId) setAccountId(last.accountId);
    if (last.category)  setCategory(last.category);
  };

  /* ── Validation ── */
  const isValid = parseFloat(amount) > 0 && category !== '';

  /* ── Standard payload builder ── */
  const buildPayload = (extra = {}) => ({
    amount:      parseFloat(amount),
    description: description.trim(),
    location:    location.trim() || null,
    category,
    color:       subcategoryForm.activeColor,
    currency,
    date,
    accountId:   accountId || null,
    ...extra,
  });

  return {
    /* Fields */
    amount,      setAmount,
    description, setDescription,
    location,    setLocation,
    currency,    setCurrency,
    date,        setDate,
    accountId,   setAccountId,
    /* Suggestions */
    descriptionSuggestions,
    locationSuggestions,
    /* Handlers */
    handleDescriptionPick,
    /* Validation */
    isValid,
    /* Payload */
    buildPayload,
    /* Spread category sub-form fields */
    ...subcategoryForm,
  };
}
