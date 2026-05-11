import React, { useState, useRef, useEffect, useMemo } from 'react';
import FormSection from './FormSection';

export default function LocationInput({
  id,
  value,
  onChange,
  suggestions = [],
  label = 'Lugar (opcional)',
  placeholder = 'Tienda, restaurante, etc.',
  maxLength = 60,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return suggestions.filter(s => s.toLowerCase().startsWith(q) && s.toLowerCase() !== q);
  }, [value, suggestions]);

  useEffect(() => {
    setOpen(filtered.length > 0);
  }, [filtered]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const pick = (s) => {
    onChange(s);
    setOpen(false);
  };

  return (
    <FormSection label={label}>
      <div className="location-autocomplete" ref={containerRef}>
        <input
          id={id}
          className="form-input form-input--solo"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={maxLength}
          autoComplete="off"
        />
        {open && (
          <ul className="location-suggestions">
            {filtered.map(s => (
              <li
                key={s}
                className="location-suggestion-item"
                onMouseDown={() => pick(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormSection>
  );
}
