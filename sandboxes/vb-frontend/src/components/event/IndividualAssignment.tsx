import React, { useState, useEffect } from 'react';
import { useSelectionState } from '../../hooks/useSelectionState';
import SelectionMoveBanner from './SelectionMoveBanner';
import type { SquadRead } from '../../types/squad';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// Import types from DragDropCategorizedTable
import { DragDropCategory, DragDropItem, DragDropResult } from '../common/DragDropCategorizedTable';

// Expand props interface with all from event round workspace / assignment tab usage
interface IndividualAssignmentProps {
  categories: DragDropCategory[];
  onDrop: (result: DragDropResult) => void;
  renderItem: (item: DragDropItem, isDragging?: boolean, listeners?: any) => React.ReactNode;
  isLoading: boolean;
  onReEntryModalOpen: (squadId: number) => void;
  isReEntryAllowed: boolean;
  reEntryModalOpen: boolean;
  onReEntryModalClose: () => void;
  onReEnterParticipants: (ids: number[]) => void;
  participants: any[];
  isSquadReEntryAllowed: (id: number) => boolean;
  emptyMessage: string;
  className: string;
  // New props for selection-based UI
  onMoveSelected: (itemIds: string[], targetSquadId: string) => void;
  /** When set with onEditSquad, shows an edit control next to each squad column header (not unassigned). */
  canEditSquads?: boolean;
  onEditSquad?: (squadId: number) => void;
  squads?: SquadRead[];
  canLockSquads?: boolean;
  onLockSquad?: (squadId: number) => void;
  onRequestUnlockSquad?: (squadId: number) => void;
  lockingSquadId?: number | null;
  unlockingSquadId?: number | null;
}

// Update component
const IndividualAssignment: React.FC<IndividualAssignmentProps> = ({
  categories,
  onDrop: _onDrop,
  renderItem,
  onMoveSelected,
  canEditSquads,
  onEditSquad,
  onReEntryModalOpen,
  isReEntryAllowed,
  isSquadReEntryAllowed,
  squads = [],
  canLockSquads = false,
  onLockSquad,
  onRequestUnlockSquad,
  lockingSquadId = null,
  unlockingSquadId = null,
  ...props
}) => {
  const {
    toggleItemSelection,
    toggleCategorySelection,
    selectAllInCategory,
    deselectAllInCategory,
    clearSelection,
    isItemSelected,
    isCategorySelected,
    getSelectedCount,
    getSelectedItems
  } = useSelectionState();

  // State for collapsible categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((cat) => cat.id))
  );

  // Keep squad rosters visible after lock-in / refetch: initial useState only runs once.
  useEffect(() => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      const validIds = new Set(categories.map((c) => c.id));
      for (const id of next) {
        if (!validIds.has(id)) next.delete(id);
      }
      for (const cat of categories) {
        const itemCount = cat.items?.length ?? 0;
        const squadId =
          cat.id === 'unassigned' ? NaN : Number.parseInt(cat.id, 10);
        const squadLocked =
          cat.id !== 'unassigned' &&
          Number.isFinite(squadId) &&
          Boolean(squads.find((s) => s.id === squadId)?.locked_in);
        if (itemCount > 0 || squadLocked) {
          next.add(cat.id);
        }
      }
      return next;
    });
  }, [categories, squads]);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleMove = (targetSquadId: string) => {
    const selectedItems = getSelectedItems();
    onMoveSelected(selectedItems, targetSquadId);
    clearSelection();
  };

  const isCategoryLocked = (categoryId: string): boolean => {
    if (categoryId === 'unassigned') return false;
    const n = Number.parseInt(categoryId, 10);
    if (!Number.isFinite(n)) return false;
    return Boolean(squads.find((s) => s.id === n)?.locked_in);
  };

  const availableSquads = categories
    .filter((category) => !isCategoryLocked(category.id))
    .map((category) => ({
      id: category.id,
      name: category.name,
    }));

  const renderItemWithCheckbox = (item: DragDropItem, isDragging?: boolean, listeners?: any) => {
    const isSelected = isItemSelected(item.id.toString());
    
    return (
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelection(item.id.toString())}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
        />
        <div className="flex-1 text-text">
          {renderItem(item, isDragging, listeners)}
        </div>
      </div>
    );
  };

  const renderCategoryHeader = (category: DragDropCategory) => {
    const isSelected = isCategorySelected(category.id);
    const allItemIds = category.items?.map(item => item.id.toString()) || [];
    const selectedInCategory = allItemIds.filter(id => isItemSelected(id));
    const isPartiallySelected = selectedInCategory.length > 0 && selectedInCategory.length < allItemIds.length;
    const isExpanded = expandedCategories.has(category.id);
    
    const handleCategoryCheckboxChange = () => {
      if (isSelected || isPartiallySelected) {
        deselectAllInCategory(category.id, allItemIds);
        toggleCategorySelection(category.id);
      } else {
        selectAllInCategory(category.id, allItemIds);
        toggleCategorySelection(category.id);
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => toggleCategoryExpansion(category.id)}
          className="p-1 hover:bg-surface-light rounded border-0 bg-transparent"
          style={{ border: 'none', backgroundColor: 'transparent' }}
        >
          {isExpanded ? (
            <ExpandMoreIcon className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-text-muted" />
          )}
        </button>
        <input
          type="checkbox"
          checked={isSelected}
          ref={(input) => {
            if (input) input.indeterminate = isPartiallySelected;
          }}
          onChange={handleCategoryCheckboxChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
        />
      </div>
    );
  };

  return (
    <div className={props.className}>
      <SelectionMoveBanner
        selectedCount={getSelectedCount()}
        isTeamEvent={false}
        availableSquads={availableSquads}
        onMove={handleMove}
        onClearSelection={clearSelection}
      />
      
      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Participant
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {categories.map((category) => (
                <React.Fragment key={category.id}>
                  {/* Category Header Row */}
                  <tr className="bg-surface-light">
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {renderCategoryHeader(category)}
                          <span className="font-medium text-text inline-flex flex-wrap items-center gap-1">
                            {category.name} ({category.items?.length || 0}
                            {category.maxItems ? `/${category.maxItems}` : ''})
                            {category.id !== 'unassigned' &&
                              Number.isFinite(Number.parseInt(category.id, 10)) && (
                                <span className="inline-flex items-center gap-0.5">
                                  {canEditSquads &&
                                    onEditSquad &&
                                    !isCategoryLocked(category.id) && (
                                    <button
                                      type="button"
                                      className="inline-flex rounded p-0.5 text-text-muted hover:bg-surface hover:text-primary"
                                      aria-label={`Edit squad ${category.name}`}
                                      title="Edit squad name and time"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const id = Number.parseInt(category.id, 10);
                                        if (Number.isFinite(id)) onEditSquad(id);
                                      }}
                                    >
                                      <EditIcon className="h-4 w-4 shrink-0" />
                                    </button>
                                  )}
                                  {isReEntryAllowed &&
                                    !isCategoryLocked(category.id) &&
                                    isSquadReEntryAllowed(
                                      Number.parseInt(category.id, 10)
                                    ) && (
                                      <button
                                        type="button"
                                        className="inline-flex rounded p-0.5 text-text-muted hover:bg-surface hover:text-primary"
                                        aria-label={`Add re-entry to squad ${category.name}`}
                                        title="Add re-entry participants"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const id = Number.parseInt(category.id, 10);
                                          if (Number.isFinite(id)) onReEntryModalOpen(id);
                                        }}
                                      >
                                        <PersonAddIcon className="h-4 w-4 shrink-0" />
                                      </button>
                                    )}
                                  {canLockSquads &&
                                    Number.isFinite(Number.parseInt(category.id, 10)) &&
                                    (isCategoryLocked(category.id) ? (
                                      <button
                                        type="button"
                                        className="inline-flex rounded p-0.5 text-text-muted hover:bg-surface hover:text-amber-700"
                                        aria-label={`Unlock squad ${category.name}`}
                                        title="Unlock squad (deletes game shells and scores for this squad)"
                                        disabled={unlockingSquadId === Number.parseInt(category.id, 10)}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const id = Number.parseInt(category.id, 10);
                                          if (Number.isFinite(id)) onRequestUnlockSquad?.(id);
                                        }}
                                      >
                                        <LockOpenIcon className="h-4 w-4 shrink-0" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex rounded p-0.5 text-text-muted hover:bg-surface hover:text-primary"
                                        aria-label={`Lock squad ${category.name}`}
                                        title="Lock squad in — create game shells for this squad"
                                        data-guide-id="guide-lock-squad"
                                        disabled={lockingSquadId === Number.parseInt(category.id, 10)}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const id = Number.parseInt(category.id, 10);
                                          if (Number.isFinite(id)) onLockSquad?.(id);
                                        }}
                                      >
                                        <LockIcon className="h-4 w-4 shrink-0" />
                                      </button>
                                    ))}
                                </span>
                              )}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Category Items - Only show if expanded */}
                  {expandedCategories.has(category.id) && (
                    <>
                      {category.items && category.items.length > 0 ? (
                        category.items.map((item) => {
                          const isPoolParticipant = Boolean(
                            (item.data as { is_pool_participant?: boolean })?.is_pool_participant
                          );
                          const poolUnassignedRow =
                            category.id === 'unassigned' && isPoolParticipant;
                          return (
                          <tr
                            key={item.id}
                            className={`hover:bg-surface-light/80 ${
                              poolUnassignedRow
                                ? 'bg-violet-950/30 border-l-4 border-violet-500/60'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              {renderItemWithCheckbox(item)}
                            </td>
                          </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="px-4 py-3 text-center text-text-muted">
                            {props.emptyMessage}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IndividualAssignment;
