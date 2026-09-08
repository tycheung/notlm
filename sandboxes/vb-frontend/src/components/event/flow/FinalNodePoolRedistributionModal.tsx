import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Alert from '../../common/Alert';
import Label from '../../common/Label';
import Input from '../../common/Input';
import SectionTitle from '../../common/SectionTitle';
import EventPrizesForm from '../EventPrizesForm';
import {
  DuplicateCashingPolicy,
  EventComplete,
  EventUpdate,
  type FinalNodeRead,
} from '../../../types/event';
import { EventsAPI } from '../../../api/events';
import { getErrorMessage } from '../../../api/apiErrors';
import { normalizePatchPayload } from '../../../api/payloadNormalization';
import { computeNetPrizePool, computeNodeSliceRaw, configuredGameCount } from '../../../utils/prizePoolClient';
import type { LineageFeeMode } from '../../../utils/prizePoolClient';
import {
  autoFillSingleUnknownCrossNode,
  validateMultiNodePools,
  type CrossNodePoolInput,
} from '../../../utils/finalNodePoolValidation';

function deriveInitialHouseCutUiType(ec: EventComplete): 'percentage' | 'dollars_per_entry' | 'amount' {
  const t = ec.house_cut_type;
  if (t === 'amount' || (ec.house_cut_amount != null && ec.house_cut_amount > 0)) {
    return 'amount';
  }
  if (t === 'dollars_per_entry') {
    return 'dollars_per_entry';
  }
  return 'percentage';
}

export type PendingNewNodePool = {
  node_pool_type: FinalNodeRead['node_pool_type'];
  node_pool_value: number;
};

export interface FinalNodePoolRedistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  /** Draft row for an exit node about to be created (pool saved on create, not PATCH). */
  includePendingNewNodeRow?: boolean;
  /**
   * When true, primary button is "Continue" and calls `onPipelineContinue` after save.
   * When false, primary is "Save" and only closes.
   */
  pipelineMode?: boolean;
  onPipelineContinue?: (ctx: { pendingNewNodePool?: PendingNewNodePool }) => void;
}

type PoolRow = {
  id: number;
  name: string;
  node_pool_type: FinalNodeRead['node_pool_type'];
  node_pool_value: number | null;
};

function toActiveFinalNodes(rows: PoolRow[], fullNodes: FinalNodeRead[]): FinalNodeRead[] {
  const byId = new Map(fullNodes.map((n) => [n.id, n]));
  return rows
    .filter((r) => r.id > 0)
    .map((r) => {
      const base = byId.get(r.id);
      if (!base) {
        throw new Error(`Missing final node ${r.id}`);
      }
      return {
        ...base,
        node_pool_type: r.node_pool_type,
        node_pool_value: r.node_pool_value ?? 0,
      };
    });
}

function toActiveFinalNodesWithPending(
  rows: PoolRow[],
  fullNodes: FinalNodeRead[],
  pending: PoolRow | null
): FinalNodeRead[] {
  const stubs = rows
    .filter((r) => r.id > 0)
    .map((r) => {
      const base = fullNodes.find((n) => n.id === r.id)!;
      return {
        ...base,
        node_pool_type: r.node_pool_type,
        node_pool_value: r.node_pool_value ?? 0,
      };
    });
  if (pending) {
    stubs.push({
      id: 0,
      event_id: 0,
      name: pending.name,
      display_order: 0,
      is_active: true,
      placement_count: 3,
      node_pool_type: pending.node_pool_type,
      node_pool_value: pending.node_pool_value ?? 0,
      prize_allocation_steps: [],
      created_at: '',
    });
  }
  return stubs;
}

const FinalNodePoolRedistributionModal: React.FC<FinalNodePoolRedistributionModalProps> = ({
  isOpen,
  onClose,
  eventId,
  includePendingNewNodeRow = false,
  pipelineMode = false,
  onPipelineContinue,
}) => {
  const queryClient = useQueryClient();

  const { data: eventComplete, isLoading: eventLoading } = useQuery({
    queryKey: ['eventComplete', eventId],
    queryFn: () => EventsAPI.getCompleteEvent(eventId),
    enabled: isOpen && !!eventId,
  });

  const { data: prizeApi } = useQuery({
    queryKey: ['eventPrizeDistribution', eventId],
    queryFn: () => EventsAPI.getEventPrizeDistribution(eventId),
    enabled: isOpen && !!eventId,
  });

  const { data: finalNodes = [] } = useQuery({
    queryKey: ['eventFinalNodes', eventId],
    queryFn: () => EventsAPI.getFinalNodes(eventId),
    enabled: isOpen && !!eventId,
  });

  const approvedCount = prizeApi?.participant_count ?? eventComplete?.current_entries ?? 0;

  const [entryFee, setEntryFee] = useState(0);
  const [houseCutPercentage, setHouseCutPercentage] = useState(0);
  const [houseCutAmount, setHouseCutAmount] = useState(0);
  const [additionalPrizePool, setAdditionalPrizePool] = useState(0);
  const [houseCutUiType, setHouseCutUiType] = useState<'percentage' | 'dollars_per_entry' | 'amount'>(
    'percentage'
  );
  const [lineageFeeMode, setLineageFeeMode] = useState<LineageFeeMode>('flat');
  const [lineagePerGame, setLineagePerGame] = useState(0);
  const [lineageAmount, setLineageAmount] = useState(0);
  const [lineageBilledGames, setLineageBilledGames] = useState<number | null>(null);
  const [duplicateCashingPolicy, setDuplicateCashingPolicy] = useState<DuplicateCashingPolicy>(
    DuplicateCashingPolicy.ALLOW_MULTIPLE
  );
  const [poolRows, setPoolRows] = useState<PoolRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetFromEvent = useCallback(
    (ec: EventComplete) => {
      setEntryFee(ec.entry_fee || 0);
      setHouseCutPercentage(ec.house_cut_percentage || 0);
      setHouseCutAmount(ec.house_cut_amount || 0);
      setAdditionalPrizePool(ec.additional_prize_pool || 0);
      setHouseCutUiType(deriveInitialHouseCutUiType(ec));
      setLineageFeeMode(ec.lineage_fee_mode === 'per_game' ? 'per_game' : 'flat');
      setLineagePerGame(ec.lineage_per_game || 0);
      setLineageAmount(ec.lineage_amount || 0);
      setLineageBilledGames(ec.lineage_billed_games ?? null);
      setDuplicateCashingPolicy(ec.duplicate_cashing_policy || DuplicateCashingPolicy.ALLOW_MULTIPLE);
      setError(null);
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !eventComplete) return;
    resetFromEvent(eventComplete);
  }, [isOpen, eventComplete, resetFromEvent]);

  useEffect(() => {
    if (!isOpen || !eventComplete) return;
    const active = finalNodes.filter((n) => n.is_active);
    const base: PoolRow[] = active.map((n) => ({
      id: n.id,
      name: n.name,
      node_pool_type: n.node_pool_type || 'percentage',
      node_pool_value: n.node_pool_value ?? 100,
    }));
    if (includePendingNewNodeRow) {
      base.push({
        id: -1,
        name: 'New exit node',
        node_pool_type: 'percentage',
        node_pool_value: null,
      });
    }
    setPoolRows(base);
  }, [isOpen, eventComplete, finalNodes, includePendingNewNodeRow]);

  const formatGameCount = configuredGameCount(eventComplete?.rounds);

  const previewPool = useMemo(
    () =>
      computeNetPrizePool(
        entryFee,
        additionalPrizePool,
        houseCutUiType === 'amount' ? 'amount' : houseCutUiType,
        houseCutPercentage,
        houseCutAmount,
        approvedCount,
        lineageFeeMode,
        lineagePerGame,
        lineageAmount,
        formatGameCount,
        lineageBilledGames
      ),
    [
      entryFee,
      additionalPrizePool,
      houseCutUiType,
      houseCutPercentage,
      houseCutAmount,
      approvedCount,
      lineageFeeMode,
      lineagePerGame,
      lineageAmount,
      formatGameCount,
      lineageBilledGames,
    ]
  );

  const validation = useMemo(() => {
    const hasUnknown = poolRows.some(
      (r) =>
        r.node_pool_value === null ||
        r.node_pool_value === undefined ||
        Number.isNaN(Number(r.node_pool_value))
    );
    if (hasUnknown) {
      return {
        ok: false as const,
        error: 'Fill all exit node pool values, or use Auto calculate on a single empty value.',
        warning: null as string | null,
        totalAllocated: 0,
      };
    }
    const pending = poolRows.find((r) => r.id === -1) ?? null;
    const nodes = pending
      ? toActiveFinalNodesWithPending(poolRows, finalNodes, pending)
      : toActiveFinalNodes(poolRows, finalNodes);
    return validateMultiNodePools(nodes, previewPool, approvedCount);
  }, [poolRows, finalNodes, previewPool, approvedCount]);

  const buildEventUpdate = (ec: EventComplete): EventUpdate => {
    const saveData: EventUpdate = {};
    if (entryFee !== (ec.entry_fee || 0)) saveData.entry_fee = entryFee || null;
    if (additionalPrizePool !== (ec.additional_prize_pool || 0)) {
      saveData.additional_prize_pool = additionalPrizePool || null;
    }
    const desiredHouseType: 'percentage' | 'dollars_per_entry' | 'amount' =
      houseCutUiType === 'percentage'
        ? 'percentage'
        : houseCutUiType === 'dollars_per_entry'
          ? 'dollars_per_entry'
          : 'amount';
    const desiredHousePct = desiredHouseType === 'amount' ? 0 : houseCutPercentage;
    const desiredHouseAmt: number | null = desiredHouseType === 'amount' ? houseCutAmount || null : null;
    const serverType = (ec.house_cut_type || 'percentage') as string;
    const serverPct = ec.house_cut_percentage ?? 0;
    const serverAmt = ec.house_cut_amount ?? null;
    const amountClose = (a: number | null | undefined, b: number | null | undefined) =>
      (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-6);
    const houseChanged =
      desiredHouseType !== serverType ||
      Math.abs(desiredHousePct - serverPct) > 1e-6 ||
      !amountClose(desiredHouseAmt, serverAmt);
    if (houseChanged) {
      saveData.house_cut_type = desiredHouseType;
      saveData.house_cut_percentage = desiredHousePct;
      saveData.house_cut_amount = desiredHouseAmt;
    }
    const serverLineageMode = ec.lineage_fee_mode === 'per_game' ? 'per_game' : 'flat';
    const serverBilled = ec.lineage_billed_games ?? null;
    const lineageChanged =
      lineageFeeMode !== serverLineageMode ||
      Math.abs(lineagePerGame - (ec.lineage_per_game ?? 0)) > 1e-6 ||
      Math.abs(lineageAmount - (ec.lineage_amount ?? 0)) > 1e-6 ||
      lineageBilledGames !== serverBilled;
    if (lineageChanged) {
      saveData.lineage_fee_mode = lineageFeeMode;
      saveData.lineage_per_game = lineageFeeMode === 'per_game' ? lineagePerGame : 0;
      saveData.lineage_amount = lineageFeeMode === 'flat' ? lineageAmount : 0;
      saveData.lineage_billed_games = lineageFeeMode === 'per_game' ? lineageBilledGames : null;
    }
    if (duplicateCashingPolicy !== (ec.duplicate_cashing_policy || DuplicateCashingPolicy.ALLOW_MULTIPLE)) {
      saveData.duplicate_cashing_policy = duplicateCashingPolicy;
    }
    return saveData;
  };

  const handleAutoCalculate = () => {
    setError(null);
    const inputs: CrossNodePoolInput[] = poolRows.map((r) => ({
      node_pool_type: r.node_pool_type,
      node_pool_value: r.node_pool_value,
    }));
    const res = autoFillSingleUnknownCrossNode(inputs, previewPool, approvedCount);
    if (!res) {
      setError('Auto calculate needs exactly one empty value, and a solvable split.');
      return;
    }
    setPoolRows((prev) =>
      prev.map((row, idx) =>
        idx === res.index ? { ...row, node_pool_value: res.value } : row
      )
    );
  };

  const updateRow = (index: number, patch: Partial<PoolRow>) => {
    setPoolRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const persist = async (): Promise<PendingNewNodePool | undefined> => {
    if (!eventComplete) throw new Error('Event not loaded');
    setError(null);

    const eventPayload = buildEventUpdate(eventComplete);
    const hasEventChanges = Object.keys(eventPayload).length > 0;

    const pendingRow = poolRows.find((r) => r.id === -1);
    let pendingOut: PendingNewNodePool | undefined;
    if (pendingRow) {
      const v = pendingRow.node_pool_value;
      if (v === null || v === undefined || Number.isNaN(Number(v))) {
        setError('Set pool share for the new exit node.');
        throw new Error('validation');
      }
      pendingOut = {
        node_pool_type: pendingRow.node_pool_type,
        node_pool_value: Number(v),
      };
    }

    if (hasEventChanges) {
      await EventsAPI.updateEvent(eventId, normalizePatchPayload(eventPayload));
    }

    for (const row of poolRows) {
      if (row.id <= 0) continue;
      const orig = finalNodes.find((n) => n.id === row.id);
      if (!orig) continue;
      const changed =
        row.node_pool_type !== (orig.node_pool_type || 'percentage') ||
        Math.abs(Number(row.node_pool_value ?? 0) - (orig.node_pool_value ?? 100)) > 1e-6;
      if (changed) {
        await EventsAPI.updateFinalNode(eventId, row.id, normalizePatchPayload({
          node_pool_type: row.node_pool_type,
          node_pool_value: Number(row.node_pool_value ?? 0),
        }));
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
    await queryClient.invalidateQueries({ queryKey: ['eventPrizeDistribution', eventId] });
    await queryClient.invalidateQueries({ queryKey: ['eventFinalNodes', eventId] });
    await queryClient.invalidateQueries({ queryKey: ['event', eventId] });

    return pendingOut;
  };

  const handlePrimary = async () => {
    if (!eventComplete) return;
    setSaving(true);
    try {
      const pending = await persist();
      if (pipelineMode && onPipelineContinue) {
        onPipelineContinue({ pendingNewNodePool: pending });
      }
      onClose();
    } catch (e) {
      if ((e as Error).message !== 'validation') {
        setError(getErrorMessage(e, 'Could not save prize split.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const initialDollars =
    eventComplete?.house_cut_type === 'dollars_per_entry'
      ? eventComplete.house_cut_percentage || 0
      : undefined;

  const title = 'Change prize pool split';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title={title}
      size="xlarge"
      closeOnOutsideClick={false}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="lightbackground" onClick={() => onClose()} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="darkbackground"
            onClick={() => void handlePrimary()}
            disabled={saving || eventLoading || !eventComplete}
            isLoading={saving}
          >
            {pipelineMode ? 'Continue' : 'Save'}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" message={error} onDismiss={() => setError(null)} className="mb-4" />
      )}
      {!validation.ok && validation.error && (
        <Alert
          variant="warning"
          message={`Prize pool split is not ready for payout calculation: ${validation.error} You can still save and fix later.`}
          className="mb-4"
        />
      )}
      {validation.warning && (
        <Alert variant="warning" message={validation.warning} className="mb-4" />
      )}

      {!eventComplete || eventLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <EventPrizesForm
            embedded
            cardTitle="Prize fund & house cut"
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            houseCutPercentage={houseCutPercentage}
            onHouseCutPercentageChange={setHouseCutPercentage}
            houseCutAmount={houseCutAmount}
            onHouseCutAmountChange={setHouseCutAmount}
            additionalPrizePool={additionalPrizePool}
            onAdditionalPrizePoolChange={setAdditionalPrizePool}
            lineageFeeMode={lineageFeeMode}
            onLineageFeeModeChange={setLineageFeeMode}
            lineagePerGame={lineagePerGame}
            onLineagePerGameChange={setLineagePerGame}
            lineageAmount={lineageAmount}
            onLineageAmountChange={setLineageAmount}
            lineageBilledGames={lineageBilledGames}
            onLineageBilledGamesChange={setLineageBilledGames}
            configuredGameCount={formatGameCount}
            approvedParticipantCount={approvedCount}
            maxEntriesHint={eventComplete.max_entries ?? null}
            initialHouseCutUiType={houseCutUiType}
            initialDollarsPerEntryHouseCut={initialDollars}
            onHouseCutUiTypeChange={setHouseCutUiType}
            eventFormat={eventComplete.event_format}
            teamSize={eventComplete.team_size ?? null}
            duplicateCashingPolicy={duplicateCashingPolicy}
            onDuplicateCashingPolicyChange={setDuplicateCashingPolicy}
          />

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <SectionTitle size="small" className="mb-0">
                Net pool share per exit node
              </SectionTitle>
              <Button type="button" variant="lightbackground" size="small" onClick={handleAutoCalculate}>
                Auto calculate
              </Button>
            </div>
            <p className="text-sm text-text-muted mb-3">
              Net prize pool preview: <strong>${previewPool.toFixed(2)}</strong>
              {poolRows.length > 1 && (
                <>
                  {' '}
                  — percentages must total 100%; mixed $ modes must not exceed the net pool.
                </>
              )}
            </p>
            <div className="space-y-3">
              {poolRows.map((row, idx) => {
                const stub: FinalNodeRead = {
                  id: row.id > 0 ? row.id : 0,
                  event_id: eventId,
                  name: row.name,
                  display_order: 0,
                  is_active: true,
                  placement_count: 3,
                  node_pool_type: row.node_pool_type,
                  node_pool_value: row.node_pool_value ?? 0,
                  prize_allocation_steps: [],
                  created_at: '',
                };
                const slice =
                  poolRows.length <= 1
                    ? previewPool
                    : computeNodeSliceRaw(stub, previewPool, approvedCount);
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start border border-border rounded-md p-3 bg-surface-light"
                  >
                    <div className="sm:col-span-4 min-w-0">
                      <Label>{row.id === -1 ? 'New exit node (draft)' : 'Exit node'}</Label>
                      <p className="text-sm font-medium mt-1">{row.name}</p>
                    </div>
                    <div className="sm:col-span-3 min-w-0 flex flex-col">
                      <Label>Type</Label>
                      <select
                        value={row.node_pool_type}
                        onChange={(e) =>
                          updateRow(idx, {
                            node_pool_type: e.target.value as FinalNodeRead['node_pool_type'],
                          })
                        }
                        className="mt-1 w-full min-h-[42px] rounded-md border border-border bg-surface px-2 py-2 text-sm box-border"
                      >
                        <option value="percentage">% of net pool</option>
                        <option value="dollars_per_entry">$ per approved bowler</option>
                        <option value="amount">Flat $</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3 min-w-0 flex flex-col">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        step={row.node_pool_type === 'percentage' ? 0.1 : 0.01}
                        value={row.node_pool_value === null ? '' : String(row.node_pool_value)}
                        onChange={(e) => {
                          const t = e.target.value.trim();
                          if (t === '') {
                            updateRow(idx, { node_pool_value: null });
                            return;
                          }
                          const n = parseFloat(t);
                          updateRow(idx, { node_pool_value: Number.isNaN(n) ? null : n });
                        }}
                        omitMargin
                        fullWidth
                        className="mt-1 w-full min-h-[42px] box-border"
                      />
                    </div>
                    <div className="sm:col-span-2 min-w-0 text-sm text-text-muted flex flex-col">
                      <Label>Slice preview</Label>
                      <p className="mt-1 font-mono min-h-[42px] flex items-center">${slice.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default FinalNodePoolRedistributionModal;
