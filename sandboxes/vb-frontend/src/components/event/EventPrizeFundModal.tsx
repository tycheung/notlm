import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import EventPrizesForm from './EventPrizesForm';
import SectionTitle from '../common/SectionTitle';
import Label from '../common/Label';
import PrizeAllocationStepsEditor, {
  editableToSteps,
  stepsToEditable,
  type EditableStep,
} from './PrizeAllocationStepsEditor';
import {
  DuplicateCashingPolicy,
  EventComplete,
  EventUpdate,
  type FinalNodeRead,
} from '../../types/event';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import { normalizePatchPayload } from '../../api/payloadNormalization';
import {
  computeNetPrizePool,
  configuredGameCount,
  countActiveFinalNodes,
  effectiveNodeSlice,
} from '../../utils/prizePoolClient';
import type { LineageFeeMode } from '../../utils/prizePoolClient';
import { getPrizeSplitStatusFromEdits } from '../../utils/finalNodePoolValidation';
import { resolvePrizeAllocationSteps } from '../../utils/prizeAllocationResolve';

export interface EventPrizeFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventComplete: EventComplete;
  onSave: (data: EventUpdate) => Promise<unknown>;
}

type NodeEdit = {
  node_pool_type: FinalNodeRead['node_pool_type'];
  node_pool_value: number;
  rows: EditableStep[];
};

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

function buildNodeEdit(n: FinalNodeRead): NodeEdit {
  return {
    node_pool_type: n.node_pool_type || 'percentage',
    node_pool_value: n.node_pool_value ?? 100,
    rows: stepsToEditable(n.prize_allocation_steps || []),
  };
}

const EventPrizeFundModal: React.FC<EventPrizeFundModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventComplete,
  onSave,
}) => {
  const queryClient = useQueryClient();
  const { data: prizeApi } = useQuery({
    queryKey: ['eventPrizeDistribution', eventId],
    queryFn: () => EventsAPI.getEventPrizeDistribution(eventId),
    enabled: isOpen && !!eventId,
  });

  const { data: exitNodes = [] } = useQuery({
    queryKey: ['eventFinalNodes', eventId],
    queryFn: () => EventsAPI.getFinalNodes(eventId),
    enabled: isOpen && !!eventId,
  });

  const exitNodesFingerprint = useMemo(
    () =>
      exitNodes
        .map(
          (n) =>
            `${n.id}:${n.updated_at ?? ''}:${JSON.stringify(n.prize_allocation_steps)}:${n.node_pool_type}:${n.node_pool_value}:${n.placement_count}`
        )
        .join('|'),
    [exitNodes]
  );

  const approvedCount = prizeApi?.participant_count ?? eventComplete.current_entries ?? 0;

  const [entryFee, setEntryFee] = useState(0);
  const [houseCutPercentage, setHouseCutPercentage] = useState(0);
  const [houseCutAmount, setHouseCutAmount] = useState(0);
  const [additionalPrizePool, setAdditionalPrizePool] = useState(0);
  const [houseCutUiType, setHouseCutUiType] = useState<'percentage' | 'dollars_per_entry' | 'amount'>(() =>
    deriveInitialHouseCutUiType(eventComplete)
  );
  const [lineageFeeMode, setLineageFeeMode] = useState<LineageFeeMode>(
    eventComplete.lineage_fee_mode === 'per_game' ? 'per_game' : 'flat'
  );
  const [lineagePerGame, setLineagePerGame] = useState(eventComplete.lineage_per_game || 0);
  const [lineageAmount, setLineageAmount] = useState(eventComplete.lineage_amount || 0);
  const [lineageBilledGames, setLineageBilledGames] = useState<number | null>(
    eventComplete.lineage_billed_games ?? null
  );
  const [duplicateCashingPolicy, setDuplicateCashingPolicy] = useState<DuplicateCashingPolicy>(
    DuplicateCashingPolicy.ALLOW_MULTIPLE
  );
  const [displayPrizeFundPublic, setDisplayPrizeFundPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nodeEdits, setNodeEdits] = useState<Record<number, NodeEdit>>({});

  useEffect(() => {
    if (!isOpen) {
      setNodeEdits({});
      return;
    }
    if (exitNodes.length === 0) {
      setNodeEdits({});
      return;
    }
    const next: Record<number, NodeEdit> = {};
    exitNodes.forEach((n) => {
      next[n.id] = buildNodeEdit(n);
    });
    setNodeEdits(next);
  }, [isOpen, exitNodesFingerprint]);

  const resetFromEvent = useCallback(() => {
    setEntryFee(eventComplete.entry_fee || 0);
    setHouseCutPercentage(eventComplete.house_cut_percentage || 0);
    setHouseCutAmount(eventComplete.house_cut_amount || 0);
    setAdditionalPrizePool(eventComplete.additional_prize_pool || 0);
    setHouseCutUiType(deriveInitialHouseCutUiType(eventComplete));
    setLineageFeeMode(eventComplete.lineage_fee_mode === 'per_game' ? 'per_game' : 'flat');
    setLineagePerGame(eventComplete.lineage_per_game || 0);
    setLineageAmount(eventComplete.lineage_amount || 0);
    setLineageBilledGames(eventComplete.lineage_billed_games ?? null);
    setDuplicateCashingPolicy(
      eventComplete.duplicate_cashing_policy || DuplicateCashingPolicy.ALLOW_MULTIPLE
    );
    setDisplayPrizeFundPublic(Boolean(eventComplete.display_prize_fund_public));
    setError(null);
  }, [eventComplete]);

  useEffect(() => {
    if (isOpen) {
      resetFromEvent();
    }
  }, [isOpen, resetFromEvent, eventComplete.id, eventComplete.updated_at]);

  const formatGameCount = configuredGameCount(eventComplete.rounds);

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

  const activeFinalCount = useMemo(() => countActiveFinalNodes(exitNodes), [exitNodes]);
  const showMultiNodePool = activeFinalCount > 1;

  const buildPayload = (): EventUpdate => {
    const saveData: EventUpdate = {};
    const ec = eventComplete;

    if (entryFee !== (ec.entry_fee || 0)) {
      saveData.entry_fee = entryFee || null;
    }

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
    if (displayPrizeFundPublic !== Boolean(ec.display_prize_fund_public)) {
      saveData.display_prize_fund_public = displayPrizeFundPublic;
    }

    return saveData;
  };

  const getClientValidationWarning = (): string | null => {
    const k = countActiveFinalNodes(exitNodes);
    for (const n of exitNodes) {
      if (!n.is_active) continue;
      const ed = nodeEdits[n.id];
      if (!ed) continue;
      const sliceS = effectiveNodeSlice(
        { ...n, node_pool_type: ed.node_pool_type, node_pool_value: ed.node_pool_value },
        previewPool,
        approvedCount,
        k
      );
      const steps = editableToSteps(ed.rows);
      const { error: rErr } = resolvePrizeAllocationSteps(steps, sliceS, n.placement_count);
      if (rErr) {
        return `${n.name}: ${rErr}`;
      }
    }
    const cross = getPrizeSplitStatusFromEdits(exitNodes, nodeEdits, previewPool, approvedCount);
    if (!cross.ok && cross.error) {
      return `Prize pool split: ${cross.error}`;
    }
    return null;
  };

  const validationWarning = useMemo(
    () => (isOpen ? getClientValidationWarning() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview from edits
    [isOpen, exitNodes, nodeEdits, previewPool, approvedCount]
  );

  const handleSave = async () => {
    setError(null);

    const payload = buildPayload();
    const hasEventChanges = Object.keys(payload).length > 0;

    const exitPatches: {
      id: number;
      body: {
        prize_allocation_steps: ReturnType<typeof editableToSteps>;
        node_pool_type?: FinalNodeRead['node_pool_type'];
        node_pool_value?: number;
      };
    }[] = [];

    for (const n of exitNodes) {
      const ed = nodeEdits[n.id];
      if (!ed) continue;
      const steps = editableToSteps(ed.rows);
      const stepsChanged = JSON.stringify(steps) !== JSON.stringify(n.prize_allocation_steps || []);
      const poolChanged =
        ed.node_pool_type !== (n.node_pool_type || 'percentage') ||
        Math.abs(ed.node_pool_value - (n.node_pool_value ?? 100)) > 1e-6;

      if (stepsChanged || poolChanged) {
        const body: {
          prize_allocation_steps: ReturnType<typeof editableToSteps>;
          node_pool_type: FinalNodeRead['node_pool_type'];
          node_pool_value: number;
        } = { prize_allocation_steps: steps };
        // Always include pool fields to avoid omission-driven stale values.
        body.node_pool_type = ed.node_pool_type;
        body.node_pool_value = ed.node_pool_value;
        exitPatches.push({ id: n.id, body });
      }
    }

    if (!hasEventChanges && exitPatches.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (hasEventChanges) {
        await onSave(normalizePatchPayload(payload));
      }
      for (const p of exitPatches) {
        await EventsAPI.updateFinalNode(eventId, p.id, normalizePatchPayload(p.body));
      }
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventPrizeDistribution', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventFinalNodes', eventId] });
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Could not save prize settings.'));
    } finally {
      setSaving(false);
    }
  };

  const initialDollars =
    eventComplete.house_cut_type === 'dollars_per_entry'
      ? eventComplete.house_cut_percentage || 0
      : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prize fund & payouts"
      size="xlarge"
      closeOnOutsideClick={false}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="lightbackground" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="darkbackground" onClick={() => void handleSave()} isLoading={saving}>
            Save
          </Button>
        </div>
      }
    >
      {validationWarning && (
        <Alert
          variant="warning"
          message={`Prize settings are not ready for payout calculation: ${validationWarning} You can still save and fix later.`}
          className="mb-4"
        />
      )}
      {error && (
        <Alert variant="error" message={error} onDismiss={() => setError(null)} className="mb-4" />
      )}
      {isOpen && (
        <EventPrizesForm
          key={`${eventId}-${eventComplete.updated_at ?? ''}`}
          embedded
          cardTitle="Prize fund"
          entryFee={entryFee}
          onEntryFeeChange={setEntryFee}
          houseCutPercentage={houseCutPercentage}
          onHouseCutPercentageChange={setHouseCutPercentage}
          houseCutAmount={houseCutAmount}
          onHouseCutAmountChange={setHouseCutAmount}
          approvedParticipantCount={approvedCount}
          maxEntriesHint={eventComplete.max_entries ?? null}
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
          initialHouseCutUiType={houseCutUiType}
          initialDollarsPerEntryHouseCut={initialDollars}
          onHouseCutUiTypeChange={setHouseCutUiType}
          eventFormat={eventComplete.event_format}
          teamSize={eventComplete.team_size ?? null}
          duplicateCashingPolicy={duplicateCashingPolicy}
          onDuplicateCashingPolicyChange={setDuplicateCashingPolicy}
        />
      )}

      {isOpen && (
        <div className="mt-4 rounded-lg border border-border p-4 bg-surface-light">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={displayPrizeFundPublic}
              onChange={(e) => setDisplayPrizeFundPublic(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-text">
                Show prize fund to the public
              </span>
              <span className="block text-xs text-text-muted mt-1">
                Off by default. When off, only approved participants (and directors)
                see prize fund and payout dollar amounts. Spectators still see
                placements without money.
              </span>
            </span>
          </label>
        </div>
      )}

      {isOpen && exitNodes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border space-y-6">
          <SectionTitle size="small" className="mb-1">
            Final node payouts
          </SectionTitle>
          <p className="text-sm text-text-muted mb-4">
            {showMultiNodePool
              ? 'Split the net prize pool across final nodes, then define ordered steps per node (fixed $, % of slice, % of remainder, or remainder).'
              : 'With one active final node, the full net pool goes to that node. Configure place payouts below.'}
          </p>
          {exitNodes.map((n) => {
            const ed = nodeEdits[n.id];
            if (!ed) return null;
            const sliceS = effectiveNodeSlice(
              { ...n, node_pool_type: ed.node_pool_type, node_pool_value: ed.node_pool_value },
              previewPool,
              approvedCount,
              activeFinalCount
            );
            return (
              <div key={n.id} className="rounded-lg border border-border p-4 bg-surface-light space-y-4">
                <h4 className="font-semibold text-text">
                  {n.name}{' '}
                  <span className="text-sm font-normal text-text-muted">
                    ({n.placement_count} place{n.placement_count === 1 ? '' : 's'})
                  </span>
                </h4>

                {showMultiNodePool && n.is_active && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Share of net pool</Label>
                      <select
                        value={ed.node_pool_type}
                        onChange={(e) =>
                          setNodeEdits((prev) => ({
                            ...prev,
                            [n.id]: {
                              ...prev[n.id],
                              node_pool_type: e.target.value as FinalNodeRead['node_pool_type'],
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
                      >
                        <option value="percentage">% of net pool</option>
                        <option value="dollars_per_entry">$ per approved bowler</option>
                        <option value="amount">Flat $</option>
                      </select>
                    </div>
                    <div>
                      <Label>Value</Label>
                      <input
                        type="number"
                        step={ed.node_pool_type === 'percentage' ? 0.1 : 0.01}
                        value={ed.node_pool_value}
                        onChange={(e) =>
                          setNodeEdits((prev) => ({
                            ...prev,
                            [n.id]: {
                              ...prev[n.id],
                              node_pool_value: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
                      />
                      <p className="text-xs text-text-muted mt-1">
                        This node&apos;s budget: <strong>${sliceS.toFixed(2)}</strong> (preview)
                      </p>
                    </div>
                  </div>
                )}

                {!showMultiNodePool && n.is_active && (
                  <p className="text-sm text-text-muted">
                    Node slice (preview): <strong>${sliceS.toFixed(2)}</strong> (full net pool)
                  </p>
                )}

                {n.is_active ? (
                  <PrizeAllocationStepsEditor
                    placementCount={n.placement_count}
                    slicePreview={sliceS}
                    rows={ed.rows}
                    onRowsChange={(rows) =>
                      setNodeEdits((prev) => ({
                        ...prev,
                        [n.id]: { ...prev[n.id], rows },
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-text-muted italic">Inactive node — payouts not applied.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOpen && exitNodes.length === 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-text-muted">
            No final nodes yet. Add payout stages from <strong className="text-text">Event Info</strong> to
            configure payouts here.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default EventPrizeFundModal;
