import React, { useState, useMemo } from 'react';
import { Trash2, Zap, X, Search } from 'lucide-react';
import './QuickAccessScreen.css';
import { resolveCategory } from '../utils/categories';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';

function TypeBadge({ type }) {
  const label = type === 'ingreso' ? 'Ingreso' : type === 'compartido' ? 'Compartido' : 'Gasto';
  const cls   = type === 'ingreso' ? 'qa-badge--income' : type === 'compartido' ? 'qa-badge--shared' : 'qa-badge--expense';
  return <span className={`qa-badge ${cls}`}>{label}</span>;
}

function QuickAccessCard({ item, lastExpense, onRemove }) {
  const userCategories = useUserCategoriesCtx();
  if (!lastExpense) return null;
  return (
    <div className="qa-card">
      <div className="qa-card-info">
        <span className="qa-card-desc">{item.description}</span>
        <div className="qa-card-meta">
          <TypeBadge type={lastExpense.type} />
          <span
            className="qa-cat-pill"
            style={{ background: resolveCategory(lastExpense.category, userCategories).bg ?? '#ccc', color: '#fff' }}
          >
            {resolveCategory(lastExpense.category, userCategories).label}
          </span>
          <span className="qa-card-amount">
            {lastExpense.currency} {Number(lastExpense.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <div className="qa-card-actions">
        <button
          className="qa-delete-btn"
          onClick={() => onRemove(item.description)}
          aria-label="Eliminar acceso rápido"
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function DescriptionPicker({ uniqueDescriptions, quickAccess, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const userCategories = useUserCategoriesCtx();

  const available = useMemo(() => {
    const activeDescs = new Set(quickAccess.map(q => q.description));
    return uniqueDescriptions()
      .filter(({ description }) => !activeDescs.has(description))
      .filter(({ description }) =>
        description.toLowerCase().includes(search.toLowerCase())
      );
  }, [uniqueDescriptions, quickAccess, search]);

  return (
    <div className="qa-picker-overlay" onClick={onClose}>
      <div className="qa-picker-sheet" onClick={e => e.stopPropagation()}>
        <div className="qa-picker-header">
          <span className="qa-picker-title">Elige una transacción</span>
          <button className="qa-picker-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="qa-picker-search">
          <Search size={14} className="qa-search-icon" />
          <input
            className="qa-search-input"
            placeholder="Buscar descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="qa-picker-list">
          {available.length === 0 ? (
            <p className="qa-picker-empty">
              {search ? 'Sin resultados' : 'Todos tus gastos ya son accesos rápidos'}
            </p>
          ) : (
            available.map(({ description, expense }) => (
              <button
                key={description}
                className="qa-picker-item"
                onClick={() => onSelect(description)}
              >
                <div className="qa-picker-item-info">
                  <span className="qa-picker-item-desc">{description}</span>
                  <span className="qa-picker-item-meta">
                    <TypeBadge type={expense.type} />
                    <span
                      className="qa-cat-pill"
                      style={{ background: resolveCategory(expense.category, userCategories).bg ?? '#ccc', color: '#fff' }}
                    >
                      {resolveCategory(expense.category, userCategories).label}
                    </span>
                    {expense.currency} {Number(expense.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuickAccessScreen({
  quickAccess = [],
  loading,
  addQuickAccess,
  removeQuickAccess,
  getLastExpense,
  uniqueDescriptions,
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelect = async (description) => {
    setShowPicker(false);
    await addQuickAccess(description);
  };

  return (
    <div className="qa-view">
      {loading ? (
        <div className="qa-loading">Cargando...</div>
      ) : quickAccess.length === 0 ? (
        <div className="qa-empty">
          <Zap size={40} strokeWidth={1.5} className="qa-empty-icon" />
          <p className="qa-empty-title">Sin accesos rápidos</p>
          <p className="qa-empty-desc">
            Presiona <strong>+</strong> para agregar una transacción frecuente como acceso rápido.
          </p>
        </div>
      ) : (
        <div className="qa-list">
          {quickAccess.map(item => (
            <QuickAccessCard
              key={item.id}
              item={item}
              lastExpense={getLastExpense(item.description)}
              onRemove={removeQuickAccess}
            />
          ))}
          <div style={{ height: 100 }} />
        </div>
      )}

      <button
        className="add-pill-btn"
        onClick={() => setShowPicker(true)}
        aria-label="Agregar acceso rápido"
      >+</button>

      {showPicker && (
        <DescriptionPicker
          uniqueDescriptions={uniqueDescriptions}
          quickAccess={quickAccess}
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
