import React from 'react';
import { Home, Clock, Plus, Zap } from 'lucide-react';

export default function TabBar({ active, onTabChange, onAdd }) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Navegación principal">

      {/* Inicio pill */}
      <button
        className={`tab-item${active === 'home' ? ' active' : ''}`}
        onClick={() => onTabChange('home')}
        role="tab"
        aria-selected={active === 'home'}
        id="tab-btn-home"
      >
        <div className="tab-icon">
          <Home size={18} strokeWidth={active === 'home' ? 2.5 : 2} />
        </div>
        <span className="tab-label">Inicio</span>
      </button>

      {/* Add center pill */}
      <button
        className="tab-add-btn"
        onClick={onAdd}
        aria-label="Agregar gasto"
        id="tab-btn-add"
      >
        <Plus size={24} strokeWidth={2.8} />
      </button>

      {/* Historial pill */}
      <button
        className={`tab-item${active === 'history' ? ' active' : ''}`}
        onClick={() => onTabChange('history')}
        role="tab"
        aria-selected={active === 'history'}
        id="tab-btn-history"
      >
        <div className="tab-icon">
          <Clock size={18} strokeWidth={active === 'history' ? 2.5 : 2} />
        </div>
        <span className="tab-label">Historial</span>
      </button>

      {/* Acceso Rápido pill */}
      <button
        className={`tab-item${active === 'quickaccess' ? ' active' : ''}`}
        onClick={() => onTabChange('quickaccess')}
        role="tab"
        aria-selected={active === 'quickaccess'}
        id="tab-btn-quickaccess"
      >
        <div className="tab-icon">
          <Zap size={18} strokeWidth={active === 'quickaccess' ? 2.5 : 2} />
        </div>
        <span className="tab-label">Rápido</span>
      </button>

    </nav>
  );
}
