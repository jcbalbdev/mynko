/**
 * CalendarModal.jsx
 * Floating calendar modal — extracted from AddExpenseSheet.
 * Renders a full-screen overlay with a centered card calendar.
 * Future dates are disabled. Selects a day and calls onChange + onClose.
 */
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarModal.css';

const MONTHS_ES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_HEADER = ['D','L','M','X','J','V','S'];

/**
 * @param {Date}     value     — Currently selected date
 * @param {function} onChange  — Called with the new Date when a day is picked
 * @param {function} onClose   — Called to dismiss the modal
 */
export default function CalendarModal({ value, onChange, onClose }) {
  const [vm, setVm] = useState(value.getMonth());
  const [vy, setVy] = useState(value.getFullYear());

  const now       = new Date();
  const capFuture = vy > now.getFullYear() ||
                    (vy === now.getFullYear() && vm >= now.getMonth());

  const prevMonth = () => {
    if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1);
  };
  const nextMonth = () => {
    if (capFuture) return;
    if (vm === 11) { setVm(0); setVy(y => y + 1); } else setVm(m => m + 1);
  };

  const daysInMonth  = new Date(vy, vm + 1, 0).getDate();
  const firstWeekday = new Date(vy, vm, 1).getDay();

  const selY = value.getFullYear(), selM = value.getMonth(), selD = value.getDate();
  const tY   = now.getFullYear(),   tM   = now.getMonth(),   tD   = now.getDate();

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectDay = (day) => {
    if (!day) return;
    const chosen = new Date(vy, vm, day);
    if (chosen > now) return;
    onChange(chosen);
    onClose();
  };

  return (
    <div
      className="cal-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="cal-modal" role="dialog" aria-modal="true" aria-label="Seleccionar fecha">

        {/* Month / year navigation */}
        <div className="cal-modal-nav">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="Mes anterior">
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="cal-month-label">
            {MONTHS_ES[vm]} {vy}
          </span>
          <button
            className="cal-nav-btn"
            onClick={nextMonth}
            disabled={capFuture}
            style={{ opacity: capFuture ? 0.25 : 1 }}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Day grid */}
        <div className="cal-grid">
          {DAYS_HEADER.map(d => (
            <div key={d} className="cal-day-name">{d}</div>
          ))}

          {cells.map((day, i) => {
            const isSel   = day && vm === selM && vy === selY && day === selD;
            const isToday = day && vm === tM   && vy === tY   && day === tD;
            const isFut   = day && new Date(vy, vm, day) > now;

            return (
              <button
                key={i}
                className={[
                  'cal-day',
                  !day    ? 'cal-day--empty'    : '',
                  isSel   ? 'cal-day--selected'  : '',
                  isToday && !isSel ? 'cal-day--today' : '',
                  isFut   ? 'cal-day--disabled'  : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectDay(day)}
                disabled={!day || isFut}
                aria-label={day ? `${day} de ${MONTHS_ES[vm]}` : undefined}
              >
                {day || ''}
              </button>
            );
          })}
        </div>

        <button className="cal-modal-close" onClick={onClose} aria-label="Cerrar calendario">
          Cancelar
        </button>
      </div>
    </div>
  );
}
