import React, { useState, useRef, useMemo } from 'react';
import { Zap, X, Search, Trash2 } from 'lucide-react';
import './QuickAccessScreen.css';
import { resolveCategory } from '../utils/categories';
import { useUserCategoriesCtx } from '../context/UserCategoriesContext';
import { getCurrencyByCode } from '../utils/currencies';
import TransactionRow from './ui/TransactionRow';
import EmptyState from './ui/EmptyState';

function QuickAccessCard({ item, lastExpense, onRemove }) {
  const userCategories = useUserCategoriesCtx();
  const [showModal, setShowModal] = useState(false);
  const cardRef  = useRef(null);
  const startXRef   = useRef(null);
  const currentDxRef = useRef(0);

  if (!lastExpense) return null;

  const cat      = resolveCategory(lastExpense.category, userCategories);
  const currency = getCurrencyByCode(lastExpense.currency ?? 'MXN');
  const time     = new Date(lastExpense.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    if (cardRef.current) cardRef.current.classList.remove('snap-back');
  };

  const onTouchMove = (e) => {
    if (startXRef.current === null) return;
    const dx = startXRef.current - e.touches[0].clientX;
    const clamped = Math.max(0, Math.min(dx, 80));
    currentDxRef.current = clamped;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(-${clamped}px)`;
    }
  };

  const onTouchEnd = () => {
    if (currentDxRef.current > 50) setShowModal(true);
    if (cardRef.current) {
      cardRef.current.classList.add('snap-back');
      cardRef.current.style.transform = 'translateX(0)';
    }
    startXRef.current = null;
    currentDxRef.current = 0;
  };

  return (
    <>
      <div className="qa-row" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="qa-row-delete-bg">
          <Trash2 size={22} color="#fff" />
        </div>
        <div className="qa-row-card" ref={cardRef}>
          <div className="qa-row-info">
            <span className="qa-row-cat" style={{ background: cat.bg ?? cat.color ?? '#ccc' }}>
              {cat.label}
            </span>
            <span className="qa-row-desc">{lastExpense.description || cat.label}</span>
            <span className="qa-row-time">{time}</span>
          </div>
          <span className="qa-row-amount">
            -{Number(lastExpense.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {currency.symbol}
          </span>
        </div>
      </div>

      {showModal && (
        <div className="qa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="qa-modal" onClick={e => e.stopPropagation()}>
            <p className="qa-modal-title">Eliminar acceso rápido</p>
            <p className="qa-modal-body">
              ¿Estás seguro de que quieres eliminar este acceso rápido? No se eliminarán tus transacciones.
            </p>
            <button
              className="qa-modal-btn-delete"
              onClick={() => { setShowModal(false); onRemove(item.description); }}
            >
              Eliminar
            </button>
            <button className="qa-modal-btn-cancel" onClick={() => setShowModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DescriptionPicker({ uniqueDescriptions, quickAccess, onSelect, onClose }) {
  const [search, setSearch] = useState('');

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
            <div className="qa-picker-list-card">
              {available.map(({ description, expense }, i) => (
                <React.Fragment key={description}>
                  {i > 0 && <div className="qa-picker-divider" />}
                  <TransactionRow
                    record={expense}
                    onPress={() => onSelect(description)}
                  />
                </React.Fragment>
              ))}
            </div>
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
        <EmptyState
          Icon={Zap}
          title="Sin accesos rápidos"
          description="Presiona + para agregar una transacción frecuente como acceso rápido."
        />
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
