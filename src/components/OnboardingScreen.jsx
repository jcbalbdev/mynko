import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { CATEGORIES, EXPENSE_COLORS } from '../utils/categories';
import BaseSheet from './ui/BaseSheet';
import './OnboardingScreen.css';

/* ── Currency picker ── */
const CURRENCIES = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'Dólar EE.UU.' },
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'GBP', name: 'Libra Esterlina' },
  { code: 'COP', name: 'Peso Colombiano' },
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'BRL', name: 'Real Brasileño' },
  { code: 'CLP', name: 'Peso Chileno' },
  { code: 'PEN', name: 'Sol Peruano' },
  { code: 'CRC', name: 'Colón Costarricense' },
  { code: 'DOP', name: 'Peso Dominicano' },
  { code: 'CAD', name: 'Dólar Canadiense' },
  { code: 'CHF', name: 'Franco Suizo' },
  { code: 'JPY', name: 'Yen Japonés' },
  { code: 'CNY', name: 'Yuan Chino' },
];

function CurrencyPicker({ current, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(c =>
      c.name.toLowerCase().split(' ').some(word => word.startsWith(q))
    );
  })();

  return (
    <div className="onb-currency-overlay" onClick={onClose}>
      <div className="onb-currency-sheet" onClick={e => e.stopPropagation()}>
        <div className="onb-currency-sheet-header">
          <span className="onb-currency-sheet-title">Moneda</span>
          <button className="onb-currency-close" onClick={onClose}>✕</button>
        </div>
        <input
          className="onb-currency-search"
          type="text"
          placeholder="Buscar moneda…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="onb-currency-list">
          {filtered.map(c => (
            <button
              key={c.code}
              className={`onb-currency-item${c.code === current ? ' active' : ''}`}
              onClick={() => { onSelect(c.code); onClose(); }}
            >
              <span className="onb-currency-item-code">{c.code}</span>
              <span className="onb-currency-item-name">{c.name}</span>
              {c.code === current && <span className="onb-currency-item-check">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Account card ── */
function AccountCard({ type, name, onNameChange, balance, onBalanceChange, currency, onCurrencyChange, onRemove }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <div className="onb-account-card">
        <div className="onb-account-top">
          <input
            className="onb-name-field"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder={type === 'efectivo' ? 'Mi Efectivo' : 'Mi Banco'}
          />
          {onRemove && (
            <button className="onb-remove-btn" onClick={onRemove} aria-label="Eliminar">×</button>
          )}
        </div>
        <div className="onb-balance-row">
          <button className="onb-currency-btn" onClick={() => setShowPicker(true)}>
            {currency}
            <span className="onb-currency-chevron">▾</span>
          </button>
          <input
            className="onb-balance-field"
            type="number"
            inputMode="decimal"
            value={balance}
            onChange={e => onBalanceChange(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      {showPicker && (
        <CurrencyPicker
          current={currency}
          onSelect={onCurrencyChange}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

/* ── Step 2: Category selection ── */
const DEFAULT_ACTIVE_IDS = CATEGORIES.map(c => c.id);
const WARM_COLORS = EXPENSE_COLORS.map(c => c.hex);

function CategoryStep({ onComplete, loading }) {
  const selected = new Set(DEFAULT_ACTIVE_IDS);
  const [customParents,   setCustomParents]   = useState([]);
  const [systemOverrides, setSystemOverrides] = useState({});
  const [showForm,        setShowForm]        = useState(false);
  const [customName,      setCustomName]      = useState('');
  const [customColor,     setCustomColor]     = useState(WARM_COLORS[0]);
  const [editingCat,      setEditingCat]      = useState(null);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const addCustom = () => {
    if (!customName.trim()) return;
    setCustomParents(prev => [...prev, { name: capitalize(customName.trim()), color: customColor }]);
    setCustomName('');
    setCustomColor(WARM_COLORS[0]);
    setShowForm(false);
  };

  const openEdit = (e, cat) => {
    e.stopPropagation();
    setEditingCat(cat);
  };

  const handleEditColor = (color) => {
    if (editingCat.isCustom) {
      setCustomParents(prev => prev.map((cp, i) => i === editingCat.idx ? { ...cp, color } : cp));
    } else {
      setSystemOverrides(prev => ({ ...prev, [editingCat.id]: color }));
    }
    setEditingCat(prev => ({ ...prev, color }));
  };

  const handleEditDelete = () => {
    setCustomParents(prev => prev.filter((_, i) => i !== editingCat.idx));
    setEditingCat(null);
  };

  return (
    <div className="onboarding-screen">
      <div className="onb-content">
        <div className="onb-header">
          <h1 className="onb-title">¿Qué categorías usas?</h1>
          <p className="onb-subtitle">Empieza con las esenciales. Añade más si necesitas.</p>
        </div>

        <div className="onb-cat-section">
          <div className="onb-cat-grid">
            {CATEGORIES.map(cat => {
              const chipColor = systemOverrides[cat.id] ?? cat.bg;
              return (
                <div
                  key={cat.id}
                  className="onb-cat-chip on"
                  style={{ background: chipColor, borderColor: chipColor }}
                >
                  <span className="onb-cat-chip-label" style={{ color: '#fff' }}>{cat.label}</span>
                  <button
                    className="onb-cat-chip-edit"
                    onClick={e => openEdit(e, { id: cat.id, name: cat.label, color: chipColor, isCustom: false })}
                  >
                    <Pencil size={10} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
            {customParents.map((cp, i) => (
              <div
                key={i}
                className="onb-cat-chip on"
                style={{ background: cp.color, borderColor: cp.color }}
              >
                <span className="onb-cat-chip-label" style={{ color: '#fff' }}>{cp.name}</span>
                <button
                  className="onb-cat-chip-edit"
                  onClick={e => openEdit(e, { id: `custom-${i}`, name: cp.name, color: cp.color, isCustom: true, idx: i })}
                >
                  <Pencil size={10} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>

          <button className="onb-cat-chip onb-cat-chip-add" onClick={() => setShowForm(true)}>
            <span className="onb-cat-chip-label" style={{ color: 'var(--label-tertiary)' }}>+ Nueva</span>
          </button>
        </div>
      </div>

      <div className="onb-footer">
        <button
          className="onb-submit-btn"
          onClick={() => onComplete({ selectedDefaults: [...selected], customParents, systemOverrides })}
          disabled={loading}
        >
          {loading ? 'Guardando…' : 'Listo'}
        </button>
      </div>

      {showForm && (
        <BaseSheet title="Nueva categoría" onClose={() => { setShowForm(false); setCustomName(''); setCustomColor(WARM_COLORS[0]); }}>
          <div className="onb-sheet-body">
            <input
              className="onb-custom-name-input"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Nombre de la categoría"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
            />
            <div className="onb-color-grid">
              {WARM_COLORS.map(c => (
                <button
                  key={c}
                  className={`onb-color-dot${c === customColor ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setCustomColor(c)}
                />
              ))}
            </div>
            <button
              className="onb-sheet-create-btn"
              onClick={addCustom}
              disabled={!customName.trim()}
            >
              Crear
            </button>
          </div>
        </BaseSheet>
      )}

      {editingCat && (
        <BaseSheet title={editingCat.name} onClose={() => setEditingCat(null)}>
          <div className="onb-sheet-body">
            <p className="onb-sheet-section-label">Color</p>
            <div className="onb-color-grid">
              {WARM_COLORS.map(c => (
                <button
                  key={c}
                  className={`onb-color-dot${c === editingCat.color ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => handleEditColor(c)}
                />
              ))}
            </div>
            {editingCat.isCustom && (
              <button className="onb-sheet-delete-btn" onClick={handleEditDelete}>
                <Trash2 size={15} strokeWidth={2} />
                Eliminar categoría
              </button>
            )}
          </div>
        </BaseSheet>
      )}
    </div>
  );
}

/* ── Main onboarding (step 1: accounts) ── */
export default function OnboardingScreen({ onComplete, defaultCurrency = 'MXN' }) {
  const [step,             setStep]             = useState(1);
  const [accountsSnapshot, setAccountsSnapshot] = useState(null);
  const [loading,          setLoading]          = useState(false);

  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Mi Efectivo', type: 'efectivo', balance: '', currency: defaultCurrency },
    { id: 2, name: 'Mi Banco',    type: 'banco',    balance: '', currency: defaultCurrency },
  ]);

  const addAccount = () =>
    setAccounts(prev => [...prev, { id: Date.now(), name: '', type: 'banco', balance: '', currency: defaultCurrency }]);

  const updateAccount = (id, field, value) =>
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  const removeAccount = (id) =>
    setAccounts(prev => prev.filter(a => a.id !== id));

  const buildAccounts = () =>
    accounts.map(a => ({
      name:     a.name.trim() || (a.type === 'efectivo' ? 'Mi Efectivo' : 'Mi Banco'),
      type:     a.type,
      balance:  a.balance,
      currency: a.currency,
    }));

  const goToCategories = () => {
    setAccountsSnapshot(buildAccounts());
    setStep(2);
  };

  const handleCategoriesComplete = async (categoriesData) => {
    if (loading) return;
    setLoading(true);
    await onComplete(accountsSnapshot, categoriesData);
    setLoading(false);
  };

  if (step === 2) {
    return <CategoryStep onComplete={handleCategoriesComplete} loading={loading} />;
  }

  return (
    <div className="onboarding-screen">
      <div className="onb-content">
        <div className="onb-header">
          <div className="onb-logo">
            <img src="/mynko-icon.png" alt="Mynko" />
          </div>
          <h1 className="onb-title">¡Bienvenido a Mynko!</h1>
          <p className="onb-subtitle">¿Cuánto tienes en cada cuenta ahora mismo?</p>
        </div>

        <div className="onb-cards">
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              type={acc.type}
              name={acc.name}
              onNameChange={v => updateAccount(acc.id, 'name', v)}
              balance={acc.balance}
              onBalanceChange={v => updateAccount(acc.id, 'balance', v)}
              currency={acc.currency}
              onCurrencyChange={v => updateAccount(acc.id, 'currency', v)}
              onRemove={accounts.length > 1 ? () => removeAccount(acc.id) : undefined}
            />
          ))}
          <button className="onb-add-card" onClick={addAccount}>
            <span className="onb-add-icon">+</span>
            <span className="onb-add-label">Agregar otra cuenta bancaria</span>
          </button>
        </div>
      </div>

      <div className="onb-footer">
        <button className="onb-submit-btn" onClick={goToCategories}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
