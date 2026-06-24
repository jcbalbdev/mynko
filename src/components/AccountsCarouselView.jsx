import React, { useState, useRef, useEffect } from 'react';
import './AccountsCarouselView.css';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { getCurrencyByCode } from '../utils/currencies';
import { getAccountTypeLabel, computeAccountBalance } from '../utils/accounts';

/* Solid colors per account type */
const T = {
  efectivo: { color: '#2C2C2E', label: 'Efectivo' },
  banco:    { color: '#2C2C2E', label: 'Banco'    },
  ahorro:   { color: '#2C2C2E', label: 'Ahorro'   },
};

const SLOT_X   = 48;   /* peek = 48 - 318×0.1 = 16px uniform */
const FRICTION = 0.85;   /* menos inercia → frena más rápido */
const SPRING   = 0.25;   /* snap más rápido y rígido         */
const ELASTIC  = 0.10;

export default function AccountsCarouselView({ accounts=[], expenses=[], onOpenAddAccount, onCardPress, onInfo, onTransfer, onActiveChange }) {
  const items = [...accounts, { id:'__add__' }];
  const n     = items.length;

  const [offset, setOffset]     = useState(0);
  const [isDragging, setIsDrag] = useState(false);
  const offRef  = useRef(0);
  const velRef  = useRef(0);
  const rafRef  = useRef(null);
  const rootRef = useRef(null);
  const startX  = useRef(0);
  const startY  = useRef(0);
  const lastX   = useRef(0);
  const lastT   = useRef(0);
  const didDrag = useRef(false);
  const isHoriz = useRef(null);

  const minOff = -(n - 1) * SLOT_X;
  const clamp  = v => v > 0 ? v*ELASTIC : v < minOff ? minOff+(v-minOff)*ELASTIC : v;
  const snap   = v => -Math.max(0, Math.min(n-1, Math.round(-v/SLOT_X)))*SLOT_X;
  const cancel = () => rafRef.current && cancelAnimationFrame(rafRef.current);

  const springSnap = () => {
    setIsDrag(false);
    const tgt = snap(offRef.current);
    const go  = () => {
      const d = tgt - offRef.current;
      if (Math.abs(d) < 0.3) {
        offRef.current = tgt;
        setOffset(tgt);
        return;
      }
      offRef.current += d * SPRING; setOffset(offRef.current);
      rafRef.current = requestAnimationFrame(go);
    };
    rafRef.current = requestAnimationFrame(go);
  };

  const momentum = () => {
    const tick = () => {
      let v = velRef.current, o = offRef.current;
      if (Math.abs(v) < 0.4) { velRef.current = 0; springSnap(); return; }
      if (o > 0 || o < minOff) v *= 0.6;
      v *= FRICTION; o = clamp(o + v);
      velRef.current = v; offRef.current = o; setOffset(o);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const mv = e => {
      const t  = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      if (isHoriz.current === null) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5)
          isHoriz.current = Math.abs(dx) > Math.abs(dy);
        return;
      }
      if (!isHoriz.current) return;
      e.preventDefault();
      didDrag.current = true;
      const nowDx = t.clientX - lastX.current;
      const dt    = performance.now() - lastT.current;
      velRef.current = dt > 0 ? (nowDx/dt)*16 : 0;
      offRef.current = clamp(offRef.current + nowDx);
      setOffset(offRef.current);
      lastX.current = t.clientX; lastT.current = performance.now();
    };
    el.addEventListener('touchmove', mv, { passive: false });
    return () => el.removeEventListener('touchmove', mv);
  }, [n, minOff]);

  const onTS = e => {
    cancel(); didDrag.current=false; isHoriz.current=null; velRef.current=0;
    setIsDrag(true);
    startX.current=e.touches[0].clientX; startY.current=e.touches[0].clientY;
    lastX.current=e.touches[0].clientX; lastT.current=performance.now();
  };
  const onTE = () => { isHoriz.current ? momentum() : setIsDrag(false); };
  useEffect(() => () => cancel(), []);

  const activeIdx  = Math.max(0, Math.min(n-1, Math.round(-offset/SLOT_X)));
  const fractional = offset + activeIdx * SLOT_X;
  const tr = isDragging ? 'opacity 0.1s' : 'transform 0.55s cubic-bezier(.25,.46,.45,.94), opacity 0.35s ease';

  // Sync parent whenever activeIdx changes (swipe, array resize, remount)
  useEffect(() => {
    const realIdx = Math.max(0, Math.min(accounts.length - 1, activeIdx));
    onActiveChange?.(realIdx);
  }, [activeIdx, accounts.length]);

  return (
    <div ref={rootRef} className="acw-root" onTouchStart={onTS} onTouchEnd={onTE}>

      {items.map((item, idx) => {
        const dist = Math.abs(idx - activeIdx);
        if (dist >= 4) return null;

        const isActive = idx === activeIdx;
        const cfg      = T[item.type] ?? { color: '#2C2C2E', label: '' };
        const scale    = Math.max(0.4, 1 - dist * 0.2);
        const zIdx     = 10 - dist * 2;
        const opacity  = [1.0, 0.88, 0.70, 0.50][dist];
        const xOff     = (idx - activeIdx) * SLOT_X + fractional;

        const handleClick = () => {
          if (didDrag.current) return;
          if (item.id === '__add__') { onOpenAddAccount?.(); return; }
          if (isActive) onCardPress?.(item);
        };

        const wrapStyle = {
          position: 'absolute',
          top: '50%', left: '50%',
          transform: `translate(calc(-50% + ${xOff}px), -50%) scale(${scale})`,
          zIndex: zIdx,
          opacity,
          transition: tr,
          cursor: isActive ? 'pointer' : 'default',
        };

        /* ── Add card ── */
        if (item.id === '__add__') return (
          <div key="__add__" style={wrapStyle} className="acw-card-wrap" onClick={handleClick}>
            <div className="acw-portrait-add">
              <div className="acw-add-circle"><Plus size={26} strokeWidth={1.8}/></div>
              <span className="acw-add-label">Nueva cuenta</span>
            </div>
          </div>
        );

        const balance  = computeAccountBalance(item, expenses);
        const currency = item.currency || 'PEN';
        const absAmt   = Math.abs(balance).toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 });

        /* Account card — solid color background */
        return (
          <div key={item.id} style={wrapStyle} className="acw-card-wrap" onClick={handleClick}>
            <div className="acw-portrait-card" style={{ background: cfg.color }}>

              {/* TOP ROW — transfer icon left, info icon right */}
              <div className="acw-portrait-top">
                <div
                  className="acw-portrait-icon-wrap"
                  onClick={e => { e.stopPropagation(); onTransfer?.(item); }}
                >
                  <ArrowLeftRight size={16} strokeWidth={2} color="rgba(255,255,255,0.9)"/>
                </div>
                <div
                  className="acw-portrait-icon-wrap"
                  onClick={e => { e.stopPropagation(); onInfo?.(item); }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontStyle: 'italic', fontWeight: 700, lineHeight: 1, userSelect: 'none' }}>i</span>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="acw-portrait-bottom">
                {/* Account name bottom-left */}
                <span className="acw-portrait-name">{item.name}</span>
                {/* VISA bottom-right */}
                <span className="acw-portrait-visa">VISA</span>
              </div>

            </div>
          </div>
        );
      })}

    </div>
  );
}
