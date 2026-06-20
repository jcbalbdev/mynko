import { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, Check, Search, X } from 'lucide-react';
import BaseSheet from './ui/BaseSheet';
import './LocationSheet.css';

export default function LocationSheet({ locations = [], selected, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const locs = locations.filter(loc => loc !== 'Todos');
    const q = query.trim().toLowerCase();
    if (!q) return locs;
    return locs.filter(loc => loc.toLowerCase().startsWith(q));
  }, [query, locations]);

  const handleSelect = (loc) => {
    onSelect(loc);
    onClose();
  };

  return (
    <BaseSheet title="Lugar" onClose={onClose}>
      {/* Search input */}
      <div className="location-sheet-search-wrap">
        <Search size={15} className="location-sheet-search-icon" />
        <input
          ref={inputRef}
          className="location-sheet-search"
          type="text"
          placeholder="Buscar lugar..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query.length > 0 && (
          <button className="location-sheet-clear" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Location list */}
      <div className="location-sheet-list">
        {filtered.length === 0 ? (
          <p className="location-sheet-empty">Sin resultados para "{query}"</p>
        ) : (
          filtered.map(loc => (
            <button
              key={loc}
              className={`location-sheet-item${selected === loc ? ' active' : ''}`}
              onClick={() => handleSelect(loc)}
            >
              <MapPin size={14} className="location-sheet-item-icon" />
              <span className="location-sheet-item-label">{loc}</span>
              {selected === loc && <Check size={15} className="location-sheet-item-check" />}
            </button>
          ))
        )}
      </div>
    </BaseSheet>
  );
}
