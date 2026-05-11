/**
 * useHomeSheets.js
 * Encapsulates all bottom-sheet / modal visibility state for HomeScreen.
 *
 * Returns:
 *   sheets  — object with all boolean open-states + selectedAccount
 *   actions — object with open/close handlers for each sheet
 */
import { useState } from 'react';

export function useHomeSheets() {
  const [showProfile,           setShowProfile]           = useState(false);
  const [showDebtSheet,         setShowDebtSheet]         = useState(false);
  const [showIncomeSheet,       setShowIncomeSheet]       = useState(false);
  const [showExchangeSheet,     setShowExchangeSheet]     = useState(false);
  const [showAddAccSheet,       setShowAddAccSheet]       = useState(false);
  const [showTransferSheet,     setShowTransferSheet]     = useState(false);
  const [showCreditChargeSheet, setShowCreditChargeSheet] = useState(false);
  const [showCreditPaySheet,    setShowCreditPaySheet]    = useState(false);
  const [creditSheetAccountId,  setCreditSheetAccountId]  = useState(null);
  const [selectedAccount,       setSelectedAccount]       = useState(null);
  const [editExp,               setEditExp]               = useState(null);
  const [editCat,               setEditCat]               = useState(null);
  const [showRecurringSheet,    setShowRecurringSheet]    = useState(false);
  const [showSubscriptionSheet, setShowSubscriptionSheet] = useState(false);

  return {
    // ── State ──
    sheets: {
      showProfile,
      showDebtSheet,
      showIncomeSheet,
      showExchangeSheet,
      showAddAccSheet,
      showTransferSheet,
      showCreditChargeSheet,
      showCreditPaySheet,
      creditSheetAccountId,
      selectedAccount,
      editExp,
      editCat,
      showRecurringSheet,
      showSubscriptionSheet,
    },

    // ── Actions ──
    actions: {
      openProfile:       () => setShowProfile(true),
      closeProfile:      () => setShowProfile(false),

      openDebtSheet:     () => setShowDebtSheet(true),
      closeDebtSheet:    () => setShowDebtSheet(false),

      openIncomeSheet:   () => setShowIncomeSheet(true),
      closeIncomeSheet:  () => setShowIncomeSheet(false),

      openExchangeSheet: () => setShowExchangeSheet(true),
      closeExchangeSheet:() => setShowExchangeSheet(false),

      openAddAccSheet:   () => setShowAddAccSheet(true),
      closeAddAccSheet:  () => setShowAddAccSheet(false),

      openTransferSheet: () => setShowTransferSheet(true),
      closeTransferSheet:() => setShowTransferSheet(false),

      openCreditChargeSheet: (accountId = null) => {
        setCreditSheetAccountId(accountId);
        setShowCreditChargeSheet(true);
      },
      closeCreditChargeSheet: () => {
        setShowCreditChargeSheet(false);
        setCreditSheetAccountId(null);
      },

      openCreditPaySheet: (accountId = null) => {
        setCreditSheetAccountId(accountId);
        setShowCreditPaySheet(true);
      },
      closeCreditPaySheet: () => {
        setShowCreditPaySheet(false);
        setCreditSheetAccountId(null);
      },

      selectAccount:     (acc) => setSelectedAccount(acc),
      clearAccount:      ()    => setSelectedAccount(null),

      openExpEdit:       (exp) => setEditExp(exp),
      closeExpEdit:      ()    => setEditExp(null),

      openCatEdit:       (cat) => setEditCat(cat),
      closeCatEdit:      ()    => setEditCat(null),
      syncCatEdit:       (cat) => setEditCat(cat),

      openRecurringSheet:     () => setShowRecurringSheet(true),
      closeRecurringSheet:    () => setShowRecurringSheet(false),

      openSubscriptionSheet:  () => setShowSubscriptionSheet(true),
      closeSubscriptionSheet: () => setShowSubscriptionSheet(false),
    },
  };
}
