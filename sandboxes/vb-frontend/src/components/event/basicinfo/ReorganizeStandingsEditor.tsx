import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Button from '../../common/Button';
import Alert from '../../common/Alert';
import { getErrorMessage } from '../../../api/apiErrors';
import { EventsAPI } from '../../../api/events';
import type { EventPrizeDistributionMergedItem } from '../../../types/event';
import {
  buildStandingsLabels,
  lookupStandingsLabel,
} from '../../../utils/standingsLabels';

export interface StandingsEditorRow {
  position: string;
  winnerName: string;
  amountText: string;
}

export interface StandingsEditorNodeDraft {
  id: number;
  name: string;
  display_order: number;
  placement_count: number;
  include_in_standings: boolean;
  rows: StandingsEditorRow[];
}

interface ReorganizeStandingsEditorProps {
  eventId: number;
  initialNodes: StandingsEditorNodeDraft[];
  onSaved: () => void;
  onCancel: () => void;
}

interface SortableNodeCardProps {
  node: StandingsEditorNodeDraft;
  labels: ReturnType<typeof buildStandingsLabels>;
  onIncludeChange: (included: boolean) => void;
}

const SortableNodeCard: React.FC<SortableNodeCardProps> = ({
  node,
  labels,
  onIncludeChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border bg-surface-light p-3"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="shrink-0 cursor-grab text-text-muted hover:text-text touch-none p-0.5"
            aria-label={`Drag to reorder ${node.name}`}
            {...attributes}
            {...listeners}
          >
            <DragIndicatorIcon className="w-5 h-5" />
          </button>
          <h4 className="font-semibold text-text truncate">{node.name}</h4>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-text shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={node.include_in_standings}
            onChange={(e) => onIncludeChange(e.target.checked)}
            className="rounded border-border"
          />
          Include in standings
        </label>
      </div>
      <div className="space-y-2">
        {node.rows.map((row) => {
          const localPos = parseInt(row.position, 10);
          const entry =
            Number.isFinite(localPos) && localPos > 0
              ? lookupStandingsLabel(labels, node.id, localPos)
              : null;
          return (
            <div
              key={`${node.id}-${row.position}`}
              className="rounded border border-border/70 bg-surface px-2 py-1.5"
            >
              <div className="flex justify-between gap-2 text-sm">
                {entry ? (
                  <span className="font-medium text-text">{entry.label}</span>
                ) : (
                  <span className="text-text-muted text-xs">—</span>
                )}
                <span className="text-text-muted">{row.amountText}</span>
              </div>
              <div className="text-sm text-text-muted">{row.winnerName}</div>
            </div>
          );
        })}
        {node.rows.length === 0 && (
          <p className="text-xs text-text-muted italic">No placements configured.</p>
        )}
      </div>
    </div>
  );
};

const ReorganizeStandingsEditor: React.FC<ReorganizeStandingsEditorProps> = ({
  eventId,
  initialNodes,
  onSaved,
  onCancel,
}) => {
  const [draftNodes, setDraftNodes] = useState<StandingsEditorNodeDraft[]>(initialNodes);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const labelInput = useMemo(
    () =>
      draftNodes.map((n, index) => ({
        id: n.id,
        display_order: index,
        placement_count: n.placement_count,
        include_in_standings: n.include_in_standings,
      })),
    [draftNodes]
  );

  const labels = useMemo(() => buildStandingsLabels(labelInput), [labelInput]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftNodes((items) => {
      const oldIndex = items.findIndex((n) => n.id === active.id);
      const newIndex = items.findIndex((n) => n.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex).map((n, idx) => ({
        ...n,
        display_order: idx,
      }));
    });
  };

  const handleIncludeChange = (nodeId: number, included: boolean) => {
    setDraftNodes((items) =>
      items.map((n) =>
        n.id === nodeId ? { ...n, include_in_standings: included } : n
      )
    );
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await EventsAPI.updateFinalNodesStandingsConfig(
        eventId,
        draftNodes.map((n, index) => ({
          final_node_id: n.id,
          display_order: index,
          include_in_standings: n.include_in_standings,
        }))
      );
      onSaved();
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, 'Failed to save standings order.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t pt-3 space-y-3">
      <p className="text-sm text-text-muted">
        Drag exit nodes to set standings order. Uncheck &quot;Include in standings&quot; to list
        winners without place labels.
      </p>
      {saveError && (
        <Alert variant="error" message={saveError} onDismiss={() => setSaveError(null)} />
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={draftNodes.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {draftNodes.map((node) => (
              <SortableNodeCard
                key={node.id}
                node={node}
                labels={labels}
                onIncludeChange={(included) => handleIncludeChange(node.id, included)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" variant="lightbackground" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="darkbackground"
          size="small"
          disabled={isSaving || draftNodes.length === 0}
          onClick={() => void handleSave()}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
};

export function buildStandingsEditorNodes(
  finalNodes: Array<{
    id: number;
    name: string;
    display_order: number;
    placement_count: number;
    include_in_standings?: boolean;
    is_active: boolean;
  }>,
  mergedByNode: Record<string, Record<string, EventPrizeDistributionMergedItem>> | undefined
): StandingsEditorNodeDraft[] {
  const active = finalNodes
    .filter((n) => n.is_active && (n.placement_count > 0 || mergedByNode?.[String(n.id)]))
    .sort((a, b) => a.display_order - b.display_order || a.id - b.id);

  return active.map((node) => {
    const rowsMap = mergedByNode?.[String(node.id)] ?? {};
    const rows: StandingsEditorRow[] = Object.entries(rowsMap)
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
      .map(([position, row]) => {
        const amountText =
          row.amount != null
            ? `$${row.amount.toFixed(2)}`
            : row.percentage != null
              ? `${row.percentage}%`
              : row.is_custom_label_only
                ? 'Custom payout'
                : '—';
        return {
          position,
          winnerName: row.winner?.display_name || 'TBD',
          amountText,
        };
      });

    if (rows.length === 0 && node.placement_count > 0) {
      for (let pos = 1; pos <= node.placement_count; pos += 1) {
        rows.push({
          position: String(pos),
          winnerName: 'TBD',
          amountText: '—',
        });
      }
    }

    return {
      id: node.id,
      name: node.name,
      display_order: node.display_order,
      placement_count: node.placement_count,
      include_in_standings: node.include_in_standings ?? true,
      rows,
    };
  });
}

export default ReorganizeStandingsEditor;
