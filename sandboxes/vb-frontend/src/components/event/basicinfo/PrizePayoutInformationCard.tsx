import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SectionTitle from '../../common/SectionTitle';
import Button from '../../common/Button';
import Alert from '../../common/Alert';
import StopIcon from '@mui/icons-material/Stop';
import { cardOuterBase, cardVariantDefault } from '../../common/cardSurface';
import { EventComplete, EventFormat, EventUpdate, type FinalNodeRead } from '../../../types/event';
import { EventsAPI } from '../../../api/events';
import { getPrizeSplitStatusForEvent } from '../../../utils/finalNodePoolValidation';
import {
  configuredGameCount,
  countActiveFinalNodes,
  effectiveNodeSlice,
  lineageGamesForCalc,
  lineageMaxGames,
  poolFromEventComplete,
} from '../../../utils/prizePoolClient';
import EventPrizeFundModal from '../EventPrizeFundModal';
import ReorganizeStandingsEditor, {
  buildStandingsEditorNodes,
} from './ReorganizeStandingsEditor';

interface PrizePayoutInformationCardProps {
  eventId: number;
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: EventUpdate) => Promise<unknown>;
}

const PrizePayoutInformationCard: React.FC<PrizePayoutInformationCardProps> = ({
  eventId,
  eventComplete,
  isAuthorizedToEdit,
  onSave,
}) => {
  const queryClient = useQueryClient();
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [standingsEditMode, setStandingsEditMode] = useState(false);

  const showPrizeFundDetails =
    isAuthorizedToEdit || eventComplete.prize_fund_details_visible === true;

  const { data: prizeDistributionData } = useQuery({
    queryKey: ['eventPrizeDistribution', eventId],
    queryFn: () => EventsAPI.getEventPrizeDistribution(eventId),
    enabled: !!eventId && showPrizeFundDetails,
    retry: false,
  });

  const { data: finalNodes = [] } = useQuery({
    queryKey: ['eventFinalNodes', eventId],
    queryFn: () => EventsAPI.getFinalNodes(eventId),
    enabled: !!eventId,
  });

  const approvedBowlers =
    prizeDistributionData?.participant_count ?? eventComplete.current_entries ?? 0;

  const prizeSplitStatus = useMemo(
    () => getPrizeSplitStatusForEvent(eventComplete, finalNodes as FinalNodeRead[], approvedBowlers),
    [eventComplete, finalNodes, approvedBowlers]
  );
  const activeExitCount = useMemo(
    () => countActiveFinalNodes(finalNodes as FinalNodeRead[]),
    [finalNodes]
  );
  const prizeSettingsValid =
    prizeDistributionData?.prize_settings_valid ??
    eventComplete.prize_settings_valid ??
    (activeExitCount < 1 || prizeSplitStatus.ok);
  const prizeValidationError =
    prizeDistributionData?.prize_validation_error ??
    eventComplete.prize_validation_error ??
    (!prizeSplitStatus.ok ? prizeSplitStatus.error : null);
  const showPrizeSplitInvalid = activeExitCount >= 1 && !prizeSettingsValid;
  const netPrizePool = useMemo(
    () => poolFromEventComplete(eventComplete, approvedBowlers),
    [eventComplete, approvedBowlers]
  );
  const zeroCutNodeIds = useMemo(() => {
    const activeNodes = (finalNodes as FinalNodeRead[]).filter((node) => node.is_active);
    const activeCount = activeNodes.length;
    const zeroCutIds = new Set<string>();
    for (const node of activeNodes) {
      const slice = effectiveNodeSlice(node, netPrizePool, approvedBowlers, activeCount);
      if (slice <= 0) {
        zeroCutIds.add(String(node.id));
      }
    }
    return zeroCutIds;
  }, [finalNodes, netPrizePool, approvedBowlers]);

  const finalNodeNameById = useMemo(() => {
    const m = new Map<string, string>();
    (eventComplete.final_nodes || []).forEach((n) => {
      m.set(String(n.id), n.name);
    });
    (finalNodes as FinalNodeRead[]).forEach((n) => {
      m.set(String(n.id), n.name);
    });
    return m;
  }, [eventComplete.final_nodes, finalNodes]);

  const sortedPlacementsByNode = useMemo(() => {
    const merged = prizeDistributionData?.merged_distribution_by_node;
    if (!merged) return [];

    const orderByNodeId = new Map<string, number>();
    (finalNodes as FinalNodeRead[])
      .filter((n) => n.is_active)
      .forEach((n) => {
        orderByNodeId.set(String(n.id), n.display_order);
      });

    return Object.entries(merged)
      .filter(([, rows]) => Object.keys(rows).length > 0)
      .sort(([nodeIdA], [nodeIdB]) => {
        const oa = orderByNodeId.get(nodeIdA) ?? 0;
        const ob = orderByNodeId.get(nodeIdB) ?? 0;
        if (oa !== ob) return oa - ob;
        return parseInt(nodeIdA, 10) - parseInt(nodeIdB, 10);
      });
  }, [prizeDistributionData?.merged_distribution_by_node, finalNodes]);

  const standingsEditorNodes = useMemo(
    () =>
      buildStandingsEditorNodes(
        finalNodes as FinalNodeRead[],
        prizeDistributionData?.merged_distribution_by_node
      ),
    [finalNodes, prizeDistributionData?.merged_distribution_by_node]
  );

  const invalidateStandingsQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['eventFinalNodes', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['eventPrizeDistribution', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['eventChampionshipResults', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['eventFinalPayouts', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
  }, [queryClient, eventId]);

  const handleStandingsSaved = () => {
    setStandingsEditMode(false);
    invalidateStandingsQueries();
  };

  const lineageIsPerGame = eventComplete.lineage_fee_mode === 'per_game';
  const showLineage =
    showPrizeFundDetails &&
    (lineageIsPerGame
      ? (eventComplete.lineage_per_game ?? 0) > 0
      : (eventComplete.lineage_amount ?? 0) > 0);
  const lineageConfiguredGames = configuredGameCount(eventComplete.rounds);
  const lineageMax = lineageMaxGames(lineageConfiguredGames, approvedBowlers);
  const lineageUsed = lineageGamesForCalc(
    eventComplete.lineage_billed_games,
    lineageConfiguredGames,
    approvedBowlers
  );

  const teamCountApprox =
    eventComplete.event_format === EventFormat.TEAMS &&
    eventComplete.team_size &&
    eventComplete.team_size > 0
      ? Math.floor(approvedBowlers / eventComplete.team_size)
      : null;

  return (
    <>
      <div className={`${cardOuterBase} ${cardVariantDefault}`}>
        <div className="px-3 sm:px-[14px] py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-bold text-text inline-flex items-center gap-1.5">
            {showPrizeFundDetails && showPrizeSplitInvalid && (
              <StopIcon className="w-4 h-4 text-red-500" aria-hidden />
            )}
            Prize &amp; Payout Information
          </h3>
          {isAuthorizedToEdit && (
            <div className="flex flex-wrap items-center gap-2">
              {standingsEditorNodes.length > 0 && (
                <Button
                  variant="lightbackground"
                  size="small"
                  type="button"
                  onClick={() => setStandingsEditMode((v) => !v)}
                  aria-pressed={standingsEditMode}
                >
                  {standingsEditMode ? 'Close reorganize' : 'Reorganize standings'}
                </Button>
              )}
              <Button
                variant="darkbackground"
                size="small"
                type="button"
                title={showPrizeSplitInvalid ? prizeValidationError ?? undefined : undefined}
                aria-label={
                  showPrizeSplitInvalid
                    ? `Invalid prize pool split: ${prizeValidationError ?? ''}`
                    : 'Configure prize fund'
                }
                onClick={() => setPrizeModalOpen(true)}
                className="inline-flex items-center gap-1.5"
              >
                {showPrizeSplitInvalid && (
                  <span className="text-red-300 font-bold leading-none" aria-hidden>
                    !
                  </span>
                )}
                Configure prize fund
              </Button>
            </div>
          )}
        </div>

        <div className="px-3 sm:px-[14px] py-3 sm:py-4 space-y-4 text-text">
          {showPrizeFundDetails && showPrizeSplitInvalid && prizeValidationError && (
            <Alert
              variant="error"
              message={`Prize pool setup is invalid: ${prizeValidationError} Update prize settings in Configure prize fund before calculating final payouts.`}
            />
          )}
          {showPrizeFundDetails && zeroCutNodeIds.size > 0 && (
            <Alert
              variant="warning"
              message="One or more final nodes currently have a $0.00 pool cut (marked with a yellow ! below)."
            />
          )}
          {showPrizeFundDetails ? (
            eventComplete.event_format === EventFormat.TEAMS ? (
              <div className="text-sm text-text-muted space-y-2">
                <p>
                  <strong className="text-text">Fees:</strong> charged <strong>per individual bowler</strong>. Pool
                  math uses each registered bowler ({approvedBowlers} approved).
                </p>
                <p>
                  <strong className="text-text">Prizes:</strong> awarded <strong>per team placement</strong> (1st
                  team, 2nd team, …)—one payout to each finishing team, not per bowler.
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Entry fees are <strong>per bowler</strong>. Configure fees, house cut, lineage, and payouts in the prize fund
                screen — totals use approved registrations ({approvedBowlers} bowler
                {approvedBowlers === 1 ? '' : 's'}).
              </p>
            )
          ) : (
            <p className="text-sm text-text-muted">
              Entry fee is public. Prize fund details (house cut, lineage, add-on pool, and place payouts) are visible to
              participants
              {eventComplete.display_prize_fund_public
                ? ''
                : ', or when the director enables public prize fund display'}
              .
            </p>
          )}

          {showPrizeFundDetails && prizeDistributionData?.duplicate_cashing_policy && (
            <div className="text-sm text-text-muted">
              <strong className="text-text">Duplicate cashing policy:</strong>{' '}
              {prizeDistributionData.duplicate_cashing_policy === 'single_and_promote'
                ? 'Single cash per bowler/team (next eligible placement is promoted)'
                : 'Allow multiple cashing placements per bowler/team'}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SectionTitle size="small" className="mb-1">
                Entry fee (per bowler)
              </SectionTitle>
              <div className="text-lg font-semibold text-text">
                ${eventComplete.entry_fee?.toFixed(2) ?? '0.00'}
              </div>
            </div>
            {eventComplete.event_format === EventFormat.TEAMS &&
              eventComplete.team_size &&
              eventComplete.team_size > 0 &&
              (eventComplete.entry_fee || 0) > 0 && (
                <div>
                  <SectionTitle size="small" className="mb-1">
                    Implied per-team (full roster)
                  </SectionTitle>
                  <div className="text-sm text-text-muted">
                    ~${((eventComplete.entry_fee || 0) * eventComplete.team_size).toFixed(2)} per team if every
                    roster has {eventComplete.team_size} bowlers
                    {teamCountApprox != null && teamCountApprox > 0
                      ? ` (~${teamCountApprox} team${teamCountApprox === 1 ? '' : 's'} from current entries)`
                      : ''}
                    .
                  </div>
                </div>
              )}
          </div>

          {showPrizeFundDetails &&
            eventComplete.additional_prize_pool != null &&
            eventComplete.additional_prize_pool > 0 && (
            <div className="border-t pt-3">
              <SectionTitle size="small" className="mb-2">
                Additional Prize Pool
              </SectionTitle>
              <div className="text-text">
                ${eventComplete.additional_prize_pool.toFixed(2)}
                <span className="text-sm text-text-muted ml-2">(sponsored/additional amount)</span>
              </div>
            </div>
          )}

          {showPrizeFundDetails &&
            (eventComplete.house_cut_percentage > 0 ||
              (eventComplete.house_cut_amount && eventComplete.house_cut_amount > 0)) && (
            <div className="border-t pt-3">
              <SectionTitle size="small" className="mb-2">
                House Cut
              </SectionTitle>
              <div className="text-text">
                {eventComplete.house_cut_type === 'dollars_per_entry'
                  ? `$${eventComplete.house_cut_percentage} per bowler`
                  : eventComplete.house_cut_percentage > 0
                    ? `${eventComplete.house_cut_percentage}% of entry fees`
                    : `$${(eventComplete.house_cut_amount || 0).toFixed(2)} fixed amount`}
              </div>
            </div>
          )}

          {showLineage && (
            <div className="border-t pt-3">
              <SectionTitle size="small" className="mb-2">
                Lineage
              </SectionTitle>
              <div className="text-text">
                {lineageIsPerGame
                  ? `$${(eventComplete.lineage_per_game ?? 0).toFixed(2)} per game × ${lineageUsed} games${
                      lineageUsed !== lineageMax ? ` (max ${lineageMax})` : ''
                    }`
                  : `$${(eventComplete.lineage_amount ?? 0).toFixed(2)} flat total`}
              </div>
            </div>
          )}

          {standingsEditMode && standingsEditorNodes.length > 0 && isAuthorizedToEdit && (
            <ReorganizeStandingsEditor
              eventId={eventId}
              initialNodes={standingsEditorNodes}
              onSaved={handleStandingsSaved}
              onCancel={() => setStandingsEditMode(false)}
            />
          )}

          {showPrizeFundDetails &&
            !standingsEditMode &&
            prizeSettingsValid &&
            sortedPlacementsByNode.length > 0 && (
              <div className="border-t pt-3">
                <SectionTitle size="small" className="mb-2">
                  Championship Placements &amp; Prizes
                </SectionTitle>
                {eventComplete.event_format === EventFormat.TEAMS && (
                  <p className="text-xs text-text-muted mb-2">
                    Each placement is a team; prize amounts are team awards.
                  </p>
                )}
                <div className="space-y-2">
                  {sortedPlacementsByNode.map(([nodeId, rows]) => (
                    <div key={nodeId} className="space-y-2">
                      <SectionTitle size="small" className="inline-flex items-center gap-2">
                        {zeroCutNodeIds.has(nodeId) && (
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold leading-none text-amber-950"
                            aria-label="Warning: this final node has zero prize pool cut"
                            title="This final node currently has a $0.00 prize pool cut"
                          >
                            !
                          </span>
                        )}
                        {finalNodeNameById.get(nodeId) ?? `Exit node ${nodeId}`}
                      </SectionTitle>
                      {Object.entries(rows)
                        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                        .map(([position, row]) => {
                          const winnerName = row.winner?.display_name || 'TBD';
                          const amountText =
                            row.amount != null
                              ? `$${row.amount.toFixed(2)}`
                              : row.percentage != null
                                ? `${row.percentage}%`
                                : row.is_custom_label_only
                                  ? 'Custom payout'
                                  : '—';
                          return (
                            <div
                              key={position}
                              className="rounded border border-border bg-surface-light p-2"
                            >
                              {row.position_label ? (
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">{row.position_label}</span>
                                  <span>{amountText}</span>
                                </div>
                              ) : (
                                <div className="flex justify-end text-sm">
                                  <span>{amountText}</span>
                                </div>
                              )}
                              <div className="text-sm text-text-muted">{winnerName}</div>
                              {row.team_members && row.team_members.length > 0 && (
                                <div className="text-xs text-text-muted mt-1">
                                  Members:{' '}
                                  {row.team_members
                                    .map((m) => m.display_name)
                                    .filter(Boolean)
                                    .join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {showPrizeFundDetails &&
            prizeDistributionData?.duplicate_resolution_by_node &&
            Object.keys(prizeDistributionData.duplicate_resolution_by_node).length > 0 && (
              <div className="border-t pt-3">
                <SectionTitle size="small" className="mb-2">
                  Duplicate Resolution Notes
                </SectionTitle>
                <div className="space-y-1 text-sm text-text-muted">
                  {Object.entries(prizeDistributionData.duplicate_resolution_by_node).flatMap(([nodeId, notes]) =>
                    notes.map((item, idx) => (
                    <div key={`${nodeId}-${item.original_placement || idx}-${idx}`}>
                      Skipped duplicate at original place {item.original_placement ?? '—'} (
                      {item.winner?.display_name || 'unknown winner'}).
                    </div>
                  )))}
                </div>
              </div>
            )}

          {isAuthorizedToEdit &&
            (!eventComplete.entry_fee || eventComplete.entry_fee === 0) &&
            netPrizePool === 0 &&
            (!prizeDistributionData?.merged_distribution_by_node ||
              Object.keys(prizeDistributionData.merged_distribution_by_node).length === 0) && (
              <div className="text-text-muted text-sm italic">
                No entry fee or prize pool yet — use Configure prize fund to set fees, house cut, lineage, and final node
                payouts.
              </div>
            )}
        </div>
      </div>

      {isAuthorizedToEdit && (
        <EventPrizeFundModal
          isOpen={prizeModalOpen}
          onClose={() => setPrizeModalOpen(false)}
          eventId={eventId}
          eventComplete={eventComplete}
          onSave={onSave}
        />
      )}
    </>
  );
};

export default PrizePayoutInformationCard;
