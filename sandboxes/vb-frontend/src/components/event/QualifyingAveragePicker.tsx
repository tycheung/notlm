import React, { useEffect, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DirectorsAPI } from '../../api/directors';
import {
  centerAveragePickLabel,
  formatHouseAverage,
  type TdBowlerAverageRow,
} from '../../types/tdBowlerAverage';

function numericAverage(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function higherOfLastAndTd(row: TdBowlerAverageRow | undefined): number | null {
  if (!row) return null;
  const values = [row.last_entering_average, row.td_average]
    .map(numericAverage)
    .filter((value): value is number => value != null);
  if (!values.length) return null;
  return Math.max(...values);
}

type QualifyingAveragePickerProps = {
  eventId: number;
  userId: number;
  disabled?: boolean;
  onPick: (average: number) => Promise<void> | void;
};

const QualifyingAveragePicker: React.FC<QualifyingAveragePickerProps> = ({
  eventId,
  userId,
  disabled = false,
  onPick,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isFetching, error } = useQuery({
    queryKey: ['bowlerAveragePicks', eventId, userId],
    queryFn: () => DirectorsAPI.getBowlerAveragePicks(eventId, userId),
    enabled: open && !disabled,
  });

  const picks = [
    { key: 'last_entering_average', label: 'Last entering', value: numericAverage(data?.last_entering_average) },
    { key: 'highest_entering_average', label: 'Highest used', value: numericAverage(data?.highest_entering_average) },
    { key: 'td_average', label: 'TD avg', value: numericAverage(data?.td_average) },
    { key: 'center_average', label: centerAveragePickLabel(data), value: numericAverage(data?.center_average) },
    { key: 'lifetime_average', label: 'Lifetime', value: numericAverage(data?.lifetime_average) },
    { key: 'higher_last_td', label: 'Higher of last / TD', value: higherOfLastAndTd(data) },
  ];

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title="Fill from house averages"
        aria-label="Fill from house averages"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center justify-center w-7 h-7 rounded border border-border text-text-muted hover:text-primary hover:border-primary disabled:opacity-50"
      >
        <AddIcon className="w-4 h-4" />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 right-0 w-64 rounded-md border border-border bg-surface shadow-sm p-2">
          {isFetching ? (
            <p className="text-xs text-text-muted px-2 py-1">Loading…</p>
          ) : error ? (
            <p className="text-xs text-red-600 px-2 py-1">Could not load averages.</p>
          ) : (
            <ul className="space-y-1">
              {picks.map((pick) => (
                <li key={pick.key}>
                  <button
                    type="button"
                    disabled={pick.value == null}
                    onClick={async () => {
                      if (pick.value == null) return;
                      await onPick(Number(pick.value.toFixed(1)));
                      await queryClient.invalidateQueries({
                        queryKey: ['bowlerAveragePicks', eventId, userId],
                      });
                      await queryClient.invalidateQueries({ queryKey: ['tdBowlerAverages'] });
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-surface-light disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span>{pick.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatHouseAverage(pick.value)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default QualifyingAveragePicker;
