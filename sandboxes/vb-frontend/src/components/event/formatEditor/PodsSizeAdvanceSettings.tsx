import React, { useMemo } from 'react';
import Input from '../../common/Input';
import Label from '../../common/Label';
import type { PodsBalanceMode, PodsDeskConfig, PodsRemainderMode } from './podsMatchupsUtils';
import { defaultAdvanceForSize } from './podsMatchupsUtils';
import { OPENING_ROUND_PODS_BALANCE_MODES } from './openingRoundSeeding';
import SeedSourceRoundSelect from './SeedSourceRoundSelect';

const selectCls =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';

interface PodsSizeAdvanceSettingsProps {
  draft: PodsDeskConfig;
  onChange: (patch: Partial<PodsDeskConfig>) => void;
  entrantCountHint?: number | null;
  /** When false, hide by_seed (opening round with no feeder). */
  allowStandingsBasedSeeding?: boolean;
  eventId?: number;
  currentRoundId?: number;
}

const BALANCE_OPTIONS: Array<{ value: PodsBalanceMode; label: string; hint: string }> = [
  {
    value: 'by_seed',
    label: 'By standings / seed',
    hint:
      'Snake-spreads strongest across pods. Seed 1 is the top of the chosen seed-order source (incoming feeder or an earlier round such as original qualifying).',
  },
  {
    value: 'random',
    label: 'Random',
    hint: 'Shuffle entrants, then fill pods in order.',
  },
  {
    value: 'manual',
    label: 'Manual',
    hint: 'Edit membership lists before generate (or keep last membership).',
  },
];

const PodsSizeAdvanceSettings: React.FC<PodsSizeAdvanceSettingsProps> = ({
  draft,
  onChange,
  entrantCountHint,
  allowStandingsBasedSeeding = true,
  eventId,
  currentRoundId,
}) => {
  const lo = Math.max(2, draft.pod_size_min);
  const hi = Math.max(lo, draft.pod_size_max);
  const sizes = useMemo(() => {
    const rows: number[] = [];
    for (let s = lo; s <= hi; s += 1) rows.push(s);
    return rows;
  }, [lo, hi]);

  const balanceOptions = allowStandingsBasedSeeding
    ? BALANCE_OPTIONS
    : BALANCE_OPTIONS.filter((opt) =>
        (OPENING_ROUND_PODS_BALANCE_MODES as string[]).includes(opt.value)
      );

  const setAdvance = (size: number, value: number) => {
    onChange({
      advance_by_size: {
        ...draft.advance_by_size,
        [String(size)]: Math.max(1, Math.min(value, size - 1)),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-text">Pods (Beat the pair)</p>
        <p className="text-xs text-text-muted">
          Advancers are ranked by pinfall within each pod (scratch or handicap from scoring
          settings). Set min/max size and how many advance from each size.
          {entrantCountHint != null && entrantCountHint > 0
            ? ` Roster hint: ${entrantCountHint} entrants.`
            : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Min pod size"
          type="number"
          min={2}
          value={String(draft.pod_size_min)}
          onChange={(e) => {
            const nextMin = Math.max(2, parseInt(e.target.value, 10) || 2);
            onChange({
              pod_size_min: nextMin,
              pod_size_max: Math.max(nextMin, draft.pod_size_max),
              preferred_pod_size:
                draft.preferred_pod_size != null
                  ? Math.max(nextMin, Math.min(draft.pod_size_max, draft.preferred_pod_size))
                  : draft.preferred_pod_size,
            });
          }}
          fullWidth
        />
        <Input
          label="Max pod size"
          type="number"
          min={2}
          value={String(draft.pod_size_max)}
          onChange={(e) => {
            const nextMax = Math.max(2, parseInt(e.target.value, 10) || 2);
            onChange({
              pod_size_max: Math.max(draft.pod_size_min, nextMax),
              preferred_pod_size:
                draft.preferred_pod_size != null
                  ? Math.max(draft.pod_size_min, Math.min(nextMax, draft.preferred_pod_size))
                  : draft.preferred_pod_size,
            });
          }}
          fullWidth
        />
        <Input
          label="Preferred pod size"
          type="number"
          min={lo}
          max={hi}
          value={draft.preferred_pod_size != null ? String(draft.preferred_pod_size) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              onChange({ preferred_pod_size: null });
              return;
            }
            const next = Math.max(lo, Math.min(hi, parseInt(raw, 10) || lo));
            onChange({ preferred_pod_size: next });
          }}
          fullWidth
          placeholder="Auto"
        />
      </div>
      <p className="text-xs text-text-muted -mt-2">
        Preferred size nudges even remainder mix (e.g. 60 entrants, 4–6 band, prefer 6 → 10×6).
        Leave blank to target the middle of min–max.
      </p>

      <div>
        <Label>Advance by pod size</Label>
        <div className="mt-2 overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-light text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Pod size</th>
                <th className="px-3 py-2 font-semibold">Advance</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size} className="border-t border-border/70">
                  <td className="px-3 py-2 text-text">{size} bowlers / teams</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, size - 1)}
                      className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm text-text"
                      value={
                        draft.advance_by_size[String(size)] ?? defaultAdvanceForSize(size)
                      }
                      onChange={(e) =>
                        setAdvance(size, parseInt(e.target.value, 10) || 1)
                      }
                      aria-label={`Advance count for pod size ${size}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Remainder mix</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              {
                value: 'even' as PodsRemainderMode,
                label: 'Even (default)',
                hint: 'Spread sizes as evenly as possible within min–max.',
              },
              {
                value: 'prefer_max' as PodsRemainderMode,
                label: 'Prefer max',
                hint: 'As many max-size pods as possible; leftover stays ≥ min.',
              },
            ] as const
          ).map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 text-sm text-text">
              <input
                type="radio"
                name="pods-remainder"
                className="mt-1"
                checked={draft.remainder_mode === opt.value}
                onChange={() => onChange({ remainder_mode: opt.value })}
              />
              <span>
                <span className="font-medium">{opt.label}</span>
                <span className="block text-xs text-text-muted">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="pods-balance-mode">Balance assignments</Label>
        {!allowStandingsBasedSeeding ? (
          <p className="mt-1 text-xs text-text-muted">
            First format (no qualifying feeder): standings/seed balance needs a feeder — use random
            or manual only.
          </p>
        ) : null}
        <select
          id="pods-balance-mode"
          className={`${selectCls} mt-1`}
          value={draft.balance_mode}
          onChange={(e) => onChange({ balance_mode: e.target.value as PodsBalanceMode })}
        >
          {balanceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text-muted">
          {balanceOptions.find((o) => o.value === draft.balance_mode)?.hint}
        </p>
      </div>

      {allowStandingsBasedSeeding &&
      draft.balance_mode === 'by_seed' &&
      eventId != null &&
      currentRoundId != null ? (
        <SeedSourceRoundSelect
          eventId={eventId}
          currentRoundId={currentRoundId}
          value={{
            seed_source_mode: draft.seed_source_mode,
            seed_source_round_id: draft.seed_source_round_id,
          }}
          onChange={(patch) => onChange(patch)}
        />
      ) : null}
    </div>
  );
};

export default PodsSizeAdvanceSettings;
