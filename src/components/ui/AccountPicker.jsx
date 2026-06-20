/**
 * AccountPicker.jsx
 * iOS-style account selector.
 * Trigger: styled row with account color dot + name + chevron.
 * Open: bottom sheet with list — colored icon, name, checkmark on selected.
 */
import React, { useEffect } from 'react';
import { Check, Banknote, Building2, PiggyBank } from 'lucide-react';
import './AccountPicker.css';

const TYPE_META = {
  efectivo: { Icon: Banknote  },
  banco:    { Icon: Building2 },
  ahorro:   { Icon: PiggyBank },
};

function AccountIcon({ type, size = 20 }) {
  const { Icon } = TYPE_META[type] ?? { Icon: Banknote };
  return (
    <span
      style={{
        width: 36, height: 36,
        borderRadius: '50%',
        background: '#EEEEEE',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} color="#111214" strokeWidth={2} />
    </span>
  );
}

export default function AccountPicker({ accounts = [], value, onChange, open, onOpen, onClose }) {
  const selected = accounts.find(a => a.id === value) ?? null;

  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else      document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* ── Trigger ── */}
      <button
        type="button"
        id="btn-account-picker"
        className="account-picker-trigger"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <AccountIcon type={selected.type} size={17} />
            <span className="account-picker-name">{selected.name}</span>
          </>
        ) : (
          <span className="account-picker-name" style={{ color: '#8e8e93' }}>Seleccionar cuenta…</span>
        )}
        <span className="account-picker-chevron">›</span>
      </button>

      {/* ── Bottom sheet ── */}
      {open && (
        <div className="acpicker-overlay" onClick={onClose}>
          <div
            className="acpicker-sheet"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Seleccionar cuenta"
          >
            {/* Handle */}
            <div className="acpicker-handle" />
            <p className="acpicker-title">Cuenta</p>

            <div className="acpicker-list">
              {accounts.map((a, i) => {
                const isActive = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`acpicker-row${isActive ? ' acpicker-row--active' : ''}`}
                    onClick={() => { onChange(a.id); onClose(); }}
                    id={`acpicker-item-${a.id}`}
                    style={i < accounts.length - 1 ? { borderBottom: '1px solid var(--separator)' } : {}}
                  >
                    <AccountIcon type={a.type} size={18} />
                    <span className="acpicker-row-name">{a.name}</span>
                    {isActive && <Check size={18} color="#111214" strokeWidth={2.5} className="acpicker-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
