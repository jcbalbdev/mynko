/**
 * BaseSheet.jsx
 * Reusable bottom-sheet wrapper.
 * Handles: overlay backdrop, sheet container, drag handle,
 * and a configurable header (title + close + optional right slot).
 */
import React from 'react';
import { X, Check, ChevronLeft } from 'lucide-react';
import './BaseSheet.css';

/**
 * @param {string}    title        — Sheet title text
 * @param {function}  onClose      — Called when X or backdrop is tapped
 * @param {function}  [onBack]     — If provided, renders a ← back button on the left and X on the right
 * @param {function}  [onSave]     — If provided, renders a ✓ save button on the right
 * @param {ReactNode} [headerRight]— Custom element to render on the right of the header
 *                                    (takes priority over onSave)
 * @param {ReactNode} children     — Sheet body content
 */
export default function BaseSheet({ title, onClose, onBack, onSave, headerRight, children }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Determine the right-side header element
  const rightSlot = headerRight
    ? headerRight
    : onSave
      ? <button className="sheet-save-btn" onClick={onSave} aria-label="Guardar"><Check size={18} /></button>
      : null;

  return (
    <div
      className="sheet-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sheet">
        <div className="sheet-handle" />

        <div className="sheet-header">
          {onBack ? (
            // Layout: [← back] [title] [X close]
            <>
              <button className="sheet-close" onClick={onBack} aria-label="Volver">
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <span className="sheet-title">{title}</span>
              <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
                <X size={16} />
              </button>
            </>
          ) : rightSlot ? (
            // Layout: [close] [title] [right]
            <>
              <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
                <X size={16} />
              </button>
              <span className="sheet-title">{title}</span>
              {rightSlot}
            </>
          ) : (
            // Layout: [title] [close]
            <>
              <span className="sheet-title">{title}</span>
              <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
                <X size={16} />
              </button>
            </>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
