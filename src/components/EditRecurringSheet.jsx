import React, { useState } from 'react';
import { Trash2 }          from 'lucide-react';
import BaseSheet            from './ui/BaseSheet';
import { resolveCategory, CATEGORIES } from '../utils/categories';
import { getCurrencyByCode }           from '../utils/currencies';

const WEEK_LABELS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function scheduleLabel(rec) {
  if (rec.frequency === 'weekly') {
    const days = (rec.daysOfWeek ?? []).sort().map(d => WEEK_LABELS[d]).join(', ');
    return `Cada ${days}`;
  }
  if (rec.frequency === 'monthly') return `Día ${rec.dayOfMonth} de cada mes`;
  if (rec.frequency === 'yearly')  return `${rec.yearlyDay} de ${MONTH_NAMES[(rec.yearlyMonth ?? 1) - 1]} cada año`;
  return '';
}

export default function EditRecurringSheet({ rec, onClose, onUpdate, onDelete, userCategories = [], accounts = [] }) {
  const subcat     = resolveCategory(rec.category, userCategories);
  const parentCat  = subcat.parentId
    ? CATEGORIES.find(c => c.id === subcat.parentId) ?? null
    : CATEGORIES.find(c => c.id === rec.category)   ?? null;
  const currency   = getCurrencyByCode(rec.currency ?? 'MXN');
  const linkedAcct = accounts.find(a => a.id === rec.accountId) ?? null;

  const [amount,      setAmount]      = useState(String(rec.amount));
  const [description, setDescription] = useState(rec.description ?? '');
  const [location,    setLocation]    = useState(rec.location    ?? '');
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
      <BaseSheet title="¿Eliminar recurrente?" onClose={() => setConfirmDel(false)}>
        <div className="edit-confirm-body">
          <p className="edit-confirm-text">
            Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este gasto recurrente?
          </p>
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={17} /> Sí, eliminar
          </button>
          <button className="btn-secondary" onClick={() => setConfirmDel(false)}>
            Cancelar
          </button>
        </div>
      </BaseSheet>
    );
  }

  return (
    <BaseSheet
      title={rec.description || subcat.label}
      onClose={onClose}
      onSave={null}
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
      {/* ── Info ── */}
      <div className="edit-info-card">
        <div className="edit-info-row">
          <span className="edit-info-label">Frecuencia</span>
          <span className="edit-info-value">{scheduleLabel(rec)}</span>
        </div>
        {rec.nextDueDate && (
          <>
            <div className="edit-info-divider" />
            <div className="edit-info-row">
              <span className="edit-info-label">Próximo vence</span>
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
      </div>

      {/* ── Categoría ── */}
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

      {/* ── Descripción ── */}
      <div className="edit-section-label" style={{ marginTop: 10 }}>Descripción</div>
      <div className="edit-amount-row">
        <input
          className="edit-amount-input"
          style={{ fontSize: 15, fontWeight: 400 }}
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Sin descripción"
          maxLength={80}
        />
      </div>

      {/* ── Lugar ── */}
      <div className="edit-section-label" style={{ marginTop: 12 }}>Lugar</div>
      <div className="edit-amount-row">
        <input
          className="edit-amount-input"
          style={{ fontSize: 15, fontWeight: 400 }}
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Sin especificar"
          maxLength={60}
        />
      </div>

      {/* ── Monto ── */}
      <div className="edit-section-label" style={{ marginTop: 12 }}>Monto</div>
      <div className="edit-amount-row">
        <input
          className="edit-amount-input"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min="0"
          step="0.01"
          aria-label="Monto"
        />
        <span className="edit-amount-currency">{currency.code}</span>
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ marginTop: 24 }}>
        Guardar cambios
      </button>
    </BaseSheet>
  );
}
