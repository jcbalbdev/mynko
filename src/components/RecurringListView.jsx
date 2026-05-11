/**
 * RecurringListView.jsx
 * Shows two tabs: "Gastos Recurrentes" (manual) and "Suscripciones" (auto).
 * Recurring items have a confirm button; subscriptions show the next charge date.
 */
import React, { useState, useMemo } from 'react';
import './RecurringListView.css';
import { Plus, Check, Trash2, Bell, RefreshCw } from 'lucide-react';
import EditRecurringSheet from './EditRecurringSheet';

const WEEK_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function scheduleLabel(rec) {
  if (rec.frequency === 'weekly') {
    const days = (rec.daysOfWeek ?? [])
      .sort()
      .map(d => WEEK_LABELS[d])
      .join(', ');
    return `Cada ${days}`;
  }
  if (rec.frequency === 'monthly') {
    return `Día ${rec.dayOfMonth} de cada mes`;
  }
  if (rec.frequency === 'yearly') {
    return `${rec.yearlyDay} de ${MONTH_NAMES[(rec.yearlyMonth ?? 1) - 1]} cada año`;
  }
  return '';
}

function nextDueLabel(nextDueDate) {
  if (!nextDueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(nextDueDate + 'T00:00:00');
  const diff  = Math.round((due - today) / 86400000);

  if (diff < 0)  return { text: `Vence hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`, urgent: true };
  if (diff === 0) return { text: 'Vence hoy', urgent: true };
  if (diff === 1) return { text: 'Vence mañana', urgent: true };
  if (diff <= 3)  return { text: `En ${diff} días`, urgent: true };
  return { text: `En ${diff} días`, urgent: false };
}

function RecurringCard({ rec, onConfirm, onDelete, onEdit }) {
  const dueLabel = nextDueLabel(rec.nextDueDate);

  return (
    <div className={`rec-card${dueLabel?.urgent ? ' rec-card--urgent' : ''}`} onClick={() => onEdit(rec)} style={{ cursor: 'pointer' }}>
      <div className="rec-card-left">
        <div className="rec-card-info">
          <span className="rec-card-name">{rec.description || rec.category}</span>
          <span className="rec-card-schedule">{scheduleLabel(rec)}</span>
          {dueLabel && (
            <span className={`rec-card-due${dueLabel.urgent ? ' rec-card-due--urgent' : ''}`}>
              <Bell size={11} strokeWidth={2.5} style={{ marginRight: 3 }} />
              {dueLabel.text}
            </span>
          )}
        </div>
      </div>
      <div className="rec-card-right">
        <span className="rec-card-amount">
          {rec.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          {' '}
          <span className="rec-card-currency">{rec.currency}</span>
        </span>
        <div className="rec-card-actions">
          <button
            className="rec-confirm-btn"
            onClick={e => { e.stopPropagation(); onConfirm(rec.id); }}
            aria-label="Registrar pago"
          >
            <Check size={14} strokeWidth={3} />
            Registrar
          </button>
          <button
            className="rec-delete-btn"
            onClick={e => { e.stopPropagation(); onDelete(rec.id); }}
            aria-label="Eliminar"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({ rec, onDelete, onEdit }) {
  const dueLabel = nextDueLabel(rec.nextDueDate);

  return (
    <div className={`rec-card${dueLabel?.urgent ? ' rec-card--urgent' : ''}`} onClick={() => onEdit(rec)} style={{ cursor: 'pointer' }}>
      <div className="rec-card-left">
        <div className="rec-card-info">
          <span className="rec-card-name">{rec.description || rec.category}</span>
          <span className="rec-card-schedule">{scheduleLabel(rec)}</span>
          {dueLabel && (
            <span className={`rec-card-due${dueLabel.urgent ? ' rec-card-due--urgent' : ''}`}>
              <Bell size={11} strokeWidth={2.5} style={{ marginRight: 3 }} />
              {dueLabel.text}
            </span>
          )}
          {rec.lastTriggeredAt && (
            <span className="rec-card-last">
              <RefreshCw size={10} strokeWidth={2} style={{ marginRight: 3 }} />
              Último cobro: {new Date(rec.lastTriggeredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <div className="rec-card-right">
        <span className="rec-card-amount">
          {rec.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          {' '}
          <span className="rec-card-currency">{rec.currency}</span>
        </span>
        <div className="rec-card-actions">
          <span className="rec-auto-badge">Auto</span>
          <button
            className="rec-delete-btn"
            onClick={e => { e.stopPropagation(); onDelete(rec.id); }}
            aria-label="Eliminar"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecurringListView({
  recurring = [],
  onConfirmRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onAddRecurring,
  onAddSubscription,
  userCategories = [],
  accounts = [],
}) {
  const [tab,     setTab]     = useState('recurring');
  const [editRec, setEditRec] = useState(null);

  const recurringItems     = useMemo(() => recurring.filter(r => r.entryType === 'recurring'),     [recurring]);
  const subscriptionItems  = useMemo(() => recurring.filter(r => r.entryType === 'subscription'),  [recurring]);

  const active = tab === 'recurring' ? recurringItems : subscriptionItems;
  const isEmpty = active.length === 0;

  return (
    <div className="rec-view">

      {/* Tabs */}
      <div className="rec-tabs">
        <button
          className={`rec-tab${tab === 'recurring' ? ' active' : ''}`}
          onClick={() => setTab('recurring')}
        >
          Gastos recurrentes
          {recurringItems.length > 0 && (
            <span className="rec-tab-badge">{recurringItems.length}</span>
          )}
        </button>
        <button
          className={`rec-tab${tab === 'subscription' ? ' active' : ''}`}
          onClick={() => setTab('subscription')}
        >
          Suscripciones
          {subscriptionItems.length > 0 && (
            <span className="rec-tab-badge">{subscriptionItems.length}</span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="rec-list">
        {isEmpty ? (
          <div className="rec-empty">
            <p className="rec-empty-title">
              {tab === 'recurring' ? 'Sin gastos recurrentes' : 'Sin suscripciones'}
            </p>
            <p className="rec-empty-desc">
              {tab === 'recurring'
                ? 'Agrega los pagos que haces regularmente y la app te recordará cuando toca pagarlos.'
                : 'Agrega tus suscripciones y la app las registrará automáticamente cada período.'}
            </p>
          </div>
        ) : (
          active.map(rec =>
            tab === 'recurring' ? (
              <RecurringCard
                key={rec.id}
                rec={rec}
                onConfirm={onConfirmRecurring}
                onDelete={onDeleteRecurring}
                onEdit={setEditRec}
              />
            ) : (
              <SubscriptionCard
                key={rec.id}
                rec={rec}
                onDelete={onDeleteRecurring}
                onEdit={setEditRec}
              />
            )
          )
        )}
        <div style={{ height: 100 }} />
      </div>

      {/* FAB */}
      <button
        className="add-pill-btn"
        onClick={tab === 'recurring' ? onAddRecurring : onAddSubscription}
        aria-label={tab === 'recurring' ? 'Agregar gasto recurrente' : 'Agregar suscripción'}
      >+</button>

      {editRec && (
        <EditRecurringSheet
          rec={editRec}
          onClose={() => setEditRec(null)}
          onUpdate={onUpdateRecurring}
          onDelete={(id) => { onDeleteRecurring(id); setEditRec(null); }}
          userCategories={userCategories}
          accounts={accounts}
        />
      )}
    </div>
  );
}
