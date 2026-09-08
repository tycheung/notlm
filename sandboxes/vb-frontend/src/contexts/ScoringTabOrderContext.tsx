import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import type { ScoringTabMode } from '../hooks/useScoringTabMode';

export type TabNavigateDirection = 'forward' | 'backward';

type ScoringTabOrderContextValue = {
  tabMode: ScoringTabMode;
  /** Current traversal order (must match register order semantics). */
  setOrderedCellIds: (ids: string[]) => void;
  registerCell: (id: string, activate: () => void) => void;
  unregisterCell: (id: string) => void;
  navigateFromCell: (fromId: string, direction: TabNavigateDirection) => void;
};

const ScoringTabOrderContext = createContext<ScoringTabOrderContextValue | null>(
  null
);

export function ScoringTabOrderProvider({
  children,
  tabMode,
}: {
  children: React.ReactNode;
  tabMode: ScoringTabMode;
}) {
  const orderRef = useRef<string[]>([]);
  const activatorsRef = useRef<Map<string, () => void>>(new Map());

  const setOrderedCellIds = useCallback((ids: string[]) => {
    orderRef.current = ids;
  }, []);

  const registerCell = useCallback((id: string, activate: () => void) => {
    activatorsRef.current.set(id, activate);
  }, []);

  const unregisterCell = useCallback((id: string) => {
    activatorsRef.current.delete(id);
  }, []);

  const navigateFromCell = useCallback(
    (fromId: string, direction: TabNavigateDirection) => {
      const order = orderRef.current;
      if (order.length === 0) return;
      const idx = order.indexOf(fromId);
      if (idx === -1) return;
      const delta = direction === 'forward' ? 1 : -1;
      const nextIdx = (idx + delta + order.length) % order.length;
      const nextId = order[nextIdx];
      // Activate synchronously so the next input is focused before the
      // Tab keydown handler returns — rAF was late enough that the first
      // digit after Tab was often lost (e.g. 167 → 67).
      activatorsRef.current.get(nextId)?.();
    },
    []
  );

  const value = useMemo(
    () => ({
      tabMode,
      setOrderedCellIds,
      registerCell,
      unregisterCell,
      navigateFromCell,
    }),
    [tabMode, setOrderedCellIds, registerCell, unregisterCell, navigateFromCell]
  );

  return (
    <ScoringTabOrderContext.Provider value={value}>
      {children}
    </ScoringTabOrderContext.Provider>
  );
}

export function useScoringTabOrder(): ScoringTabOrderContextValue | null {
  return useContext(ScoringTabOrderContext);
}
