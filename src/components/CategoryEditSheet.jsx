/**
 * CategoryEditSheet.jsx
 * Sheet for changing the color of an entire expense category bar.
 * Extracted from HomeScreen.jsx.
 */
import React, { useState } from 'react';
import BaseSheet from './ui/BaseSheet';
import ColorPicker from './ui/ColorPicker';
import { getCategoryById, EXPENSE_COLORS } from '../utils/categories';
import { formatAmount } from '../utils/expenses';

/**
 * @param {object}   catGroup              — Aggregated category data { category, amount, color }
 * @param {function} onClose               — Dismiss the sheet
 * @param {function} onCategoryColorChange — Called with (categoryId, newColor)
 */
export default function CategoryEditSheet({ catGroup, onClose, onCategoryColorChange }) {
  const cat = getCategoryById(catGroup.category);
  const [color, setColor] = useState(catGroup.color || EXPENSE_COLORS[0].hex);

  const handleSave = () => {
    onCategoryColorChange(catGroup.category, color);
    onClose();
  };

  return (
    <BaseSheet title={cat.label} onClose={onClose} onSave={handleSave}>

      {/* Preview */}
      <div className="edit-cat-display">
        <div className="edit-cat-emoji-wrap" style={{ background: color }}>
          {cat.emoji}
        </div>
        <div className="edit-cat-desc">{cat.label}</div>
        <div className="edit-cat-amount">${formatAmount(catGroup.amount)}</div>
      </div>

      {/* Color picker */}
      <div className="form-section">
        <div className="form-section-label">Cambiar color de la barra</div>
        <ColorPicker selected={color} onChange={setColor} />
        <div className="color-preview-strip" style={{ background: color }} />
      </div>

    </BaseSheet>
  );
}
