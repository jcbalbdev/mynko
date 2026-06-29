import React, { useState } from 'react';
import { Trash2 }             from 'lucide-react';
import BaseSheet              from './ui/BaseSheet';
import ConfirmDeleteSheet     from './ui/ConfirmDeleteSheet';
import { resolveCategory }    from '../utils/categories';
import { getCurrencyByCode } from '../utils/currencies';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

const WEEK_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function scheduleLabel(rec) {
  if (rec.frequency === 'weekly') {
    const days = (rec.daysOfWeek ?? []).sort().map(d => WEEK_LABELS[d]).join(', ');
    return `Cada ${days}`;
  }
  if (rec.frequency === 'monthly') return `Día ${rec.dayOfMonth} de cada mes`;
  if (rec.frequency === 'yearly')  return `${rec.yearlyDay} de ${MONTH_NAMES[(rec.yearlyMonth ?? 1) - 1]} cada año`;
  return '';
}

export default function EditRecurringSheet({ rec, onClose, onUpdate, onDelete, accounts = [] }) {
  const userCategories = useUserCategoriesCtx();
  const subcat     = resolveCategory(rec.category, userCategories);
  const parentCat  = subcat.parentId ? resolveCategory(subcat.parentId, userCategories) : null;
  const currency   = getCurrencyByCode(rec.currency ?? 'MXN');
  const linkedAcct = accounts.find(a => a.id === rec.accountId) ?? null;

  const [amount,      setAmount]      = useState(String(rec.amount));
  const [description, setDescription] = useState(rec.description ?? '');
  const [location,    setLocation]    = useState(rec.location ?? '');
  const [confirmDel,  setConfirmDel]  = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    await onUpdate?.(rec.id, {
      amount:      parsed,
      description: description.trim(),
      location:    location.trim() || null,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(rec.id);
    onClose();
  };

  if (confirmDel) {
    return (
      <ConfirmDeleteSheet
        itemLabel="gasto recurrente"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    );
  }

  return (
    <BaseSheet
      title={description || subcat.label}
      onClose={onClose}
      headerRight={
        <button
          className="sheet-trash-btn"
          onClick={() => setConfirmDel(true)}
          aria-label="Eliminar gasto recurrente"
        >
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
            aria-label="Monto"
            style={{ width: `${Math.max((String(amount) || '0').length, 2) * 27 + 8}px` }}
          />
        </div>
        <div className="txn-edit-cat-pills">
          {parentCat && parentCat.id !== subcat.id && (
            <span className="txn-edit-cat-pill" style={{ background: subcat.bg ?? subcat.color }}>
              {parentCat.label}
            </span>
          )}
          <span className="txn-edit-cat-pill" style={{ background: subcat.bg ?? subcat.color }}>
            {subcat.label}
          </span>
        </div>
      </div>

      {/* ── Metadata card ── */}
      <div className="edit-info-card">
        <div className="edit-info-row">
          <span className="edit-info-label">Frecuencia</span>
          <span className="edit-info-value">{scheduleLabel(rec)}</span>
        </div>
        {rec.nextDueDate && (
          <>
            <div className="edit-info-divider" />
            <div className="edit-info-row">
              <span className="edit-info-label">Próxima fecha</span>
              <span className="edit-info-value">
                {new Date(rec.nextDueDate + 'T00:00:00').toLocaleDateString('es-PE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </>
        )}
        {linkedAcct && (
          <>
            <div className="edit-info-divider" />
            <div className="edit-info-row">
              <span className="edit-info-label">Cuenta</span>
              <span className="edit-info-value">{linkedAcct.name}</span>
            </div>
          </>
        )}
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Descripción</span>
          <input
            className="edit-inline-input"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Sin descripción"
            maxLength={80}
          />
        </div>
        <div className="edit-info-divider" />
        <div className="edit-info-row">
          <span className="edit-info-label">Lugar</span>
          <input
            className="edit-inline-input"
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Sin especificar"
            maxLength={60}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ marginTop: 16 }}>
        Guardar cambios
      </button>
    </BaseSheet>
  );
}
