import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import type { SideActionEntrantRow } from '../../api/side-actions';
export type { SideActionEntrantRow } from '../../api/side-actions';

type SortKey = 'display_name' | 'entry_count';

interface SideActionEntrantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionName: string;
  entrants: SideActionEntrantRow[];
  isLoading?: boolean;
  entryUnit?: 'bowler' | 'team';
}

const SideActionEntrantsModal: React.FC<SideActionEntrantsModalProps> = ({
  isOpen,
  onClose,
  sideActionName,
  entrants,
  isLoading = false,
  entryUnit = 'bowler',
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('entry_count');
  const [sortAsc, setSortAsc] = useState(false);
  const [activePoolId, setActivePoolId] = useState<number | null>(null);
  const tabsId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    setActivePoolId(null);
  }, [isOpen, sideActionName]);

  const poolOptions = useMemo(() => {
    const pools = new Map<number, string>();
    entrants.forEach((entrant) => {
      entrant.pools.forEach((pool) => pools.set(pool.pool_id, pool.squad_name));
      if (
        entrant.pools.length === 0 &&
        entrant.pool_id != null &&
        entrant.squad_name
      ) {
        pools.set(entrant.pool_id, entrant.squad_name);
      }
    });
    return [...pools.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entrants]);

  const sorted = useMemo(() => {
    const rows = entrants.flatMap((entrant) => {
      const matchingPools = activePoolId
        ? entrant.pools.filter((pool) => pool.pool_id === activePoolId)
        : entrant.pools;
      if (
        !matchingPools.length &&
        entrant.pool_id &&
        (activePoolId === null || entrant.pool_id === activePoolId)
      ) {
        return [{
          ...entrant,
          squad_name: entrant.squad_name ?? 'Squad',
        }];
      }
      if (!matchingPools.length) return [];
      return matchingPools.map((pool) => ({
        ...entrant,
        entry_count: pool.entry_count,
        pool_id: pool.pool_id,
        squad_id: pool.squad_id,
        squad_name: pool.squad_name,
      }));
    });
    rows.sort((a, b) => {
      if (sortKey === 'entry_count') {
        const diff = a.entry_count - b.entry_count;
        return sortAsc ? diff : -diff;
      }
      const diff = a.display_name.localeCompare(b.display_name, undefined, {
        sensitivity: 'base',
      });
      return sortAsc ? diff : -diff;
    });
    return rows;
  }, [activePoolId, entrants, sortAsc, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortKey(key);
    setSortAsc(key === 'display_name');
  };

  const sortMarker = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';
  const tabValues = useMemo(
    () => [null, ...poolOptions.map(([poolId]) => poolId)] as Array<number | null>,
    [poolOptions]
  );
  const activeTabIndex = Math.max(0, tabValues.indexOf(activePoolId));
  const selectTabByIndex = (index: number) => {
    const wrappedIndex = (index + tabValues.length) % tabValues.length;
    setActivePoolId(tabValues[wrappedIndex]);
    tabRefs.current[wrappedIndex]?.focus();
  };
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectTabByIndex(activeTabIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectTabByIndex(activeTabIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectTabByIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectTabByIndex(tabValues.length - 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`View Details — ${sideActionName}`}
      size="medium"
      closeOnOutsideClick
    >
      {isLoading && <p className="text-sm text-text-muted py-4">Loading entrants…</p>}
      {!isLoading && entrants.length === 0 && (
        <p className="text-sm text-text-muted py-4">No entries yet.</p>
      )}
      {!isLoading && entrants.length > 0 && (
        <div>
          {poolOptions.length > 1 && (
            <div
              className="mb-3 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Squad entrant filters"
            >
              <button
                id={`${tabsId}-tab-all`}
                ref={(node) => { tabRefs.current[0] = node; }}
                type="button"
                role="tab"
                aria-selected={activePoolId === null}
                aria-controls={`${tabsId}-panel`}
                tabIndex={activePoolId === null ? 0 : -1}
                onKeyDown={handleTabKeyDown}
                onClick={() => setActivePoolId(null)}
                className="rounded border border-border px-3 py-1 text-sm"
              >
                All squads
              </button>
              {poolOptions.map(([poolId, squadName]) => (
                <button
                  key={poolId}
                  id={`${tabsId}-tab-${poolId}`}
                  ref={(node) => {
                    tabRefs.current[poolOptions.findIndex(([id]) => id === poolId) + 1] = node;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={activePoolId === poolId}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={activePoolId === poolId ? 0 : -1}
                  onKeyDown={handleTabKeyDown}
                  onClick={() => setActivePoolId(poolId)}
                  className="rounded border border-border px-3 py-1 text-sm"
                >
                  {squadName}
                </button>
              ))}
            </div>
          )}
        <div
          id={`${tabsId}-panel`}
          role={poolOptions.length > 1 ? 'tabpanel' : undefined}
          aria-labelledby={
            poolOptions.length > 1
              ? `${tabsId}-tab-${activePoolId === null ? 'all' : activePoolId}`
              : undefined
          }
          className="overflow-x-auto max-h-[60vh]"
        >
          <table className="min-w-full divide-y divide-border text-sm" aria-label="Side action entrants">
            <thead className="bg-primary sticky top-0">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-text">
                  <button type="button" className="hover:underline" onClick={() => toggleSort('display_name')}>
                    {entryUnit === 'team' ? 'Team' : 'Bowler'}{sortMarker('display_name')}
                  </button>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-text">
                  Squad
                </th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">
                  <button type="button" className="hover:underline" onClick={() => toggleSort('entry_count')}>
                    Entries{sortMarker('entry_count')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((row) => (
                <tr key={`${row.user_id}:${row.pool_id ?? 'all'}`}>
                  <td className="px-3 py-2 font-medium text-text">{row.display_name}</td>
                  <td className="px-3 py-2 text-text-muted">
                    {row.squad_name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-text-muted">{row.entry_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </Modal>
  );
};

export default SideActionEntrantsModal;
