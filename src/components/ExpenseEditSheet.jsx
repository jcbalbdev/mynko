/**
 * ExpenseEditSheet.jsx
 * Detail/edit sheet for expenses, incomes and exchanges.
 * Features:
 * - Descripción editable
 * - Fecha + hora
 * - Tipo de transacción + tipo de cuenta
 * - Subcategoría + categoría padre
 * - Monto editable
 * - Trash icon → confirmación antes de eliminar
 * - "Guardar cambios" button
 * - Shared paid toggle
 */
import React, { useState } from 'react';
import { Trash2, Check, X, Banknote, Building2, PiggyBank } from 'lucide-react';
import BaseSheet              from './ui/BaseSheet';
import ConfirmDeleteSheet     from './ui/ConfirmDeleteSheet';
import CalendarModal          from './ui/CalendarModal';
import CategoryPickerSheet    from './ui/CategoryPickerSheet';
import { resolveCategory }    from '../utils/categories';
import { formatAmount }       from '../utils/formatters';
import { getCurrencyByCode }  from '../utils/currencies';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';
import { getAccountTypeColor, getAccountTypeLabel } from '../utils/accounts';

const ACCOUNT_TYPE_ICONS = {
  efectivo: Banknote,
  banco:    Building2,
  ahorro:   PiggyBank,
};

export default function ExpenseEditSheet({
  expense,
  onClose,
  onDelete,
  onUpdate,
  onSharedPaidChange,
  accounts = [],
}) {
  const userCategories = useUserCategoriesCtx();
  const currency = getCurrencyByCode(expense.currency ?? 'MXN');

  // Cuenta vinculada
  const linkedAccount = accounts.find(a => a.id === expense.accountId) ?? null;
  const AccIcon = linkedAccount ? (ACCOUNT_TYPE_ICONS[linkedAccount.type] ?? Banknote) : null;

  const [description, setDescription] = useState(expense.description ?? '');
  const [amount,      setAmount]      = useState(String(expense.amount));
  const [category,    setCategory]    = useState(expense.category);
  const [location,    setLocation]    = useState(expense.location ?? '');
  const [sharedPaid,  setSharedPaid]  = useState(expense.sharedPaid ?? false);
  const [confirmDel,      setConfirmDel]      = useState(false);
  const [showCalendar,    setShowCalendar]    = useState(false);
  const [showCatPicker,   setShowCatPicker]   = useState(false);

  const subcat    = resolveCategory(category, userCategories);
  const parentCat = subcat.parentId ? resolveCategory(subcat.parentId, userCategories) : null;

  // Editable date — keep time from original, only change the date part
  const originalDate = new Date(expense.date);
  const [selectedDate, setSelectedDate] = useState(new Date(originalDate));

  const isShared = expense.type === 'compartido';
  const debtor   = expense.sharedWith?.trim();
  const owes     = expense.sharedOwes ?? 0;

  /* Label used in UI copy */
  const typeLabel = expense.type === 'ingreso' ? 'ingreso'
                  : expense.type === 'cambio'  ? 'cambio'
                  : 'gasto';


  /* Date / time display */
  const dateStr = selectedDate.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = originalDate.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit',
  });


  /* ── Handlers ── */
  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    // Rebuild date preserving original time but with the new date part
    const newDate = new Date(originalDate);
    newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    await onUpdate?.(expense.id, {
      amount:      parsed,
      category,
      description: description.trim(),
      location:    location.trim() || null,
      date:        newDate.toISOString(),
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(expense.id, expense.type);
    onClose();
  };

  const handleTogglePaid = () => {
    const next = !sharedPaid;
    setSharedPaid(next);
    onSharedPaidChange?.(expense.id, next);
  };

  /* ── Confirmation overlay ── */
  if (confirmDel) {
    return (
      <ConfirmDeleteSheet
        itemLabel={typeLabel}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    );
  }

  return (
    <BaseSheet
      title={expense.description || subcat.label}
      onClose={onClose}
      headerRight={
        <button className="sheet-trash-btn" onClick={() => setConfirmDel(true)} aria-label={`Eliminar ${typeLabel}`} id="btn-open-delete-confirm">
          <Trash2 size={18} strokeWidth={2.5} />
        </button>
      }
    >
      {/* ── Hero: monto + categoría ── */}
      <div className="txn-edit-hero">
        <div className="txn-edit-amount-wrap">
          <span className="txn-edit-currency">{currency.symbol}</span>
          <input
            className="txn-edit-amount-input"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="0.01"
            id="edit-amount-field"
            aria-label="Monto"
            style={{ width: `${Math.max((String(amount) || '0').length, 2) * 27 + 8}px` }}
          />
        </div>
        <div className="txn-edit-cat-pills" onClick={() => setShowCatPicker(true)} style={{ cursor: 'pointer' }}>
          {parentCat && parentCat.id !== subcat.id && (
            <span className="txn-edit-cat-pill" style={{ background: subcat.bg ?? subcat.color }}>{parentCat.label}</span>
          )}
          <span className="txn-edit-cat-pill" style={{ background: subcat.bg ?? subcat.color }}>{subcat.label}</span>
        </div>
      </div>

      {/* ── Metadata card ── */}
      <div className="edit-info-card">
        <div className="edit-info-row" onClick={() => setShowCalendar(true)} style={{ cursor: 'pointer' }}>
          <span className="edit-info-label">Fecha</span>
          <span className="edit-info-value" style={{ textTransform: 'capitalize', color: 'var(--color-accent)' }}>{dateStr}</span>
        </div>
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Hora</span>
          <span className="edit-info-value">{timeStr}</span>
        </div>
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Tipo</span>
          <span className="txn-type-pill">
            {expense.type === 'ingreso' ? 'Ingreso' : expense.type === 'cambio' ? 'Cambio' : expense.type === 'compartido' ? 'Compartido' : 'Gasto'}
          </span>
        </div>
        {linkedAccount && (
          <>
            <div className="edit-info-divider" />
            <div className="edit-info-row">
              <span className="edit-info-label">Cuenta</span>
              <span className="edit-info-value edit-info-account">
                {AccIcon && <AccIcon size={13} strokeWidth={2.2} style={{ color: 'var(--label-tertiary)', flexShrink: 0 }} />}
                <span>{linkedAccount.name}</span>
              </span>
            </div>
          </>
        )}
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Lugar</span>
          {location.trim()
            ? <span className="edit-info-value">{location.trim()}</span>
            : <span className="edit-no-location-pill">Sin especificar</span>
          }
        </div>
      </div>

      {/* ── Shared paid ── */}
      {isShared && debtor && (
        <div className="shared-paid-section" style={{ marginTop: 10 }}>
          <div className="shared-paid-row">
            <div className="shared-paid-info">
              <span className="shared-paid-label">¿{debtor} te pagó?</span>
              {owes > 0 && <span className="shared-paid-amount">{formatAmount(owes)} {currency.symbol}</span>}
            </div>
            <button type="button" className={`shared-paid-toggle${sharedPaid ? ' is-paid' : ''}`} onClick={handleTogglePaid} id="btn-shared-paid-toggle" aria-pressed={sharedPaid}>
              <span className="toggle-knob">{sharedPaid ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}</span>
              <span className="toggle-label">{sharedPaid ? 'Sí' : 'No'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Save ── */}
      <button className="btn-primary" onClick={handleSave} id="btn-save-expense" style={{ marginTop: 16 }}>
        Guardar cambios
      </button>

      {showCalendar && (
        <CalendarModal
          value={selectedDate}
          onChange={date => setSelectedDate(date)}
          onClose={() => setShowCalendar(false)}
        />
      )}

      <CategoryPickerSheet
        open={showCatPicker}
        onClose={() => setShowCatPicker(false)}
        selected={category}
        onSelect={(cat) => { setCategory(cat); setShowCatPicker(false); }}
        userCategories={userCategories}
      />
    </BaseSheet>
  );
}
