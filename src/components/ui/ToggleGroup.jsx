import React from 'react';

/**
 * ToggleGroup — reusable segmented button group.
 * Replaces the repeated type-toggle / type-btn pattern in 4+ sheets.
 *
 * Usage:
 *   <ToggleGroup
 *     label="Frecuencia"
 *     options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]}
 *     value={frequency}
 *     onChange={setFrequency}
 *   />
 */
export default function ToggleGroup({ options = [], value, onChange, ariaLabel }) {
  return (
    <div className="type-toggle" role="group" aria-label={ariaLabel}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`type-btn${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
