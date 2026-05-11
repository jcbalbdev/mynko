import React from 'react';
import { CATEGORIES } from '../utils/categories';

export default function CategoryPicker({ selected, onSelect }) {
  return (
    <div className="cat-grid" role="listbox" aria-label="Seleccionar categoría">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          className={`cat-grid-item${selected === cat.id ? ' selected' : ''}`}
          onClick={() => onSelect(cat.id)}
          role="option"
          aria-selected={selected === cat.id}
          id={`cat-${cat.id}`}
        >
          <div className="cat-emoji" style={{ background: cat.bg }}>
            {cat.emoji}
          </div>
          <span className="cat-name">{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
