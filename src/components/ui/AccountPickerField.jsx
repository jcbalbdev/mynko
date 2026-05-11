import React, { useState } from 'react';
import FormSection  from './FormSection';
import AccountPicker from './AccountPicker';

/**
 * Wraps the repeated pattern: local open/close state + FormSection + AccountPicker.
 * Used by AddExpenseSheet, AddDebtSheet, AddIncomeSheet (and any future form sheet).
 * Returns null when no accounts are available.
 */
export default function AccountPickerField({ accounts, value, onChange, label = 'Cuenta' }) {
  const [open, setOpen] = useState(false);
  if (!accounts.length) return null;
  return (
    <FormSection label={label}>
      <AccountPicker
        accounts={accounts}
        value={value}
        onChange={onChange}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      />
    </FormSection>
  );
}
