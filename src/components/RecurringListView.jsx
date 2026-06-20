/**
 * RecurringListView.jsx
 * Shows two tabs: "Gastos Recurrentes" (manual) and "Suscripciones" (auto).
 * Recurring items have a confirm button; subscriptions show the next charge date.
 */
import React, { useState, useMemo } from 'react';
import './RecurringListView.css';
import { Check, Bell, RefreshCw, CalendarClock } from 'lucide-react';
import EditRecurringSheet from './EditRecurringSheet';
import EmptyState from './ui/EmptyState';
import { getCurrencyByCode } from '../utils/currencies';

const WEEK_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function isRegisteredToday(rec) {
  if (!rec.lastTriggeredAt) return false;
  const today     = new Date();
  const triggered = new Date(rec.lastTriggeredAt);
  const sameDay   =
    triggered.getFullYear() === today.getFullYear() &&
    triggered.getMonth()    === today.getMonth()    &&
    triggered.getDate()     === today.getDate();
  if (!sameDay) return false;
  if (rec.frequency === 'weekly')  return (rec.daysOfWeek ?? []).includes(today.getDay());
  if (rec.frequency === 'monthly') return today.getDate() === rec.dayOfMonth;
  if (rec.frequency === 'yearly')  return today.getDate() === rec.yearlyDay && (today.getMonth() + 1) === rec.yearlyMonth;
  return false;
}

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

function RecurringCard({ rec, onConfirm, onMarkDone, onEdit }) {
  const dueLabel   = nextDueLabel(rec.nextDueDate);
  const registered = isRegisteredToday(rec);

  return (
    <div className="rec-card" onClick={() => onEdit(rec)}>
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
          <span className="rec-card-currency">{getCurrencyByCode(rec.currency).symbol}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!registered && (
            <button
              className="rec-skip-btn"
              onClick={e => { e.stopPropagation(); onMarkDone(rec.id); }}
              aria-label="Ya lo registré"
            >
              Ya lo registré
            </button>
          )}
          <button
            className={`rec-confirm-btn${registered ? ' rec-confirm-btn--done' : ''}`}
            onClick={e => { e.stopPropagation(); if (!registered) onConfirm(rec.id); }}
            aria-label={registered ? 'Ya registrado hoy' : 'Registrar pago'}
            disabled={registered}
          >
            <Check size={13} strokeWidth={3} />
            {registered ? 'Registrado' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({ rec, onEdit }) {
  const dueLabel = nextDueLabel(rec.nextDueDate);

  return (
    <div className="rec-card" onClick={() => onEdit(rec)}>
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
          <span className="rec-card-currency">{getCurrencyByCode(rec.currency).symbol}</span>
        </span>
        <span className="rec-auto-badge">Auto</span>
      </div>
    </div>
  );
}

export default function RecurringListView({
  recurring = [],
  onConfirmRecurring,
  onMarkRecurringDone,
  onUpdateRecurring,
  onDeleteRecurring,
  onAddRecurring,
  onAddSubscription,
  userCategories = [],
  accounts = [],
  onTitleChange,
}) {
  const [tab,     setTab]     = useState('recurring');
  const [editRec, setEditRec] = useState(null);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    onTitleChange?.(newTab === 'recurring' ? 'Total de gastos recurrentes' : 'Total de suscripciones');
  };

  const sortByDue = (items) => [...items].sort((a, b) => {
    if (!a.nextDueDate && !b.nextDueDate) return 0;
    if (!a.nextDueDate) return 1;
    if (!b.nextDueDate) return -1;
    return new Date(a.nextDueDate) - new Date(b.nextDueDate);
  });

  const recurringItems    = useMemo(() => sortByDue(recurring.filter(r => r.entryType === 'recurring')),    [recurring]);
  const subscriptionItems = useMemo(() => sortByDue(recurring.filter(r => r.entryType === 'subscription')), [recurring]);

  const active = tab === 'recurring' ? recurringItems : subscriptionItems;
  const isEmpty = active.length === 0;

  return (
    <div className="rec-view">

      {/* Hero */}
      <div className="rec-hero">
        <span className="rec-hero-count">{active.length}</span>
      </div>

      {/* Tabs */}
      <div className="rec-tabs">
        <button
          className={`rec-tab${tab === 'recurring' ? ' active' : ''}`}
          onClick={() => handleTabChange('recurring')}
        >
          Gastos recurrentes
        </button>
        <button
          className={`rec-tab${tab === 'subscription' ? ' active' : ''}`}
          onClick={() => handleTabChange('subscription')}
        >
          Suscripciones
        </button>
      </div>

      {/* List */}
      <div className="rec-list">
        {isEmpty ? (
          <EmptyState
            Icon={CalendarClock}
            title={tab === 'recurring' ? 'Sin gastos recurrentes' : 'Sin suscripciones'}
            description={tab === 'recurring'
              ? 'Agrega los pagos que haces regularmente y la app te recordará cuando toca pagarlos.'
              : 'Agrega tus suscripciones y la app las registrará automáticamente cada período.'}
          />
        ) : (
          active.map(rec =>
            tab === 'recurring' ? (
              <RecurringCard
                key={rec.id}
                rec={rec}
                onConfirm={onConfirmRecurring}
                onMarkDone={onMarkRecurringDone}
                onEdit={setEditRec}
              />
            ) : (
              <SubscriptionCard
                key={rec.id}
                rec={rec}
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
