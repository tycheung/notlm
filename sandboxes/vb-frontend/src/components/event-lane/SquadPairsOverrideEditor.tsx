import React, { useEffect, useState } from 'react';
import {
  useInheritSquadPairs,
  useUpdateSquadPairs,
  type LanePair,
} from '../../features/lanes';
import PairsInPlayEditor from './PairsInPlayEditor';

interface SquadPairsOverrideEditorProps {
  eventId: number;
  squadId: number;
  squadName: string;
  centerLaneCount: number;
  eventPairs: LanePair[];
  squadPairs: LanePair[];
  pairSource?: string;
  disabled?: boolean;
  onSaved: () => void;
}

const SquadPairsOverrideEditor: React.FC<SquadPairsOverrideEditorProps> = ({
  eventId,
  squadId,
  squadName,
  centerLaneCount,
  eventPairs,
  squadPairs,
  pairSource = 'event',
  disabled = false,
  onSaved,
}) => {
  const [pairs, setPairs] = useState<LanePair[]>(squadPairs);
  const saveMutation = useUpdateSquadPairs(eventId);
  const resetMutation = useInheritSquadPairs(eventId);

  useEffect(() => {
    setPairs(squadPairs);
  }, [squadPairs, squadId]);

  return (
    <div className="space-y-3 rounded-input border border-border bg-surface-light/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-text">Squad pairs: {squadName}</h4>
          <p className="text-xs text-text-muted">
            {pairSource === 'squad'
              ? 'This squad overrides event pairs in play.'
              : 'Using event pairs in play.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-input border border-border bg-surface-light hover:bg-surface disabled:opacity-50 text-sm"
            disabled={disabled || resetMutation.isPending || pairSource !== 'squad'}
            onClick={() =>
              resetMutation.mutate(squadId, {
                onSuccess: () => onSaved(),
              })
            }
          >
            {resetMutation.isPending ? 'Resetting…' : 'Use event pairs'}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-input bg-primary text-white hover:opacity-90 disabled:opacity-50 text-sm"
            disabled={disabled || saveMutation.isPending || pairs.length === 0}
            onClick={() =>
              saveMutation.mutate(
                { squadId, pairs },
                {
                  onSuccess: () => onSaved(),
                }
              )
            }
          >
            {saveMutation.isPending ? 'Saving…' : 'Save squad pairs'}
          </button>
        </div>
      </div>

      {centerLaneCount >= 2 ? (
        <PairsInPlayEditor
          centerLaneCount={centerLaneCount}
          pairs={pairs}
          onChange={setPairs}
          disabled={disabled || saveMutation.isPending}
        />
      ) : (
        <p className="text-sm text-text-muted">Set center lane count before editing squad pairs.</p>
      )}

      {pairSource !== 'squad' ? (
        <p className="text-xs text-text-muted">
          Tip: adjust pairs and save to override only this squad. Event pairs:{' '}
          {eventPairs.map(([a, b]) => `${a}-${b}`).join(', ') || 'none set'}.
        </p>
      ) : null}
    </div>
  );
};

export default SquadPairsOverrideEditor;
