/**
 * FormSection.jsx
 * Reusable wrapper for a labeled form section.
 * Replaces the repeated <div className="form-section"> pattern across all Add*Sheet files.
 */
import React from 'react';

/**
 * @param {string}  label    - Section label text
 * @param {string}  [hint]   - Optional small hint (e.g. "(opcional)")
 * @param {React.ReactNode} children
 */
export default function FormSection({ label, hint, children }) {
  return (
    <div className="form-section">
      <div className="form-section-label">
        {label}
        {hint && <span className="form-section-hint"> {hint}</span>}
      </div>
      {children}
    </div>
  );
}
