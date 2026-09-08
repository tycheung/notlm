import React, { useState, useEffect } from 'react';
import Input from '../common/Input';
import Card from '../common/Card';
import Label from '../common/Label';
import SectionTitle from '../common/SectionTitle';
import { EventFormat, DuplicateCashingPolicy } from '../../types/event';
import {
  computeNetPrizePool,
  lineageMaxGames,
  type LineageFeeMode,
} from '../../utils/prizePoolClient';

export interface EventPrizesFormProps {
  entryFee: number;
  onEntryFeeChange: (value: number) => void;
  houseCutPercentage: number;
  onHouseCutPercentageChange: (value: number) => void;
  houseCutAmount: number;
  onHouseCutAmountChange: (value: number) => void;
  additionalPrizePool: number;
  onAdditionalPrizePoolChange: (value: number) => void;
  lineageFeeMode?: LineageFeeMode;
  onLineageFeeModeChange?: (mode: LineageFeeMode) => void;
  lineagePerGame?: number;
  onLineagePerGameChange?: (value: number) => void;
  lineageAmount?: number;
  onLineageAmountChange?: (value: number) => void;
  lineageBilledGames?: number | null;
  onLineageBilledGamesChange?: (value: number | null) => void;
  configuredGameCount?: number;
  /** Approved entrants (matches prize-distribution API). */
  approvedParticipantCount: number;
  maxEntriesHint?: number | null;
  initialHouseCutUiType: 'percentage' | 'dollars_per_entry' | 'amount';
  initialDollarsPerEntryHouseCut?: number;
  onHouseCutUiTypeChange?: (type: 'percentage' | 'dollars_per_entry' | 'amount') => void;
  eventFormat?: EventFormat;
  teamSize?: number | null;
  embedded?: boolean;
  cardTitle?: string;
  duplicateCashingPolicy?: DuplicateCashingPolicy;
  onDuplicateCashingPolicyChange?: (value: DuplicateCashingPolicy) => void;
}

const EventPrizesForm: React.FC<EventPrizesFormProps> = ({
  entryFee,
  onEntryFeeChange,
  houseCutPercentage,
  onHouseCutPercentageChange,
  houseCutAmount,
  onHouseCutAmountChange,
  additionalPrizePool,
  onAdditionalPrizePoolChange,
  lineageFeeMode = 'flat',
  onLineageFeeModeChange,
  lineagePerGame = 0,
  onLineagePerGameChange,
  lineageAmount = 0,
  onLineageAmountChange,
  lineageBilledGames = null,
  onLineageBilledGamesChange,
  configuredGameCount = 0,
  approvedParticipantCount,
  maxEntriesHint: _maxEntriesHint,
  initialHouseCutUiType,
  initialDollarsPerEntryHouseCut,
  onHouseCutUiTypeChange,
  eventFormat,
  teamSize,
  embedded = false,
  cardTitle = 'Prize fund',
  duplicateCashingPolicy,
  onDuplicateCashingPolicyChange,
}) => {
  const [houseCutType, setHouseCutType] = useState<'percentage' | 'dollars_per_entry' | 'amount'>(
    initialHouseCutUiType
  );
  const [houseCutDollarsPerEntry, setHouseCutDollarsPerEntry] = useState<number>(
    () =>
      initialDollarsPerEntryHouseCut ??
      (initialHouseCutUiType === 'dollars_per_entry' ? houseCutPercentage : 5)
  );

  useEffect(() => {
    setHouseCutType(initialHouseCutUiType);
  }, [initialHouseCutUiType]);

  const getEffectiveHeadcount = (): number => Math.max(0, approvedParticipantCount);
  const showPoolDollars = approvedParticipantCount > 0;
  const lineageMax = lineageMaxGames(configuredGameCount, getEffectiveHeadcount());
  const lineageGamesValue = lineageBilledGames ?? lineageMax;

  const calculatePrizePool = (): number => {
    const headcount = getEffectiveHeadcount();
    return computeNetPrizePool(
      entryFee > 0 ? entryFee : 0,
      additionalPrizePool || 0,
      houseCutType,
      houseCutType === 'dollars_per_entry' ? houseCutDollarsPerEntry : houseCutPercentage,
      houseCutAmount,
      headcount,
      lineageFeeMode,
      lineagePerGame,
      lineageAmount,
      configuredGameCount,
      lineageBilledGames
    );
  };

  const handleHouseCutTypeChange = (type: 'percentage' | 'dollars_per_entry' | 'amount') => {
    setHouseCutType(type);
    onHouseCutUiTypeChange?.(type);
    if (type === 'amount') {
      onHouseCutPercentageChange(0);
    } else if (type === 'dollars_per_entry') {
      onHouseCutPercentageChange(houseCutDollarsPerEntry);
      onHouseCutAmountChange(0);
    } else if (type === 'percentage') {
      onHouseCutAmountChange(0);
    }
  };

  const teamCountApprox =
    eventFormat === EventFormat.TEAMS && teamSize && teamSize > 0
      ? Math.floor(approvedParticipantCount / teamSize)
      : null;

  const inner = (
    <>
      {eventFormat === EventFormat.TEAMS ? (
        <div className="mb-4 rounded border border-border bg-surface-light p-3 text-sm text-text">
          <p className="font-medium text-text mb-2">Team events: who pays vs who wins</p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted">
            <li>
              <strong className="text-text">Fees are per individual bowler.</strong> Prize places are configured per
              final node (team placements).
            </li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-text-muted mb-4">
          Entry fees, house cut, and lineage set the net prize pool. Configure how that pool is split under{' '}
          <strong className="text-text">Exit node payouts</strong> below.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <Input
            label="Entry fee (per bowler) ($)"
            name="entryFee"
            type="number"
            value={entryFee}
            onChange={(e) => onEntryFeeChange(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.01}
            fullWidth
          />
        </div>
        <div className="flex flex-col sm:col-span-2">
          <Label>House cut</Label>
          <div className="grid grid-cols-3 border border-border rounded-md overflow-hidden">
            <button
              type="button"
              className={`py-2 px-4 text-center ${
                houseCutType === 'amount' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:bg-surface-light'
              }`}
              onClick={() => handleHouseCutTypeChange('amount')}
            >
              Fixed $
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-center ${
                houseCutType === 'dollars_per_entry'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-muted hover:bg-surface-light'
              }`}
              onClick={() => handleHouseCutTypeChange('dollars_per_entry')}
            >
              Per bowler
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-center ${
                houseCutType === 'percentage'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-muted hover:bg-surface-light'
              }`}
              onClick={() => handleHouseCutTypeChange('percentage')}
            >
              Percent
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        {houseCutType === 'amount' ? (
          <Input
            label="House cut amount ($)"
            name="houseCutAmount"
            type="number"
            value={houseCutAmount}
            onChange={(e) => onHouseCutAmountChange(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.01}
            fullWidth
          />
        ) : houseCutType === 'dollars_per_entry' ? (
          <Input
            label={eventFormat === EventFormat.TEAMS ? 'House cut per bowler ($)' : 'House cut per bowler ($)'}
            name="houseCutDollarsPerEntry"
            type="number"
            value={houseCutDollarsPerEntry}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0;
              setHouseCutDollarsPerEntry(v);
              onHouseCutPercentageChange(v);
            }}
            min={0}
            step={0.01}
            fullWidth
          />
        ) : (
          <Input
            label="House cut (%)"
            name="houseCutPercentage"
            type="number"
            value={houseCutPercentage}
            onChange={(e) => onHouseCutPercentageChange(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.1}
            fullWidth
          />
        )}
      </div>

      <div className="mb-4">
        <Label>Lineage</Label>
        <div className="grid grid-cols-2 border border-border rounded-md overflow-hidden mb-3">
          <button
            type="button"
            className={`py-2 px-4 text-center ${
              lineageFeeMode === 'flat' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:bg-surface-light'
            }`}
            onClick={() => onLineageFeeModeChange?.('flat')}
          >
            Flat total
          </button>
          <button
            type="button"
            className={`py-2 px-4 text-center ${
              lineageFeeMode === 'per_game'
                ? 'bg-primary text-white'
                : 'bg-surface text-text-muted hover:bg-surface-light'
            }`}
            onClick={() => onLineageFeeModeChange?.('per_game')}
          >
            Per game
          </button>
        </div>
        {lineageFeeMode === 'per_game' ? (
          <>
            <Input
              label="Lineage per game per bowler ($)"
              name="lineagePerGame"
              type="number"
              value={lineagePerGame}
              onChange={(e) => onLineagePerGameChange?.(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
              fullWidth
            />
            <p className="text-sm text-text-muted mt-1">
              {configuredGameCount > 0
                ? `Max games ${lineageMax} = ${configuredGameCount} configured game${configuredGameCount === 1 ? '' : 's'} × ${approvedParticipantCount} approved bowler${approvedParticipantCount === 1 ? '' : 's'} (best-of uses the series ceiling).`
                : 'Set round game counts on Format Editor — max games is 0 until games exist.'}
            </p>
            <Input
              label="Games for lineage"
              name="lineageBilledGames"
              type="number"
              value={lineageGamesValue}
              onChange={(e) =>
                onLineageBilledGamesChange?.(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              min={0}
              step={1}
              fullWidth
            />
            <p className="text-sm text-text-muted mt-1">
              Lineage is rate × this count. Edit down from max when series end early.
              {lineageBilledGames != null ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="underline text-primary"
                    onClick={() => onLineageBilledGamesChange?.(null)}
                  >
                    Reset to max ({lineageMax})
                  </button>
                </>
              ) : null}
            </p>
          </>
        ) : (
          <Input
            label="Lineage total ($)"
            name="lineageAmount"
            type="number"
            value={lineageAmount}
            onChange={(e) => onLineageAmountChange?.(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.01}
            fullWidth
          />
        )}
        <p className="text-sm text-text-muted mt-1">
          Paid to the center. Separate from house cut / expenses.
        </p>
      </div>

      <div className="mb-4">
        <Input
          label="Additional prize pool ($)"
          name="additionalPrizePool"
          type="number"
          value={additionalPrizePool}
          onChange={(e) => onAdditionalPrizePoolChange(parseFloat(e.target.value) || 0)}
          min={0}
          step={0.01}
          fullWidth
        />
        <p className="text-sm text-text-muted mt-1">Added on top of entry fees (before house cut and lineage).</p>
      </div>

      {duplicateCashingPolicy != null && onDuplicateCashingPolicyChange && (
        <div className="mb-4">
          <Label htmlFor="dupCash">Duplicate cashing</Label>
          <select
            id="dupCash"
            value={duplicateCashingPolicy}
            onChange={(e) =>
              onDuplicateCashingPolicyChange(e.target.value as DuplicateCashingPolicy)
            }
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value={DuplicateCashingPolicy.ALLOW_MULTIPLE}>Allow multiple cashes per bowler/team</option>
            <option value={DuplicateCashingPolicy.SINGLE_AND_PROMOTE}>
              Single cash — promote next eligible placement
            </option>
          </select>
        </div>
      )}

      <div className="mb-4 rounded border border-border bg-surface-light px-3 py-2 text-sm text-text">
        <span className="font-medium">Approved on roster:</span> {approvedParticipantCount} bowler
        {approvedParticipantCount === 1 ? '' : 's'}
        {approvedParticipantCount === 0 && (
          <span className="text-text-muted"> — net pool $ estimates hidden until someone is approved.</span>
        )}
      </div>

      {eventFormat === EventFormat.TEAMS && teamSize && teamSize > 0 && approvedParticipantCount > 0 && (
        <p className="text-sm text-text-muted mb-4">
          ~{teamCountApprox ?? 0} team{teamCountApprox === 1 ? '' : 's'} from bowlers ÷ {teamSize}.
        </p>
      )}

      <div className="rounded-md border border-border bg-surface-light p-4">
        <SectionTitle size="small" className="mb-2">
          Estimated net prize pool
        </SectionTitle>
        <p className="text-2xl font-semibold text-text">
          {showPoolDollars ? `$${calculatePrizePool().toFixed(2)}` : '—'}
        </p>
        <p className="text-xs text-text-muted mt-1">
          After house cut and lineage; split across final nodes in the section below.
        </p>
      </div>
    </>
  );

  if (embedded) {
    return <div className="max-h-[70vh] overflow-y-auto pr-1">{inner}</div>;
  }

  return <Card title={cardTitle}>{inner}</Card>;
};

export default EventPrizesForm;
