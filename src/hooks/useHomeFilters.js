/**
 * useHomeFilters.js
 * Extracts all per-view filter state from HomeScreen.
 * Manages independent currency filters per view + period/type cycling.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { TYPE_FILTERS } from '../utils/categories';

const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
import { getCurrencyByCode } from '../utils/currencies';

/**
 * @param {object[]} expenses       - All expense records
 * @param {string}   defaultCurrency
 * @param {string}   activeView     - 'gastos'|'deudas'|'ingresos'|'balance'|'cambio'
 */
export function useHomeFilters(expenses, defaultCurrency, activeView) {
  const def = defaultCurrency ?? 'MXN';

  /* ── Period filter (gastos / deudas / ingresos) ── */
  const _now = new Date();
  const [periodMode, setPeriodMode] = useState({ type: 'month', month: _now.getMonth(), year: _now.getFullYear() });
  const [typeIdx,    setTypeIdx]    = useState(0); // default: 'all'

  const period      = periodMode;
  const typeFilter  = TYPE_FILTERS[typeIdx].id;
  const periodLabel = periodMode.type === 'month'
    ? MONTHS_FULL[periodMode.month]
    : 'Personalizado';

  const cycleType = () => setTypeIdx(i => (i + 1) % TYPE_FILTERS.length);

  /* ── Location filter ── */
  const [locationFilter, setLocationFilter] = useState('Todos');

  /* ── Per-view independent currency filters ── */
  const [currencyGastos,   setCurrencyGastos]   = useState(def);
  const [currencyDeudas,   setCurrencyDeudas]   = useState(def);
  const [currencyIngresos, setCurrencyIngresos] = useState(def);
  const [currencyBalance,  setCurrencyBalance]  = useState(def);

  const currencyFilter = activeView === 'ingresos' ? currencyIngresos
                       : activeView === 'deudas'   ? currencyDeudas
                       : activeView === 'balance'  ? currencyBalance
                       : currencyGastos;

  const setCurrencyFilter = activeView === 'ingresos' ? setCurrencyIngresos
                          : activeView === 'deudas'   ? setCurrencyDeudas
                          : activeView === 'balance'  ? setCurrencyBalance
                          : setCurrencyGastos;

  /* ── All currencies present in expenses ── */
  const usedCurrencies = useMemo(() => {
    const codes = [...new Set(expenses.map(e => e.currency ?? 'MXN'))];
    if (!codes.includes(def)) codes.unshift(def);
    return codes.map(getCurrencyByCode);
  }, [expenses, def]);

  /* ── Cycle through used currencies (no 'all' — mixing currencies makes no sense) ── */
  const cycleCurrency = () => {
    const codes = usedCurrencies.map(c => c.code);
    const idx = codes.indexOf(currencyFilter);
    // If current filter isn't in the list, jump to first; otherwise advance
    setCurrencyFilter(codes[(idx + 1) % codes.length]);
  };

  const currencyChipLabel = getCurrencyByCode(currencyFilter)?.code ?? currencyFilter;

  /* ── All locations present in expenses ── */
  const usedLocations = useMemo(() => {
    const locs = new Set(expenses.map(e => e.location?.trim() || 'Sin especificar'));
    return ['Todos', ...Array.from(locs).sort((a, b) => a.localeCompare(b))];
  }, [expenses]);

  /* ── Auto-reset each view's filter if its currency disappears ── */
  useEffect(() => {
    const codes = usedCurrencies.map(c => c.code);
    if (!codes.includes(currencyGastos))   setCurrencyGastos(def);
    if (!codes.includes(currencyDeudas))   setCurrencyDeudas(def);
    if (!codes.includes(currencyIngresos)) setCurrencyIngresos(def);
    if (!codes.includes(currencyBalance))  setCurrencyBalance(def);
  }, [usedCurrencies]);

  /* ── Auto-reset location if it disappears ── */
  useEffect(() => {
    if (locationFilter !== 'Todos' && !usedLocations.includes(locationFilter)) {
      setLocationFilter('Todos');
    }
  }, [usedLocations, locationFilter]);

  return {
    /* Period */
    period, periodMode, setPeriodMode, periodLabel,
    /* Type */
    typeFilter, typeIdx, cycleType,
    /* Currency */
    currencyFilter, setCurrencyFilter, cycleCurrency, currencyChipLabel,
    currencyBalance, setCurrencyBalance,
    /* Location */
    locationFilter, setLocationFilter, usedLocations,
    /* Data */
    usedCurrencies,
  };
}
