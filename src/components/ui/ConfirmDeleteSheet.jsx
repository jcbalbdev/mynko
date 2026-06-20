import React from 'react';
import { Trash2 } from 'lucide-react';
import BaseSheet from './BaseSheet';

/**
 * ConfirmDeleteSheet — reusable delete confirmation overlay.
 * Replaces the repeated confirmDel pattern in ExpenseEditSheet, EditRecurringSheet, etc.
 *
 * Usage:
 *   <ConfirmDeleteSheet
 *     itemLabel="gasto"
 *     onConfirm={handleDelete}
 *     onCancel={() => setConfirmDel(false)}
 *   />
 */
export default function ConfirmDeleteSheet({ itemLabel = 'elemento', onConfirm, onCancel }) {
  return (
    <BaseSheet title={`¿Eliminar ${itemLabel}?`} onClose={onCancel}>
      <div className="edit-confirm-body">
        <p className="edit-confirm-text">
          Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este {itemLabel}?
        </p>
        <button
          className="btn-danger"
          onClick={onConfirm}
          id="btn-confirm-delete"
        >
          <Trash2 size={17} /> Sí, eliminar {itemLabel}
        </button>
        <button
          className="btn-secondary"
          onClick={onCancel}
          id="btn-cancel-delete"
        >
          Cancelar
        </button>
      </div>
    </BaseSheet>
  );
}
