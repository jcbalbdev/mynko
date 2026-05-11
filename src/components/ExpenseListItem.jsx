/**
 * ExpenseListItem.jsx
 * Thin wrapper around TransactionRow for backward compatibility.
 * All rendering logic lives in TransactionRow.
 */
import React from 'react';
import TransactionRow from './ui/TransactionRow';

export default function ExpenseListItem({ expense, onPress, userCategories = [] }) {
  return <TransactionRow record={expense} onPress={onPress} userCategories={userCategories} />;
}
