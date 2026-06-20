import React, { useState, useRef, useLayoutEffect } from 'react';
import BaseSheet from './ui/BaseSheet';
import './PeriodSheet.css';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const YEARS  = Array.from({ length: 16 }, (_, i) => 2020 + i);
const ITEM_H = 44;

function daysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function DrumPicker({ items, selectedIndex, onChange, visible = 5 }) {
  const ref  = useRef(null);
  const padH = Math.floor(visible / 2) * ITEM_H;

  useLayoutEffect(() => {
    if (!ref.current) return;
    const target = selectedIndex * ITEM_H;
    if (Math.abs(ref.current.scrollTop - target) < 2) return;
    ref.current.scrollTop = target;
  }, [selectedIndex]);

  const handleScroll = () => {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    onChange(Math.max(0, Math.min(idx, items.length - 1)));
  };

  return (
    <div className="drum-wrap" style={{ height: visible * ITEM_H }}>
      <div className="drum-scroll" ref={ref} onScroll={handleScroll}>
        <div className="drum-pad" style={{ height: padH }} />
        {items.map((item, i) => (
          <div key={i} className="drum-item">{item}</div>
        ))}
        <div className="drum-pad" style={{ height: padH }} />
      </div>
      <div className="drum-highlight" />
    </div>
  );
}

export default function PeriodSheet({ periodMode, onSave, onClose }) {
  const isCustom = periodMode?.type === 'custom';
  const isYear   = periodMode?.type === 'year';
  const [tab, setTab] = useState(isYear ? 'year' : isCustom ? 'custom' : 'month');

  // ── Month tab ──
  const [month, setMonth] = useState(periodMode?.month ?? new Date().getMonth());
  const [year,  setYear]  = useState(periodMode?.year  ?? new Date().getFullYear());
  const yearIdx = Math.max(0, YEARS.indexOf(year));

  // ── Year tab ──
  const [yearOnly, setYearOnly] = useState(periodMode?.year ?? new Date().getFullYear());
  const yearOnlyIdx = Math.max(0, YEARS.indexOf(yearOnly));

  // ── Custom tab ──
  const now      = new Date();
  const fromInit = isCustom && periodMode.from ? new Date(periodMode.from) : now;
  const toInit   = isCustom && periodMode.to   ? new Date(periodMode.to)   : now;

  const [fromDay,   setFromDay]   = useState(fromInit.getDate() - 1);
  const [fromMonth, setFromMonth] = useState(fromInit.getMonth());
  const [fromYear,  setFromYear]  = useState(Math.max(0, YEARS.indexOf(fromInit.getFullYear())));
  const [toDay,     setToDay]     = useState(toInit.getDate() - 1);
  const [toMonth,   setToMonth]   = useState(toInit.getMonth());
  const [toYear,    setToYear]    = useState(Math.max(0, YEARS.indexOf(toInit.getFullYear())));

  const fromDayCount = daysInMonth(fromMonth, YEARS[fromYear] ?? now.getFullYear());
  const toDayCount   = daysInMonth(toMonth,   YEARS[toYear]   ?? now.getFullYear());
  const fromDays = Array.from({ length: fromDayCount }, (_, i) => i + 1);
  const toDays   = Array.from({ length: toDayCount },   (_, i) => i + 1);

  const handleSave = () => {
    if (tab === 'month') {
      onSave({ type: 'month', month, year });
    } else if (tab === 'year') {
      onSave({ type: 'year', year: yearOnly });
    } else {
      const fy = YEARS[fromYear] ?? now.getFullYear();
      const ty = YEARS[toYear]   ?? now.getFullYear();
      onSave({
        type: 'custom',
        from: new Date(fy, fromMonth, Math.min(fromDay + 1, fromDayCount), 0,  0,  0),
        to:   new Date(ty, toMonth,   Math.min(toDay   + 1, toDayCount),  23, 59, 59),
      });
    }
  };

  return (
    <BaseSheet title="Período" onClose={onClose}>
      <div className="period-sheet">

        <div className="period-tabs">
          <button type="button" className={`period-tab${tab === 'month'  ? ' active' : ''}`} onClick={() => setTab('month')}>Mes</button>
          <button type="button" className={`period-tab${tab === 'year'   ? ' active' : ''}`} onClick={() => setTab('year')}>Año</button>
          <button type="button" className={`period-tab${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>Personalizado</button>
        </div>

        {tab === 'month' && (
          <div className="drum-row">
            <DrumPicker items={MONTHS} selectedIndex={month}   onChange={setMonth} />
            <DrumPicker items={YEARS}  selectedIndex={yearIdx} onChange={i => setYear(YEARS[i])} />
          </div>
        )}

        {tab === 'year' && (
          <div className="drum-row" style={{ justifyContent: 'center' }}>
            <DrumPicker items={YEARS} selectedIndex={yearOnlyIdx} onChange={i => setYearOnly(YEARS[i])} />
          </div>
        )}

        {tab === 'custom' && (
          <div className="period-custom-drum">
            <p className="period-drum-label">Desde</p>
            <div className="drum-row">
              <DrumPicker items={fromDays} selectedIndex={Math.min(fromDay, fromDays.length - 1)} onChange={setFromDay}   visible={3} />
              <DrumPicker items={MONTHS}   selectedIndex={fromMonth} onChange={setFromMonth} visible={3} />
              <DrumPicker items={YEARS}    selectedIndex={fromYear}  onChange={setFromYear}  visible={3} />
            </div>
            <p className="period-drum-label">Hasta</p>
            <div className="drum-row">
              <DrumPicker items={toDays}  selectedIndex={Math.min(toDay, toDays.length - 1)} onChange={setToDay}   visible={3} />
              <DrumPicker items={MONTHS}  selectedIndex={toMonth} onChange={setToMonth} visible={3} />
              <DrumPicker items={YEARS}   selectedIndex={toYear}  onChange={setToYear}  visible={3} />
            </div>
          </div>
        )}

        <button type="button" className="btn-primary period-save-btn" onClick={handleSave}>
          Guardar cambios
        </button>

      </div>
    </BaseSheet>
  );
}
