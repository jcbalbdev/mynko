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
import { Trash2, Check, X, Banknote, Building2, PiggyBank }  from 'lucide-react';
import BaseSheet                 from './ui/BaseSheet';
import { resolveCategory, CATEGORIES } from '../utils/categories';
import { formatAmount }          from '../utils/expenses';
import { getCurrencyByCode }     from '../utils/currencies';
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
  const subcat   = resolveCategory(expense.category, userCategories);  // subcategoría
  const parentCat = subcat.parentId
    ? CATEGORIES.find(c => c.id === subcat.parentId) ?? null
    : CATEGORIES.find(c => c.id === expense.category) ?? null;          // categoría padre
  const currency = getCurrencyByCode(expense.currency ?? 'MXN');

  // Cuenta vinculada
  const linkedAccount = accounts.find(a => a.id === expense.accountId) ?? null;
  const AccIcon = linkedAccount ? (ACCOUNT_TYPE_ICONS[linkedAccount.type] ?? Banknote) : null;

  const [description, setDescription] = useState(expense.description ?? '');
  const [amount,      setAmount]      = useState(String(expense.amount));
  const [category,    setCategory]    = useState(expense.category);
  const [location,    setLocation]    = useState(expense.location ?? '');
  const [sharedPaid,  setSharedPaid]  = useState(expense.sharedPaid ?? false);
  const [confirmDel,  setConfirmDel]  = useState(false);

  const isShared = expense.type === 'compartido';
  const debtor   = expense.sharedWith?.trim();
  const owes     = expense.sharedOwes ?? 0;

  /* Label used in UI copy */
  const typeLabel = expense.type === 'ingreso' ? 'ingreso'
                  : expense.type === 'cambio'  ? 'cambio'
                  : 'gasto';


  /* Date / time display */
  const recordDate = new Date(expense.date);
  const dateStr = recordDate.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = recordDate.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit',
  });


  /* ── Handlers ── */
  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    await onUpdate?.(expense.id, {
      amount:      parsed,
      category,
      description: description.trim(),
      location:    location.trim() || null,
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
      <BaseSheet title={`¿Eliminar ${typeLabel}?`} onClose={() => setConfirmDel(false)}>
        <div className="edit-confirm-body">
          <p className="edit-confirm-text">
            Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este {typeLabel}?
          </p>
          <button
            className="btn-danger"
            onClick={handleDelete}
            id="btn-confirm-delete"
          >
            <Trash2 size={17} /> Sí, eliminar {typeLabel}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setConfirmDel(false)}
            id="btn-cancel-delete"
          >
            Cancelar
          </button>
        </div>
      </BaseSheet>
    );
  }

  return (
    <BaseSheet
      title={expense.description || subcat.label}
      onClose={onClose}
      /* Pass trash icon action instead of the green save button */
      onSave={null}
      headerRight={
        <button
          className="sheet-trash-btn"
          onClick={() => setConfirmDel(true)}
          aria-label={`Eliminar ${typeLabel}`}
          id="btn-open-delete-confirm"
        >
          <Trash2 size={18} strokeWidth={2.5} />
        </button>
      }
    >
      {/* ── Fecha + Hora ── */}
      <div className="edit-info-card">
        <div className="edit-info-row">
          <span className="edit-info-label">Fecha</span>
          <span className="edit-info-value" style={{ textTransform: 'capitalize' }}>{dateStr}</span>
        </div>
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Hora</span>
          <span className="edit-info-value">{timeStr}</span>
        </div>
      </div>

      {/* ── Tipo de transacción + Tipo de cuenta ── */}
      <div className="edit-info-card" style={{ marginTop: 10 }}>
        <div className="edit-info-row">
          <span className="edit-info-label">Tipo</span>
          <span
            className="edit-type-pill"
            style={{
              background: expense.type === 'ingreso'   ? '#34A853'
                        : expense.type === 'cambio'    ? '#5C6BC0'
                        : expense.type === 'compartido'? '#F57C00'
                        : '#EA4335',
              color: '#fff',
              fontWeight: 800,
              fontSize: 11,
              padding: '3px 9px',
              borderRadius: 20,
              display: 'inline-block',
            }}
          >
            {expense.type === 'ingreso'    ? 'Ingreso'
           : expense.type === 'cambio'    ? 'Cambio'
           : expense.type === 'compartido'? 'Compartido'
           : 'Gasto'}
          </span>
        </div>
        {linkedAccount && (
          <>
            <div className="edit-info-divider" />
            <div className="edit-info-row">
              <span className="edit-info-label">Cuenta</span>
              <span className="edit-info-value edit-info-account">
                {AccIcon && <AccIcon size={13} strokeWidth={2.2} style={{ color: getAccountTypeColor(linkedAccount.type), flexShrink: 0 }} />}
                <span>{linkedAccount.name}</span>
                <span className="edit-acc-type-badge" style={{ background: getAccountTypeColor(linkedAccount.type) + '22', color: getAccountTypeColor(linkedAccount.type) }}>
                  {getAccountTypeLabel(linkedAccount.type)}
                </span>
              </span>
            </div>
          </>
        )}
        {/* ── Lugar ── */}
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Lugar</span>
          {location.trim() ? (
            <span className="edit-info-value">{location.trim()}</span>
          ) : (
            <span className="edit-no-location-pill">Sin especificar</span>
          )}
        </div>
      </div>

      {/* ── Subcategoría + Categoría padre ── */}
      <div className="edit-info-card" style={{ marginTop: 10 }}>
        {parentCat && parentCat.id !== subcat.id && (
          <>
            <div className="edit-info-row">
              <span className="edit-info-label">Categoría</span>
              <span
                className="edit-cat-pill"
                style={{ background: parentCat.bg, color: '#fff', fontWeight: 800, fontSize: 11, padding: '3px 9px', borderRadius: 20, display: 'inline-block' }}
              >
                {parentCat.label}
              </span>
            </div>
            <div className="edit-info-divider" />
          </>
        )}
        <div className="edit-info-row">
          <span className="edit-info-label">{parentCat && parentCat.id !== subcat.id ? 'Subcategoría' : 'Categoría'}</span>
          <span
            className="edit-cat-pill"
            style={{ background: subcat.bg ?? subcat.color, color: '#fff', fontWeight: 800, fontSize: 11, padding: '3px 9px', borderRadius: 20, display: 'inline-block' }}
          >
            {subcat.label}
          </span>
        </div>
      </div>


      {/* ── Monto editable ── */}
      <div className="edit-section-label" style={{ marginTop: 10 }}>Monto</div>
      <div className="edit-amount-row">
        <input
          className="edit-amount-input"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min="0"
          step="0.01"
          id="edit-amount-field"
          aria-label="Monto"
        />
        <span className="edit-amount-currency">{currency.code}</span>
      </div>


      {/* ── Shared paid toggle ── */}
      {isShared && debtor && (
        <div className="shared-paid-section" style={{ marginTop: 16 }}>
          <div className="shared-paid-row">
            <div className="shared-paid-info">
              <span className="shared-paid-label">¿{debtor} te pagó?</span>
              {owes > 0 && (
                <span className="shared-paid-amount">
                  {formatAmount(owes)} {currency.code}
                </span>
              )}
            </div>
            <button
              type="button"
              className={`shared-paid-toggle${sharedPaid ? ' is-paid' : ''}`}
              onClick={handleTogglePaid}
              id="btn-shared-paid-toggle"
              aria-pressed={sharedPaid}
              aria-label={sharedPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
            >
              <span className="toggle-knob">
                {sharedPaid ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              <span className="toggle-label">{sharedPaid ? 'Sí' : 'No'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Save button ── */}
      <button
        className="btn-primary"
        onClick={handleSave}
        id="btn-save-expense"
        style={{ marginTop: 24 }}
      >
        Guardar cambios
      </button>
    </BaseSheet>
  );
}
