/**
 * TransactionFormFields.jsx
 * Standard field sequence shared by AddExpenseSheet, AddIncomeSheet,
 * AddDebtSheet, AddRecurringSheet, AddSubscriptionSheet and YapeExpenseSheet.
 *
 * Each field can be shown/hidden via boolean props.
 * Components using this do NOT need to import each field individually.
 */
import React from 'react';
import FormSection         from './FormSection';
import AmountInput         from './AmountInput';
import DateField           from './DateField';
import CategoryPickerField from './CategoryPickerField';
import CurrencyPicker      from './CurrencyPicker';
import DescriptionInput    from './DescriptionInput';
import LocationInput       from './LocationInput';
import AccountPickerField  from './AccountPickerField';

export default function TransactionFormFields({
  /* Amount */
  amount, onAmountChange, amountRef,
  showAmount = true, amountLabel,

  /* Description */
  description, onDescriptionChange, onDescriptionPick,
  descriptionSuggestions = [],
  descriptionPlaceholder = 'Descripción',
  showDescription = true,

  /* Location */
  location, onLocationChange,
  locationSuggestions = [],
  locationPlaceholder = 'Lugar (opcional)',
  showLocation = true,

  /* Date */
  date, onDateChange, dateLabel = 'Fecha', dateId = 'btn-open-calendar',
  showDate = true,

  /* Currency */
  currency, onCurrencyChange,
  showCurrency = true,

  /* Account */
  accounts = [], accountId, onAccountIdChange,
  showAccount = true,

  /* Category */
  expenses = [],
  category, onCategoryChange,
  showCreateSubcat, onOpenCreate, onCloseCreate, onCreated,
  showCategory = true,
}) {
  return (
    <>
      {showAmount && (
        <AmountInput
          ref={amountRef}
          value={amount}
          onChange={onAmountChange}
          currency={currency}
        />
      )}

      {showDescription && (
        <DescriptionInput
          value={description}
          onChange={onDescriptionChange}
          onPick={onDescriptionPick}
          suggestions={descriptionSuggestions}
          placeholder={descriptionPlaceholder}
        />
      )}

      {showLocation && (
        <LocationInput
          value={location}
          onChange={onLocationChange}
          suggestions={locationSuggestions}
          placeholder={locationPlaceholder}
          maxLength={60}
        />
      )}

      {showDate && (
        <FormSection label={dateLabel}>
          <DateField value={date} onChange={onDateChange} id={dateId} />
        </FormSection>
      )}

      {showCurrency && (
        <FormSection label="Moneda">
          <CurrencyPicker selected={currency} onSelect={onCurrencyChange} />
        </FormSection>
      )}

      {showAccount && (
        <AccountPickerField accounts={accounts} value={accountId} onChange={onAccountIdChange} />
      )}

      {showCategory && (
        <CategoryPickerField
          selected={category}
          onSelect={onCategoryChange}
          expenses={expenses}
          showCreateSubcat={showCreateSubcat}
          onOpenCreate={onOpenCreate}
          onCloseCreate={onCloseCreate}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
