import React, { useState } from 'react';
import { Trash2, Plus, ChevronLeft, Palette } from 'lucide-react';
import { CATEGORIES, EXPENSE_COLORS } from '../../utils/categories';
import BaseSheet from './BaseSheet';
import './CategoriesManagerView.css';

const WARM_COLORS = EXPENSE_COLORS.map(c => c.hex);

export default function CategoriesManagerView({
  userCategories = [],
  onCreateSubcategory,
  onDeleteSubcategory,
  onCreateParentCategory,
  onUpdateCategoryColor,
  onUpdateSystemCategoryColor,
  onTitleChange,
}) {
  const [selectedCat,    setSelectedCat]    = useState(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [createFor,      setCreateFor]      = useState('');
  const [newName,        setNewName]        = useState('');
  const [delConfirm,     setDelConfirm]     = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [showParentForm, setShowParentForm] = useState(false);
  const [parentName,     setParentName]     = useState('');
  const [parentColor,    setParentColor]    = useState(WARM_COLORS[0]);
  const [colorPickFor,   setColorPickFor]   = useState(null);

  const subcatsFor = (parentId) => userCategories.filter(c => c.parent_id === parentId);

  const startCreate = (parentId) => {
    setCreateFor(parentId);
    setNewName('');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !createFor) return;
    setLoading(true);
    await onCreateSubcategory(newName.trim(), createFor);
    setShowCreate(false);
    setNewName('');
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    await onDeleteSubcategory(id);
    setDelConfirm(null);
    setLoading(false);
  };

  const handleCreateParent = async () => {
    if (!parentName.trim()) return;
    setLoading(true);
    await onCreateParentCategory(parentName.trim(), parentColor);
    setParentName('');
    setParentColor(WARM_COLORS[0]);
    setShowParentForm(false);
    setLoading(false);
  };

  const handleColorChange = async (color) => {
    if (!colorPickFor) return;
    setLoading(true);
    if (colorPickFor.isSystem) {
      await onUpdateSystemCategoryColor?.(colorPickFor.id, color);
    } else {
      await onUpdateCategoryColor(colorPickFor.id, color);
    }
    if (selectedCat?.id === colorPickFor.id) {
      setSelectedCat(prev => ({ ...prev, color }));
    }
    setColorPickFor(null);
    setLoading(false);
  };

  const getSystemColor = (catId, defaultColor) => {
    const override = userCategories.find(c => c.parent_id === '__override__' && c.name === catId);
    return override?.color ?? defaultColor;
  };

  const allParents = [
    ...CATEGORIES.map(c => {
      const color = getSystemColor(c.id, c.color);
      return { ...c, color, bg: color, isSystem: true };
    }),
    ...userCategories
      .filter(c => !c.parent_id)
      .map(c => ({ id: c.id, label: c.name, color: c.color, bg: c.color, isSystem: false })),
  ];

  /* ── Sheets que flotan encima de ambas vistas ── */
  const colorPickerSheet = colorPickFor && (() => {
    const cat = allParents.find(c => c.id === colorPickFor.id);
    return (
      <BaseSheet title={`Color: ${cat?.label ?? ''}`} onClose={() => setColorPickFor(null)}>
        <div className="catmgr-color-sheet-body">
          <div className="catmgr-color-grid">
            {WARM_COLORS.map(c => (
              <button
                key={c}
                className={`catmgr-color-dot${c === cat?.color ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => handleColorChange(c)}
              />
            ))}
          </div>
        </div>
      </BaseSheet>
    );
  })();

  const parentFormSheet = showParentForm && (
    <BaseSheet title="Nueva categoría" onClose={() => { setShowParentForm(false); setParentName(''); setParentColor(WARM_COLORS[0]); }}>
      <div className="catmgr-color-sheet-body">
        <input
          className="login-input"
          type="text"
          placeholder="Nombre de la categoría"
          value={parentName}
          onChange={e => setParentName(e.target.value)}
          maxLength={30}
          autoFocus
        />
        <div className="catmgr-color-grid" style={{ marginTop: 4 }}>
          {WARM_COLORS.map(c => (
            <button
              key={c}
              className={`catmgr-color-dot${c === parentColor ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setParentColor(c)}
            />
          ))}
        </div>
        <button
          className="catmgr-btn-create"
          disabled={!parentName.trim() || loading}
          onClick={handleCreateParent}
        >
          {loading ? '…' : 'Crear'}
        </button>
      </div>
    </BaseSheet>
  );

  /* ── Vista de subcategorías ── */
  if (selectedCat) {
    const subs = subcatsFor(selectedCat.id);
    const handleBack = () => {
      setSelectedCat(null);
      setShowCreate(false);
      setDelConfirm(null);
      onTitleChange?.(null);
    };

    return (
      <>
        {colorPickerSheet}
        {parentFormSheet}
        {showCreate && (
          <BaseSheet title={`Nueva subcategoría`} onClose={() => setShowCreate(false)}>
            <div className="catmgr-color-sheet-body">
              <input
                className="login-input"
                type="text"
                placeholder="Ej: Restaurantes, Netflix..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <button
                className="catmgr-btn-create"
                style={{ background: selectedCat.color }}
                disabled={!newName.trim() || loading}
                onClick={handleCreate}
              >
                {loading ? '…' : 'Crear'}
              </button>
            </div>
          </BaseSheet>
        )}

        <div className="catmgr-subview">
          <div className="catmgr-grid">
            {subs.map(sub => (
              <div key={sub.id} className="catmgr-card-wrap">
                <button
                  className="catmgr-card catmgr-subcard"
                  style={{ background: selectedCat.color }}
                  onClick={() => setDelConfirm(delConfirm === sub.id ? null : sub.id)}
                >
                  {delConfirm === sub.id && (
                    <div className="catmgr-subcard-del-overlay">
                      <button className="catmgr-subcard-del-yes" onClick={e => { e.stopPropagation(); handleDelete(sub.id); }} disabled={loading}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </button>
                <span className="catmgr-card-name">{sub.name}</span>
              </div>
            ))}

            <div className="catmgr-card-wrap">
              <button className="catmgr-card catmgr-card-new" onClick={() => startCreate(selectedCat.id)}>
                <Plus size={28} strokeWidth={2} />
              </button>
              <span className="catmgr-card-name" style={{ color: 'var(--label-quaternary)' }}>Nueva</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Vista principal: grid ── */
  return (
    <>
      {colorPickerSheet}
      {parentFormSheet}
      <div className="catmgr-grid">
        {allParents.map(cat => {
          const count = subcatsFor(cat.id).length;
          return (
            <div key={cat.id} className="catmgr-card-wrap">
              <button
                className="catmgr-card"
                style={{ background: cat.color }}
                onClick={() => { setSelectedCat(cat); onTitleChange?.(cat.label); }}
              >
                {count > 0 && <span className="catmgr-card-badge">{count}</span>}
              </button>
              <span className="catmgr-card-name">{cat.label}</span>
            </div>
          );
        })}

        <div className="catmgr-card-wrap">
          <button className="catmgr-card catmgr-card-new" onClick={() => setShowParentForm(true)}>
            <Plus size={28} strokeWidth={2} />
          </button>
          <span className="catmgr-card-name" style={{ color: 'var(--label-quaternary)' }}>Nueva</span>
        </div>
      </div>
    </>
  );
}
