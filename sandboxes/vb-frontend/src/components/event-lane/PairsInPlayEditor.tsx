import React, { useMemo, useState, useEffect } from 'react';
import {
  allCenterPairs,
  parsePairsFromExpression,
  pairsToExpression,
  togglePair,
  type LanePair,
} from '../../features/lanes';
import Label from '../common/Label';

interface PairsInPlayEditorProps {
  centerLaneCount: number;
  pairs: LanePair[];
  onChange: (pairs: LanePair[]) => void;
  disabled?: boolean;
}

const fieldClass =
  'w-full rounded-input border border-border bg-surface-light px-3 py-2 text-sm text-text ' +
  'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ' +
  'disabled:opacity-50';

const PairsInPlayEditor: React.FC<PairsInPlayEditorProps> = ({
  centerLaneCount,
  pairs,
  onChange,
  disabled = false,
}) => {
  const available = useMemo(() => allCenterPairs(centerLaneCount), [centerLaneCount]);
  const selectedKeys = useMemo(
    () => new Set(pairs.map(([a, b]) => `${a}-${b}`)),
    [pairs]
  );
  const [rangeDraft, setRangeDraft] = useState(pairsToExpression(pairs));

  useEffect(() => {
    setRangeDraft(pairsToExpression(pairs));
  }, [pairs]);

  const applyRange = () => {
    try {
      onChange(parsePairsFromExpression(rangeDraft));
    } catch {
      // Keep draft; save validation surfaces the issue.
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="lanes-in-play-range">Pairs in play</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          <input
            id="lanes-in-play-range"
            className={`${fieldClass} flex-1 min-w-[12rem]`}
            value={rangeDraft}
            disabled={disabled}
            onChange={(e) => setRangeDraft(e.target.value)}
            onBlur={applyRange}
            placeholder="1-8, 11-16"
          />
          <button
            type="button"
            className="px-3 py-2 rounded-input border border-border bg-surface-light text-text hover:bg-surface disabled:opacity-50"
            disabled={disabled}
            onClick={applyRange}
          >
            Apply
          </button>
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(5.5rem, 1fr))' }}
        role="group"
        aria-label="Pair toggles"
      >
        {available.map((pair) => {
          const key = `${pair[0]}-${pair[1]}`;
          const on = selectedKeys.has(key);
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              className={`rounded-input border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                on
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-light text-text border-border hover:bg-surface'
              }`}
              onClick={() => {
                const next = togglePair(pairs, pair);
                onChange(next);
                setRangeDraft(pairsToExpression(next));
              }}
            >
              {pair[0]}–{pair[1]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PairsInPlayEditor;
