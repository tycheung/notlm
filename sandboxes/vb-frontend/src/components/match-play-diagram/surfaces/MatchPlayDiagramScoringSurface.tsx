import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GamesAPI } from '../../../api/games';
import { RoundMatchSeriesAPI } from '../../../api/round-match-series';
import ConfirmDialog from '../../common/ConfirmDialog';
import type { FormatScoringSurfaceProps } from '../../event-scoring/types';
import { useMatchPlayGameGrid } from '../../event-scoring/visual/useMatchPlayGameGrid';
import type { VisualMatchDraft } from '../../event-scoring/visual/types';
import {
  getDestinationsForParticipant,
  getDestinationsForTeam,
} from '../../../utils/advancementDestinations';
import {
  pickServerCarryPreferredTotal,
  resolvePersistedTeamMemberScore,
  sumCarryScoresFromSourceRound,
} from '../../event-scoring/nonEliminatorScoringUtils';
import MatchDiagramShell from '../shared/MatchDiagramShell';
import MatchBlock from '../shared/MatchBlock';
import { matchNeedsManualWinner } from '../shared/manualWinner';
import { matchBlockPropsFromDiagramMatch } from '../adapters/bracketSingleElim';
import type { DiagramAdapterContext, DiagramMatch, TournamentDiagramModel } from '../adapters/types';
import { diagramMatchesToGridDraft, flattenDiagramMatches } from '../adapters/types';
import { getErrorMessage } from '../../../api/apiErrors';

const TEAM_GAME_INDEX = 1;

export type DiagramBuilder = (ctx: DiagramAdapterContext) => TournamentDiagramModel;

export interface MatchPlayDiagramScoringSurfaceProps extends FormatScoringSurfaceProps {
  buildDiagram: DiagramBuilder;
  emptySeriesMessage?: string;
}

function toVisualMatches(grid: ReturnType<typeof diagramMatchesToGridDraft>): VisualMatchDraft[] {
  return grid.map((m) => ({
    id: m.id,
    seriesId: m.seriesId,
    label: m.sideAName,
    displayOrder: m.displayOrder,
    sideAId: m.sideAId,
    sideBId: m.sideBId,
    sideAName: m.sideAName,
    sideBName: m.sideBName,
    winsA: m.winsA,
    winsB: m.winsB,
    winnerSide: m.winnerSide,
    x: 0,
    y: 0,
  }));
}

const MatchPlayDiagramScoringSurface: React.FC<MatchPlayDiagramScoringSurfaceProps> = (props) => {
  const queryClient = useQueryClient();
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [slotSwapDialog, setSlotSwapDialog] = useState<
    null | { from: { seriesId: number; side: 0 | 1 }; to: { seriesId: number; side: 0 | 1 } }
  >(null);
  const [teamMemberScores, setTeamMemberScores] = useState<
    Record<string, Record<string, number | null>>
  >({});
  const [resolvingSeriesId, setResolvingSeriesId] = useState<number | null>(null);

  const adapterCtx = useMemo(
    (): DiagramAdapterContext => ({
      matchSeries: props.matchSeries,
      roundParticipants: props.roundParticipants,
      allGames: props.allGames,
      isTeamEvent: props.isTeamEvent,
      maxGameCount: Math.max(1, props.gameCount || 1),
      bracketMode: props.bracketMode,
      podSize: props.podSize,
    }),
    [
      props.matchSeries,
      props.roundParticipants,
      props.allGames,
      props.isTeamEvent,
      props.gameCount,
      props.bracketMode,
      props.podSize,
    ]
  );

  const diagramModel = useMemo(() => props.buildDiagram(adapterCtx), [props.buildDiagram, adapterCtx]);
  const flatMatches = useMemo(() => flattenDiagramMatches(diagramModel), [diagramModel]);
  const gridDraft = useMemo(() => diagramMatchesToGridDraft(flatMatches), [flatMatches]);
  const visualMatches = useMemo(() => toVisualMatches(gridDraft), [gridDraft]);

  const { getGameScore, persistGameScore, isSavingGame } = useMatchPlayGameGrid({
    queryClient,
    selectedRoundId: props.selectedRoundId,
    eventId: props.eventId ?? null,
    allGames: props.allGames,
    isTeamEvent: props.isTeamEvent,
    matches: visualMatches,
    onPersistError: (message) => setWarningMessage(message),
  });

  const getAdvancementDestinationsForSide = (sideId: number | null) => {
    if (sideId == null) return [];
    if (props.isTeamEvent) {
      return getDestinationsForTeam(props.advancementDestinationMap, Number(sideId));
    }
    return getDestinationsForParticipant(props.advancementDestinationMap, Number(sideId));
  };

  const enrichMatch = (match: DiagramMatch): DiagramMatch => {
    const carryRels = (props.incomingRelationships || []).filter((r: any) => Boolean(r?.carry_over_enabled));
    const enrichSide = (p: DiagramMatch['participants'][0], sideNum: 0 | 1) => {
      let carryOverValue: number | null = null;
      if (carryRels.length > 0 && p.sideId) {
        const rel = carryRels[0];
        const serverVal = pickServerCarryPreferredTotal(
          props.carryOverTotalsByRelationshipId,
          rel,
          Number(p.sideId),
          props.isTeamEvent
        );
        carryOverValue = sumCarryScoresFromSourceRound(
          props.allGames,
          Number(rel.source_round_id),
          Number(p.sideId),
          props.isTeamEvent,
          serverVal,
          rel
        );
      }
      return {
        ...p,
        carryOverValue,
        advancementDestinations: p.sideId ? getAdvancementDestinationsForSide(p.sideId) : [],
      };
    };
    return {
      ...match,
      participants: [enrichSide(match.participants[0], 0), enrichSide(match.participants[1], 1)],
    };
  };

  const handleScoreChange = (matchId: string, side: 0 | 1, gameIndex: number, value: number | null) => {
    const match = flatMatches.find((m) => m.id === matchId);
    const cell = match?.participants[side]?.scores.find((s) => s.gameIndex === gameIndex);
    if (cell?.disabled) {
      setWarningMessage(
        diagramModel.layout === 'stepladder'
          ? 'Only the current ladder match can be scored. Finish it so the winner can advance.'
          : 'This score cell is locked.'
      );
      return;
    }
    setWarningMessage(null);
    persistGameScore(matchId, side, gameIndex, value);
  };

  const handleSyncStructure = async () => {
    if (!props.selectedRoundId) return;
    setSyncing(true);
    setWarningMessage(null);
    try {
      await RoundMatchSeriesAPI.syncMatchStructure(props.selectedRoundId);
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', props.selectedRoundId] });
      await queryClient.invalidateQueries({ queryKey: ['roundGames', props.selectedRoundId] });
      await queryClient.invalidateQueries({ queryKey: ['squadGames'] });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      setWarningMessage(`Unable to sync match structure (${detail}).`);
    } finally {
      setSyncing(false);
    }
  };

  const handleResolveWinner = async (seriesId: number, side: 0 | 1) => {
    if (!props.selectedRoundId) return;
    setResolvingSeriesId(seriesId);
    setWarningMessage(null);
    try {
      await RoundMatchSeriesAPI.resolveWinner(props.selectedRoundId, seriesId, side);
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', props.selectedRoundId] });
      await queryClient.invalidateQueries({ queryKey: ['roundGames', props.selectedRoundId] });
      await queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      await queryClient.invalidateQueries({ queryKey: ['liveScores'] });
      await queryClient.invalidateQueries({ queryKey: ['eventStandings'] });
    } catch (error) {
      setWarningMessage(getErrorMessage(error, 'Could not set match winner.'));
    } finally {
      setResolvingSeriesId(null);
    }
  };

  const resolveControlsForMatch = (match: DiagramMatch) => {
    const show = matchNeedsManualWinner(match);
    return {
      showResolveWinner: show,
      resolveWinnerPending: resolvingSeriesId === match.seriesId,
      onResolveWinner: show
        ? (side: 0 | 1) => {
            void handleResolveWinner(match.seriesId, side);
          }
        : undefined,
    };
  };

  const seriesNeedsScorePurgeForSwap = (seriesIdA: number, seriesIdB: number) => {
    const sid = new Set([seriesIdA, seriesIdB]);
    for (const g of props.allGames || []) {
      if (sid.has(Number(g.match_series_id ?? g.matchSeriesId ?? 0)) && g.id != null) return true;
    }
    return false;
  };

  const sections = useMemo(
    () =>
      diagramModel.sections?.length
        ? diagramModel.sections
        : [{ key: 'main', label: diagramModel.title, columns: diagramModel.columns }],
    [diagramModel]
  );
  const preferredSectionKey = useMemo(
    () => sections.find((s) => /position/i.test(s.label))?.key ?? sections[0]?.key ?? 'main',
    [sections]
  );
  const activeKey = activeSection ?? preferredSectionKey;
  const active = sections.find((s) => s.key === activeKey) ?? sections[0];
  const activeMatches = useMemo(
    () => active?.columns.flatMap((column) => column.matches) ?? [],
    [active]
  );
  const podsSectionSummary = useMemo(() => {
    if (diagramModel.layout !== 'pods' || activeMatches.length === 0) return null;
    const names = new Set<string>();
    for (const match of activeMatches) {
      for (const participant of match.participants) {
        const name = String(participant.name || '').trim();
        if (name) names.add(name);
      }
    }
    const bowlerCount = names.size;
    const matchCount = activeMatches.length;
    const podLabel = active?.label ?? 'this pod';
    return `${bowlerCount} bowler${bowlerCount === 1 ? '' : 's'} · ${matchCount} head-to-head match${
      matchCount === 1 ? '' : 'es'
    } (all-vs-all within ${podLabel})`;
  }, [diagramModel.layout, activeMatches, active?.label]);

  const confirmBracketSlotSwap = async () => {
    if (!slotSwapDialog || !props.selectedRoundId) return;
    const { from, to } = slotSwapDialog;
    const purge = seriesNeedsScorePurgeForSwap(from.seriesId, to.seriesId);
    try {
      await RoundMatchSeriesAPI.swapSlots(props.selectedRoundId, {
        from_series_id: from.seriesId,
        from_side: from.side,
        to_series_id: to.seriesId,
        to_side: to.side,
        purge_game_scores: purge,
      });
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', props.selectedRoundId] });
      await queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      await queryClient.invalidateQueries({ queryKey: ['roundGames', props.selectedRoundId] });
      setSlotSwapDialog(null);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      setWarningMessage(`Unable to swap bracket slots (${detail}).`);
    }
  };

  const resolveTeamGameId = (matchId: string, side: 0 | 1): number | null => {
    const match = visualMatches.find((m) => m.id === matchId);
    if (!match?.seriesId) return null;
    const sideId = side === 0 ? match.sideAId : match.sideBId;
    if (!sideId) return null;
    const existingGame = props.allGames.find((g: any) => {
      const gameSeriesId = Number(g.match_series_id ?? g.matchSeriesId ?? 0);
      const gameIndex = Number(g.match_game_index ?? g.matchGameIndex ?? 0);
      return (
        gameSeriesId === Number(match.seriesId) &&
        gameIndex === TEAM_GAME_INDEX &&
        Number(g.team_id) === Number(sideId) &&
        Boolean(g.is_team_game)
      );
    });
    return existingGame?.id ? Number(existingGame.id) : null;
  };

  const getTeamMemberScore = (matchId: string, side: 0 | 1, eventParticipantId: number) => {
    const key = `${side}:${eventParticipantId}`;
    const local = teamMemberScores[matchId]?.[key];
    if (local != null) return local;
    const match = visualMatches.find((m) => m.id === matchId);
    if (!match?.seriesId) return null;
    const sideId = side === 0 ? match.sideAId : match.sideBId;
    if (!sideId) return null;
    const parentTeamGame = props.allGames.find((g: any) => {
      const gameSeriesId = Number(g.match_series_id ?? g.matchSeriesId ?? 0);
      const gameIndex = Number(g.match_game_index ?? g.matchGameIndex ?? 0);
      return (
        gameSeriesId === Number(match.seriesId) &&
        gameIndex === TEAM_GAME_INDEX &&
        Number(g.team_id) === Number(sideId) &&
        Boolean(g.is_team_game)
      );
    });
    return resolvePersistedTeamMemberScore(props.allGames, Number(parentTeamGame?.id ?? 0), eventParticipantId);
  };

  const persistTeamMemberScore = async (
    matchId: string,
    side: 0 | 1,
    eventParticipantId: number,
    value: number | null
  ) => {
    if (!props.isTeamEvent || props.isBakerRound || value == null) return;
    const teamGameId = resolveTeamGameId(matchId, side);
    if (!teamGameId) {
      setWarningMessage('Unable to save team member score because no team game shell exists yet.');
      return;
    }
    await GamesAPI.batchTeamMemberScores({
      team_member_scores: [
        {
          team_game_id: teamGameId,
          event_participant_id: eventParticipantId,
          score: value,
          round_id: props.selectedRoundId ?? undefined,
        },
      ],
    });
    if (props.selectedRoundId) {
      await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', props.selectedRoundId] });
    }
  };

  if (props.isLoadingMatchSeries) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-40 rounded bg-surface-light" />
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 w-[230px] shrink-0 rounded-md bg-[#141c2b]" />
          ))}
        </div>
      </div>
    );
  }

  if (props.matchSeries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">
          {props.emptySeriesMessage ??
            'No match series yet. Lock squads or advance entrants to generate the bracket.'}
        </p>
      </div>
    );
  }

  const hasShells = props.allGames.some((g) =>
    props.matchSeries.some((s) => Number(g.match_series_id ?? 0) === s.id)
  );

  const sectionFilterLabel =
    diagramModel.layout === 'pods'
      ? 'Show pod'
      : diagramModel.layout === 'round_robin'
        ? 'Show game'
        : 'Show section';

  const renderTeamMemberInputs = (match: DiagramMatch) => {
    if (!props.isTeamEvent || props.isBakerRound) return null;
    const fields = match.participants.flatMap((participant, sideIdx) =>
      (participant.teamMembers ?? []).map((member) => {
        const epId = Number(member.event_participant_id ?? 0);
        if (!epId) return null;
        const side = sideIdx as 0 | 1;
        return (
          <div key={`${match.id}-${epId}`} className="mt-1 flex items-center gap-2 pl-2">
            <span className="truncate text-xs text-text-muted">
              {member.display_name ?? `Member ${epId}`}
            </span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={`Team member ${member.display_name ?? epId}, game 1`}
              className="w-11 rounded-md border border-border/80 bg-[#141c2b] px-1 py-1 text-center text-xs text-text-muted"
              value={getTeamMemberScore(match.id, side, epId) ?? ''}
              placeholder="—"
              onChange={(e) => {
                const next = e.target.value;
                const parsed = next.trim() === '' ? null : Number(next);
                const val = parsed != null && Number.isFinite(parsed) ? parsed : null;
                const key = `${side}:${epId}`;
                setTeamMemberScores((prev) => ({
                  ...prev,
                  [match.id]: { ...(prev[match.id] || {}), [key]: val },
                }));
                void persistTeamMemberScore(match.id, side, epId, val);
              }}
            />
          </div>
        );
      })
    );
    if (!fields.some(Boolean)) return null;
    return (
      <div key={`${match.id}-members`} className="rounded-lg border border-border/40 bg-surface px-2 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {match.label || match.participants.map((p) => p.name).join(' vs ')}
        </p>
        {fields}
      </div>
    );
  };

  const renderGrid = (matches: DiagramMatch[]) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((raw) => {
        const match = enrichMatch(raw);
        const blockProps = matchBlockPropsFromDiagramMatch(match, {
          onScoreChange: (side, gameIndex, value) =>
            handleScoreChange(match.id, side, gameIndex, value),
          scoreAriaLabel: (side, gameIndex, name) =>
            `Game ${gameIndex}, ${name}, scratch score`,
        });
        return (
          <div key={match.id} className="rounded-lg border border-border/60 bg-surface p-2">
            <MatchBlock {...blockProps} {...resolveControlsForMatch(match)} />
            {renderTeamMemberInputs(match)}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {!hasShells && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3">
          <p className="text-sm text-text-muted">
            Match series exist but game shells are missing. Sync structure after lock-in.
          </p>
          <button
            type="button"
            disabled={syncing || !props.selectedRoundId}
            onClick={() => void handleSyncStructure()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync structure'}
          </button>
        </div>
      )}

      {warningMessage && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-2 text-sm text-danger">
          {warningMessage}
        </div>
      )}

      {props.isBakerRound && props.isTeamEvent && (
        <p className="text-xs text-text-muted">
          Baker scoring: enter one team score (0–300) per match side. Member frames are not recorded; the score still appears on each bowler&apos;s history with a Baker flag and does not affect averages.
        </p>
      )}

      {diagramModel.layout === 'stepladder' && diagramModel.subtitle && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text">
          {diagramModel.subtitle}
        </div>
      )}

      {sections.length > 1 && sections.length <= 8 && (
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                activeKey === s.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface-light text-text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {sections.length > 8 && (
        <label className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {sectionFilterLabel}
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text"
            value={activeKey}
            onChange={(e) => setActiveSection(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {podsSectionSummary ? (
        <p className="text-sm text-text-muted">{podsSectionSummary}</p>
      ) : null}

      {diagramModel.layout === 'grid' || diagramModel.layout === 'pods' ? (
        renderGrid(active?.columns.flatMap((c) => c.matches) ?? [])
      ) : (
        <MatchDiagramShell
          title={active?.label ?? diagramModel.title}
          subtitle={diagramModel.layout === 'stepladder' ? undefined : diagramModel.subtitle}
          columns={(active?.columns ?? []).map((col) => ({
            key: col.key,
            header: col.header,
            matches: col.matches.map((raw) => {
              const match = enrichMatch(raw);
              return {
                key: match.id,
                ...matchBlockPropsFromDiagramMatch(match, {
                  onScoreChange: (side, gameIndex, value) =>
                    handleScoreChange(match.id, side, gameIndex, value),
                  scoreAriaLabel: (side, gameIndex, name) =>
                    `Game ${gameIndex}, ${name}, scratch score`,
                }),
                ...resolveControlsForMatch(match),
              };
            }),
          }))}
          footer={
            diagramModel.rosterChips?.length ? (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
                  Participants
                </p>
                <div className="flex flex-wrap gap-2">
                  {diagramModel.rosterChips.map((chip) => (
                    <span
                      key={chip.seat}
                      className="rounded-full border border-border bg-surface-light px-3 py-1 text-xs text-text"
                    >
                      <span className="font-semibold text-primary">#{chip.seat}</span>{' '}
                      <span className="text-text-muted">{chip.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : undefined
          }
        />
      )}

      {props.isTeamEvent &&
        !props.isBakerRound &&
        diagramModel.layout !== 'grid' &&
        diagramModel.layout !== 'pods' && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(active?.columns ?? [])
              .flatMap((column) => column.matches)
              .map((raw) => renderTeamMemberInputs(enrichMatch(raw)))}
          </div>
        )}

      {isSavingGame && (
        <p className="text-xs text-text-muted" aria-live="polite">
          Saving score…
        </p>
      )}

      <ConfirmDialog
        isOpen={slotSwapDialog != null}
        onClose={() => setSlotSwapDialog(null)}
        onConfirm={() => void confirmBracketSlotSwap()}
        title="Swap bracket slots?"
        message="Are you sure you want to swap these two bracket slots?"
        confirmText="Swap"
        confirmVariant="primary"
      />
    </div>
  );
};

export default MatchPlayDiagramScoringSurface;
