import React from 'react';
import './EmptyState.css';

/**
 * EmptyState — reusable empty-list placeholder.
 * Replaces the 9 scattered *-empty divs across the app.
 *
 * Usage:
 *   <EmptyState Icon={Inbox} title="Sin gastos" description="Agrega tu primer gasto" />
 */
export default function EmptyState({ Icon, title, description, className = '' }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {Icon && <Icon size={44} strokeWidth={1.3} className="empty-state-icon" />}
      {title       && <p className="empty-state-title">{title}</p>}
      {description && <p className="empty-state-desc">{description}</p>}
    </div>
  );
}
