/**
 * CurrencyPicker.jsx
 * Collapsed chip → modal with search + list.
 * Uses real flag images from flagcdn.com (works on Windows).
 */
import React, { useState, useRef, useEffect } from 'react';
import { CURRENCIES, getCurrencyByCode } from '../../utils/currencies';
import './CurrencyPicker.css';

/** Flag image using flagcdn.com — works on all platforms */
function FlagImg({ countryCode, size = 24, className = '' }) {
  return (
    <img
      src={`https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${countryCode}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${Math.round(size * 2 * 0.75)}/${countryCode}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={countryCode.toUpperCase()}
      className={`currency-flag-img ${className}`}
      loading="lazy"
    />
  );
}

export default function CurrencyPicker({ selected, onSelect }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const cur = getCurrencyByCode(selected);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
    else       setSearch('');
  }, [open]);

  const filtered = search.trim()
    ? CURRENCIES.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase())
      )
    : CURRENCIES;

  const handleSelect = (code) => {
    onSelect(code);
    setOpen(false);
  };

  return (
    <>
      {/* ── Collapsed trigger ── */}
      <button
        type="button"
        className="currency-trigger"
        onClick={() => setOpen(true)}
        id="btn-currency-picker"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FlagImg countryCode={cur.countryCode} size={28} />
        <div className="currency-trigger-text">
          <span className="currency-trigger-code">{cur.code}</span>
          <span className="currency-trigger-name">{cur.name}</span>
        </div>
        <span className="currency-trigger-chevron">▼</span>
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div className="currency-modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="currency-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Seleccionar moneda"
          >
            <div className="currency-modal-header">
              <span className="currency-modal-title">Seleccionar moneda</span>
              <button
                className="currency-modal-close"
                onClick={() => setOpen(false)}
                type="button"
                aria-label="Cerrar"
              >✕</button>
            </div>

            <input
              ref={inputRef}
              className="currency-search"
              type="text"
              placeholder="Buscar moneda o país…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="currency-search-input"
            />

            <div className="currency-modal-list">
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  className={`currency-modal-item${c.code === selected ? ' active' : ''}`}
                  onClick={() => handleSelect(c.code)}
                  id={`currency-item-${c.code}`}
                >
                  <FlagImg countryCode={c.countryCode} size={24} />
                  <div className="currency-chip-text">
                    <span className="currency-code">{c.code}</span>
                    <span className="currency-country">{c.country}</span>
                  </div>
                  <span className="currency-symbol">{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
