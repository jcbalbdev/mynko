/**
 * useQuickAdd.js
 * Encapsulates the long-press "quick-add" gesture state for HomeScreen bar charts.
 *
 * Flow:
 *  1. User long-presses a bar → handleBarLongPress fires → shows QuickAddModal
 *  2. User slides finger over options → handleHoverOption fires → highlights option
 *  3. User lifts finger → handleLongPressRelease fires → opens Add sheet for the chosen subcategory
 *
 * Returns:
 *   quickAdd        — { parentCatId, rect, view } | null  (controls QuickAddModal visibility)
 *   hoveredOptionId — string | null                        (highlighted option in modal)
 *   quickAddSheet   — { subcatId, view } | null            (controls which Add sheet opens after)
 *   handlers        — { handleBarLongPress, handleHoverOption, handleLongPressRelease }
 *   clearQuickAddSheet — () => void                        (call after the Add sheet closes)
 */
import { useState, useRef, useCallback } from 'react';

export function useQuickAdd() {
  const [quickAdd,        setQuickAdd]        = useState(null); // { parentCatId, rect, view }
  const [hoveredOptionId, setHoveredOptionId] = useState(null);
  const [quickAddSheet,   setQuickAddSheet]   = useState(null); // { subcatId, view }

  // Keep a ref so callbacks can read the current `view` without stale closure issues
  const quickAddRef = useRef(null);
  quickAddRef.current = quickAdd;

  const handleBarLongPress = useCallback((catId, rect, view) => {
    setQuickAdd({ parentCatId: catId, rect, view });
    setHoveredOptionId(null);
  }, []);

  const handleHoverOption = useCallback((optId) => {
    setHoveredOptionId(optId);
  }, []);

  const handleLongPressRelease = useCallback((optId) => {
    const qa   = quickAddRef.current;
    const view = qa?.view;
    setQuickAdd(null);
    setHoveredOptionId(null);
    if (!optId) return;
    if (optId === '__budget__') {
      setQuickAddSheet({ type: 'budget', parentCatId: qa?.parentCatId });
    } else if (view) {
      setQuickAddSheet({ subcatId: optId, view });
    }
  }, []);

  const clearQuickAdd = useCallback(() => {
    setQuickAdd(null);
    setHoveredOptionId(null);
  }, []);

  const clearQuickAddSheet = useCallback(() => {
    setQuickAddSheet(null);
  }, []);

  return {
    quickAdd,
    hoveredOptionId,
    quickAddSheet,
    handleBarLongPress,
    handleHoverOption,
    handleLongPressRelease,
    clearQuickAdd,
    clearQuickAddSheet,
  };
}
