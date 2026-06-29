import React, { useState } from 'react';
import { Trash2 }              from 'lucide-react';
import BaseSheet               from './ui/BaseSheet';
import ConfirmDeleteSheet      from './ui/ConfirmDeleteSheet';
import CategoryPickerSheet     from './ui/CategoryPickerSheet';
import CalendarModal           from './ui/CalendarModal';
import { resolveCategory }     from '../utils/categories';
import { getCurrencyByCode }   from '../utils/currencies';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

function installmentLabel(charge) {
  if (!charge.installments || charge.installments <= 1) return null;
  const start   = new Date(charge.date);
  const now     = new Date();
  let months    = (now.getFullYear() - start.getFullYear()) * 12
                + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) months += 1;
  const elapsed = Math.min(charge.installments, Math.max(0, months));
  return `Cuota ${elapsed}/${charge.installments}`;
}

export default function CreditChargeEditSheet({ charge, accountName, onClose, onDelete, onUpdate }) {
  const userCategories = useUserCategoriesCtx();
  const currency = getCurrencyByCode(charge.currency ?? 'PEN');

  const [description,   setDescription]   = useState(charge.description ?? '');
  const [amount,        setAmount]        = useState(String(charge.amount));
  const [category,      setCategory]      = useState(charge.category ?? 'other');
  const [confirmDel,    setConfirmDel]    = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showCalendar,  setShowCalendar]  = useState(false);

  const originalDate = new Date(charge.date);
  const [selectedDate, setSelectedDate]  = useState(new Date(originalDate));

  const cat       = resolveCategory(category, userCategories);
  const parentCat = cat.parentId ? resolveCategory(cat.parentId, userCategories) : null;

  const dateStr = selectedDate.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = originalDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const instLabel = installmentLabel(charge);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    const newDate = new Date(originalDate);
    newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    await onUpdate?.(charge.id, {
      amount:      parsed,
      category,
      description: description.trim(),
      date:        newDate.toISOString(),
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(charge.id);
    onClose();
  };

  if (confirmDel) {
    return (
      <ConfirmDeleteSheet
        itemLabel="consumo"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    );
  }

  return (
    <BaseSheet
      title={charge.description || 'Consumo'}
      onClose={onClose}
      headerRight={
        <button className="sheet-trash-btn" onClick={() => setConfirmDel(true)} aria-label="Eliminar consumo">
          <Trash2 size={18} strokeWidth={2.5} />
        </button>
      }
    >
      {/* Hero: amount + category pill */}
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
        <div className="txn-edit-cat-pills" onClick={() => setShowCatPicker(true)} style={{ cursor: 'pointer' }}>
          {parentCat && parentCat.id !== cat.id && (
            <span className="txn-edit-cat-pill" style={{ background: cat.bg ?? cat.color }}>{parentCat.label}</span>
          )}
          <span className="txn-edit-cat-pill" style={{ background: cat.bg ?? cat.color }}>{cat.label}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="edit-info-card" style={{ marginBottom: 12 }}>
        <div className="edit-info-row">
          <span className="edit-info-label">Descripción</span>
          <input
            className="txn-edit-desc-input"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Sin descripción"
          />
        </div>
        <div className="edit-info-divider" />
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
          <span className="edit-info-label">Tarjeta</span>
          <span className="edit-info-value">{accountName}</span>
        </div>
        {instLabel && (
          <>
            <div className="edit-info-divider" />
            <div className="edit-info-row">
              <span className="edit-info-label">Cuotas</span>
              <span className="txn-type-pill">{instLabel}</span>
            </div>
          </>
        )}
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ marginTop: 4 }}>
        Guardar cambios
      </button>

      <CategoryPickerSheet
        open={showCatPicker}
        onClose={() => setShowCatPicker(false)}
        selected={category}
        onSelect={(cat) => { setCategory(cat); setShowCatPicker(false); }}
        userCategories={userCategories}
      />

      {showCalendar && (
        <CalendarModal
          value={selectedDate}
          onChange={date => setSelectedDate(date)}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </BaseSheet>
  );
}
