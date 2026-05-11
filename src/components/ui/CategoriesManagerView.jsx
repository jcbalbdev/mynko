/**
 * CategoriesManagerView.jsx
 * Shows all general categories with their custom subcategories.
 * Allows creating and deleting subcategories.
 */
import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../../utils/categories';
import './CategoriesManagerView.css';

export default function CategoriesManagerView({
  userCategories = [],
  onCreateSubcategory,
  onDeleteSubcategory,
}) {
  const [expanded,    setExpanded]    = useState({});
  const [showCreate,  setShowCreate]  = useState(false);
  const [createFor,   setCreateFor]   = useState(''); // parentId
  const [newName,     setNewName]     = useState('');
  const [delConfirm,  setDelConfirm]  = useState(null); // id to confirm delete
  const [loading,     setLoading]     = useState(false);

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const subcatsFor = (parentId) =>
    userCategories.filter(c => c.parent_id === parentId);

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

  return (
    <div className="catmgr-body">

      {/* Create inline sheet */}
      {showCreate && (() => {
        const parent = CATEGORIES.find(c => c.id === createFor);
        return (
          <div className="catmgr-create-box">
            <p className="catmgr-create-title">
              Nueva subcategoría de <strong>{parent?.label}</strong>
            </p>
            <input
              className="login-input"
              type="text"
              placeholder="Ej: Restaurantes, Netflix..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <div className="catmgr-create-actions">
              <button
                className="catmgr-btn-cancel"
                onClick={() => setShowCreate(false)}
              >Cancelar</button>
              <button
                className="catmgr-btn-save"
                style={{ background: parent?.color }}
                disabled={!newName.trim() || loading}
                onClick={handleCreate}
              >
                {loading ? '…' : 'Crear'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Categories list */}
      {CATEGORIES.map(cat => {
        const subs     = subcatsFor(cat.id);
        const isOpen   = expanded[cat.id] ?? true;

        return (
          <div key={cat.id} className="catmgr-group">
            {/* Category header */}
            <div className="catmgr-header" onClick={() => toggle(cat.id)}>
              <div className="catmgr-header-left">
                <span
                  className="catmgr-color-dot"
                  style={{ background: cat.color }}
                />
                <span className="catmgr-cat-label">{cat.label}</span>
                {subs.length > 0 && (
                  <span className="catmgr-count">{subs.length}</span>
                )}
              </div>
              <div className="catmgr-header-right">
                <button
                  className="catmgr-add-btn"
                  onClick={e => { e.stopPropagation(); startCreate(cat.id); }}
                  title={`Añadir subcategoría de ${cat.label}`}
                  id={`add-subcat-${cat.id}`}
                >
                  <Plus size={14} />
                </button>
                {isOpen
                  ? <ChevronDown size={16} strokeWidth={2} />
                  : <ChevronRight size={16} strokeWidth={2} />
                }
              </div>
            </div>

            {/* Subcategories */}
            {isOpen && (
              <div className="catmgr-subs">
                {subs.length === 0 && (
                  <p className="catmgr-empty">Sin subcategorías</p>
                )}
                {subs.map(sub => (
                  <div key={sub.id} className="catmgr-sub-row">
                    <span
                      className="cat-chip"
                      style={{ background: sub.color, color: '#fff', borderColor: 'transparent' }}
                    >
                      {sub.name}
                    </span>

                    {delConfirm === sub.id ? (
                      <div className="catmgr-del-confirm">
                        <span>¿Eliminar?</span>
                        <button
                          className="catmgr-btn-del-yes"
                          onClick={() => handleDelete(sub.id)}
                          disabled={loading}
                        >Sí</button>
                        <button
                          className="catmgr-btn-del-no"
                          onClick={() => setDelConfirm(null)}
                        >No</button>
                      </div>
                    ) : (
                      <button
                        className="catmgr-del-btn"
                        onClick={() => setDelConfirm(sub.id)}
                        aria-label={`Eliminar ${sub.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
