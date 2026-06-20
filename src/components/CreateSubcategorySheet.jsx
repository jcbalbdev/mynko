/**
 * CreateSubcategorySheet.jsx
 * Sheet to create a custom subcategory linked to a general category.
 * The subcategory inherits the parent's color automatically.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import BaseSheet   from './ui/BaseSheet';
import { CATEGORIES } from '../utils/categories';
import { useUserCategoriesCtx, useActiveCategoriesCtx } from '../context/UserCategoriesContext';
import './ui/CategoryPicker.css';

export default function CreateSubcategorySheet({ onClose, onCreated, onSelectExisting }) {
  const userCategories        = useUserCategoriesCtx();
  const activeCategories      = useActiveCategoriesCtx();
  const visibleCategories = useMemo(() => {
    const userSubIds = new Set(userCategories.map(c => c.parent_id).filter(Boolean));
    const active = activeCategories
      ? CATEGORIES.filter(c => activeCategories.includes(c.id))
      : CATEGORIES.filter(c => userSubIds.has(c.id));
    const customParents = userCategories.filter(c => !c.parent_id);
    return [
      ...active,
      ...customParents.map(c => ({ id: c.id, label: c.name, color: c.color, bg: c.color })),
    ];
  }, [activeCategories, userCategories]);

  const [name,                  setName]                  = useState('');
  const [parentId,              setParentId]              = useState('');
  const [loading,               setLoading]               = useState(false);
  const [error,                 setError]                 = useState('');
  const [showSuggestions,       setShowSuggestions]       = useState(false);
  const [duplicateInfo,         setDuplicateInfo]         = useState(null); // { parentLabel }
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  const containerRef = useRef(null);

  const canSave = name.trim().length > 0 && parentId;

  /* ── Autocomplete suggestions ── */
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return [...new Set(
      userCategories
        .filter(c => c.name.toLowerCase().includes(q) && c.name.toLowerCase() !== q)
        .map(c => c.name)
    )].slice(0, 5);
  }, [name, userCategories]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Duplicate check ── */
  const checkDuplicate = (val) => {
    const trimmed = val.trim().toLowerCase();
    const existing = userCategories.find(c => c.name.toLowerCase() === trimmed);
    if (existing) {
      const parent = CATEGORIES.find(c => c.id === existing.parent_id);
      setDuplicateInfo({
        id:          existing.id,
        color:       existing.color ?? parent?.color ?? '#8e8e93',
        parentId:    existing.parent_id,
        parentLabel: parent?.label ?? 'una categoría',
      });
      return true;
    }
    return false;
  };

  const handleNameChange = (val) => {
    setName(val);
    setDuplicateInfo(null);
    setDuplicateAcknowledged(false);
  };

  const pickSuggestion = (s) => {
    setName(s);
    setShowSuggestions(false);
    checkDuplicate(s);
  };

  /* Sí: acknowledged, clear parent so user picks a different one */
  const handleDuplicateYes = () => {
    setDuplicateInfo(null);
    setDuplicateAcknowledged(true);
    setParentId('');
  };

  /* No: select the existing subcategory and close */
  const handleDuplicateNo = () => {
    if (onSelectExisting && duplicateInfo) {
      onSelectExisting(duplicateInfo.id, duplicateInfo.color, duplicateInfo.parentId);
    }
    onClose();
  };

  /* ── Submit ── */
  const handleCreate = async () => {
    if (!canSave) return;
    if (!duplicateAcknowledged && checkDuplicate(name)) return;
    setLoading(true);
    setError('');
    const { error: err } = await onCreated(name.trim(), parentId);
    if (err) {
      setError('No se pudo guardar. Inténtalo de nuevo.');
    } else {
      onClose();
    }
    setLoading(false);
  };

  return (
    <BaseSheet title="Nueva subcategoría" onClose={onClose}>
      <div className="create-subcat-body">

        {/* Name input with autocomplete */}
        <div className="form-section">
          <label className="form-section-label">Nombre</label>
          <div className="subcat-name-wrap" ref={containerRef}>
            <input
              className="login-input"
              type="text"
              placeholder="Ej: Restaurantes, Netflix, Gasolina..."
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              maxLength={30}
              autoFocus
              autoComplete="off"
            />
            {showSuggestions && (
              <ul className="location-suggestions">
                {suggestions.map(s => (
                  <li
                    key={s}
                    className="location-suggestion-item"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicateInfo && (
          <div className="subcat-duplicate-alert">
            <p className="subcat-duplicate-msg">
              Esta subcategoría ya está asociada a <strong>{duplicateInfo.parentLabel}</strong>. ¿Deseas cambiar la categoría?
            </p>
            <div className="subcat-duplicate-actions">
              <button type="button" className="subcat-dup-btn subcat-dup-btn--yes" onClick={handleDuplicateYes}>Sí</button>
              <button type="button" className="subcat-dup-btn subcat-dup-btn--no"  onClick={handleDuplicateNo}>No</button>
            </div>
          </div>
        )}

        {/* Parent category selector */}
        <div className="form-section">
          <label className="form-section-label">¿A qué categoría pertenece?</label>
          <div className="catpicker-pills-row">
            {visibleCategories.map(cat => {
              const isSelected = parentId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`catpicker-pill${isSelected ? ' catpicker-pill--active' : ''}`}
                  style={{ background: cat.color }}
                  onClick={() => setParentId(isSelected ? '' : cat.id)}
                >
                  {isSelected && (
                    <Check size={11} color="#fff" strokeWidth={3} style={{ flexShrink: 0 }} />
                  )}
                  <span className="catpicker-pill-name">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          className="btn-primary"
          disabled={!canSave || loading || !!duplicateInfo}
          onClick={handleCreate}
          id="btn-create-subcat"
        >
          {loading ? 'Guardando…' : 'Crear subcategoría'}
        </button>

      </div>
    </BaseSheet>
  );
}
