import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import InlineEditableCell from '../common/InlineEditableCell';
import Loading from '../common/Loading';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Expand interface with all passed props
import type { AdvancementDestinationMap } from '../../utils/advancementDestinations';
import { getDestinationsForParticipant } from '../../utils/advancementDestinations';
import {
  buildHandicapEventSettings,
  computeSeriesTotals,
  formatSeriesTotal,
  normalizeAverage,
} from '../../utils/scoringTotals';
import AdvancementDestinationMark from '../event-scoring/AdvancementDestinationMark';
import { resolveLaneLabelForGame } from '../../features/lanes/buildLaneLabelLookup';
import {
  sortScoringParticipants,
  type ScoringParticipantSortOrder,
} from '../../utils/scoringParticipantSort';

interface IndividualScoringProps {
  squadCategories: SquadCategory[];
  gameCount: number;
  advancementDestinationMap: AdvancementDestinationMap;
  onGameScoreChange: (gameId: number, field: keyof GameUpdate, value: any) => void;
  onTemporaryGameScoreChange: (
    metadata: import('../../hooks/useTemporaryGames').TemporaryGameMetadata,
    field: keyof GameUpdate,
    value: any
  ) => string;
  pendingGameChanges: any;
  expandedCategories: any;
  onToggleCategory: (categoryId: string) => void;
  isLoadingSquadParticipants: boolean;
  loadingGames: boolean;
  getCurrentRoundGameCount: () => number;
  getPendingGameValue: (gameId: number | string, field: keyof GameUpdate) => any;
  hasGamePendingChanges: (participantId: number | string) => boolean;
  getParticipantGames: (participantId: number, squadParticipantId?: number) => any[];
  getGameIdForParticipantAndGameNumber: (
    participantId: number,
    gameNumber: number,
    squadParticipantId?: number
  ) => number | null;
  selectedRoundId: number | null;
  squads?: SquadRead[];
  /** When true, Tab moves between score cells per tab mode (requires ScoringTabOrderProvider). */
  enableScoringTabNavigation?: boolean;
  tabMode: import('../../hooks/useScoringTabMode').ScoringTabMode;
  participantSortOrder?: ScoringParticipantSortOrder;
  handicapEnabled?: boolean;
  handicapBaseScore?: number;
  handicapPercentage?: number;
  gameCountAdjustControls?: React.ReactNode;
  laneLabelLookup?: Map<string, string>;
}

// Define local
interface SquadCategory {
  id: string;
  name: string;
  participants: any[];
  scoringSquadId?: number;
  advanceCount?: number;
}

// Import GameUpdate from types
import { GameUpdate } from '../../types/game';
import type { SquadRead } from '../../types/squad';
import { getIndividualTempGameId } from '../../utils/gameTempIds';
import { useScoringTabOrder } from '../../contexts/ScoringTabOrderContext';

function scoreCellIdForParticipant(
  epId: number,
  gameNum: number,
  spId: number | undefined,
  gameId: number | null
): string {
  if (gameId != null) return `score-cell-${gameId}`;
  return getIndividualTempGameId({
    event_participant_id: epId,
    game_number: gameNum,
    squad_participant_id: spId,
  });
}

/** Normalize InlineEditableCell batch values for GameUpdate.score */
function toScoreFieldValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

function formatQualifyingAverage(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

const DualHorizontalScrollTable: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const updateWidth = () => setScrollWidth(content.scrollWidth);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const syncTop = () => {
    if (topRef.current && bottomRef.current) {
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    }
  };

  const syncBottom = () => {
    if (topRef.current && bottomRef.current) {
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
  };

  return (
    <div>
      <div
        ref={topRef}
        className="overflow-x-auto overflow-y-hidden"
        onScroll={syncTop}
        aria-label="Top horizontal scroll"
      >
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div ref={bottomRef} className="overflow-x-auto" onScroll={syncBottom}>
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  );
};

const IndividualScoring: React.FC<IndividualScoringProps> = ({
  squadCategories,
  gameCount,
  advancementDestinationMap,
  onGameScoreChange,
  onTemporaryGameScoreChange,
  expandedCategories,
  onToggleCategory,
  isLoadingSquadParticipants,
  loadingGames,
  getPendingGameValue,
  hasGamePendingChanges,
  getParticipantGames,
  getGameIdForParticipantAndGameNumber,
  selectedRoundId,
  squads = [],
  enableScoringTabNavigation = false,
  tabMode,
  participantSortOrder = 'assignment',
  handicapEnabled = false,
  handicapBaseScore = 200,
  handicapPercentage = 0,
  gameCountAdjustControls,
  laneLabelLookup,
}) => {
  const scoringTabCtx = useScoringTabOrder();

  // Generate game number headers
  const gameNumbers = Array.from({ length: gameCount }, (_, i) => i + 1);

  const sortedSquadCategories = useMemo(
    () =>
      squadCategories.map((category) => ({
        ...category,
        participants: sortScoringParticipants(category.participants, participantSortOrder, {
          laneLabelLookup,
        }),
      })),
    [squadCategories, participantSortOrder, laneLabelLookup]
  );

  const resolveCategorySquadId = (category: SquadCategory): number => {
    if (typeof category.scoringSquadId === 'number' && Number.isFinite(category.scoringSquadId)) {
      return category.scoringSquadId;
    }
    const parsed = parseInt(category.id, 10);
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  const orderedScoreCellIds = useMemo(() => {
    const horizontal: string[] = [];
    const vertical: string[] = [];

    for (const category of sortedSquadCategories) {
      if (!expandedCategories[category.id] || category.id === 'unassigned') continue;
      const squadId = resolveCategorySquadId(category);
      if (Number.isNaN(squadId)) continue;
      if (!squads.some((s) => s.id === squadId && s.locked_in)) continue;

      for (const participant of category.participants) {
        const epId = participant.event_participant_id ?? participant.id;
        const spId = participant.squadParticipantId as number | undefined;
        for (const gameNum of gameNumbers) {
          const gid = getGameIdForParticipantAndGameNumber(epId, gameNum, spId);
          horizontal.push(scoreCellIdForParticipant(epId, gameNum, spId, gid));
        }
      }
    }

    for (const gameNum of gameNumbers) {
      for (const category of sortedSquadCategories) {
        if (!expandedCategories[category.id] || category.id === 'unassigned') continue;
        const squadId = resolveCategorySquadId(category);
        if (Number.isNaN(squadId)) continue;
        if (!squads.some((s) => s.id === squadId && s.locked_in)) continue;
        for (const participant of category.participants) {
          const epId = participant.event_participant_id ?? participant.id;
          const spId = participant.squadParticipantId as number | undefined;
          const gid = getGameIdForParticipantAndGameNumber(epId, gameNum, spId);
          vertical.push(scoreCellIdForParticipant(epId, gameNum, spId, gid));
        }
      }
    }

    return tabMode === 'horizontal' ? horizontal : vertical;
  }, [
    sortedSquadCategories,
    expandedCategories,
    gameNumbers,
    gameCount,
    tabMode,
    getGameIdForParticipantAndGameNumber,
    squads,
  ]);

  useLayoutEffect(() => {
    if (!scoringTabCtx || !enableScoringTabNavigation) return;
    scoringTabCtx.setOrderedCellIds(orderedScoreCellIds);
  }, [scoringTabCtx, enableScoringTabNavigation, orderedScoreCellIds]);

  // Show loading state (after hooks)
  if (isLoadingSquadParticipants || loadingGames) {
    return <Loading size="large" />;
  }

  const handleParticipantScoreChange = (
    squadNumericId: number,
    participant: any,
    gameNum: number,
    score: number | null
  ) => {
    const epId = participant.event_participant_id ?? participant.id;
    const spId = participant.squadParticipantId as number | undefined;
    const existingId = getGameIdForParticipantAndGameNumber(epId, gameNum, spId);
    if (existingId) {
      onGameScoreChange(existingId, 'score', score);
      return;
    }
    if (score === null || score === undefined) return;
    if (!selectedRoundId || !participant.user_id) {
      console.warn('Cannot create game shell: missing round or user_id');
      return;
    }
    onTemporaryGameScoreChange(
      {
        event_participant_id: epId,
        squad_participant_id: spId,
        user_id: participant.user_id,
        game_number: gameNum,
        round_id: selectedRoundId,
        squad_id: squadNumericId,
        is_team_game: false,
      },
      'score',
      score
    );
  };

  const handicapSettings = buildHandicapEventSettings(
    handicapBaseScore,
    handicapPercentage,
    handicapEnabled
  );

  const computeParticipantSeriesTotals = (participant: any) => {
    const epId = participant.event_participant_id ?? participant.id;
    const spId = participant.squadParticipantId;
    const games = getParticipantGames(epId, spId);
    const qualifyingAverage = normalizeAverage(
      participant.qualifying_average ??
        participant.event_participant?.qualifying_average
    );
    const rawHandicap =
      participant.handicap ?? participant.event_participant?.handicap;
    const participantHandicap =
      rawHandicap === null || rawHandicap === undefined
        ? null
        : normalizeAverage(rawHandicap);

    return computeSeriesTotals(games, {
      gameNumbers,
      qualifyingAverage,
      participantHandicap,
      handicapSettings,
      getMergeForGame: (_game, gameNum) => {
        const gameId = getGameIdForParticipantAndGameNumber(epId, gameNum, spId);
        const tempId = getIndividualTempGameId({
          event_participant_id: epId,
          game_number: gameNum,
          squad_participant_id: spId,
        });
        return {
          gameId,
          tempId,
          getPendingGameValue,
        };
      },
    });
  };

  return (
    <div>

      {/* Squad Categories */}
      {sortedSquadCategories.map((category) => {
        const isExpanded = expandedCategories[category.id];
        const squadNumericId = resolveCategorySquadId(category);
        const canScoreInCategory = !Number.isNaN(squadNumericId);
        const squadLockedIn =
          canScoreInCategory &&
          Boolean(squads.find((s) => s.id === squadNumericId)?.locked_in);
        const allowScoreEdits = canScoreInCategory && squadLockedIn;

        return (
          <div key={category.id} className="bg-surface border border-border rounded-lg shadow-sm">
            {/* Squad Header */}
            <div className="px-4 py-3 border-b border-border bg-surface-light">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onToggleCategory(category.id)}
                  className="p-1 hover:bg-surface-light rounded border-0 bg-transparent"
                  style={{ border: 'none', backgroundColor: 'transparent' }}
                >
                  {isExpanded ? (
                    <ExpandMoreIcon className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-text-muted" />
                  )}
                </button>
                <h4 className="font-medium text-text">
                  {category.name} ({category.participants.length} participant{category.participants.length !== 1 ? 's' : ''})
                  {typeof category.advanceCount === 'number' ? (
                    <span className="ml-2 text-xs font-normal text-text-muted">
                      · top {category.advanceCount} advance
                    </span>
                  ) : null}
                  {canScoreInCategory && !squadLockedIn && (
                    <span className="ml-2 text-xs font-normal text-text-muted">
                      Lock this squad on the Squads tab to enter scores.
                    </span>
                  )}
                </h4>
              </div>
            </div>

            {/* Squad Content */}
            {isExpanded && (
              <DualHorizontalScrollTable>
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-light">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                        Qual Avg
                      </th>
                      {gameNumbers.map((gameNum) => (
                        <th key={gameNum} className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                          Game {gameNum}
                        </th>
                      ))}
                      {gameCountAdjustControls ? (
                        <th className="px-1 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider w-10">
                          {gameCountAdjustControls}
                        </th>
                      ) : null}
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                        Total
                      </th>
                      {handicapEnabled && (
                        <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                          Total (Handicap)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {category.participants.map((participant) => {
                      const epId = participant.event_participant_id ?? participant.id;
                      const spId = participant.squadParticipantId;
                      const totals = computeParticipantSeriesTotals(participant);
                      const advancementDestinations = getDestinationsForParticipant(
                        advancementDestinationMap,
                        epId
                      );
                      const hasPendingChanges = gameNumbers.some((gameNum) => {
                        const gid = getGameIdForParticipantAndGameNumber(epId, gameNum, spId);
                        if (gid != null) return hasGamePendingChanges(gid);
                        const tempId = getIndividualTempGameId({
                          event_participant_id: epId,
                          game_number: gameNum,
                          squad_participant_id: spId,
                        });
                        return hasGamePendingChanges(tempId);
                      });

                      return (
                        <tr key={participant.id} className={hasPendingChanges ? 'bg-pending/15' : ''}>
                          {/* Participant Name */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-text">
                                {participant.user_name || participant.user?.name || participant.name || 'Unknown'}
                              </div>
                              <AdvancementDestinationMark destinations={advancementDestinations} />
                              {participant.is_reentry && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Re-entry
                                </span>
                              )}
                              {participant.duplicate_entry && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Duplicate{participant.duplicate_entry_count ? ` x${participant.duplicate_entry_count}` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Qualifying Average */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="text-sm text-text">
                              {formatQualifyingAverage(participant.qualifying_average)}
                            </div>
                          </td>

                          {/* Game Scores */}
                          {gameNumbers.map((gameNum) => {
                            const gameId = getGameIdForParticipantAndGameNumber(
                              epId,
                              gameNum,
                              spId
                            );
                            const participantGames = getParticipantGames(epId, spId);
                            const game = participantGames.find((g: any) => g.game_number === gameNum);
                            const pendingScore = gameId
                              ? getPendingGameValue(gameId, 'score')
                              : undefined;
                            const tempId = getIndividualTempGameId({
                              event_participant_id: epId,
                              game_number: gameNum,
                              squad_participant_id: spId,
                            });
                            const tempPending =
                              getPendingGameValue(tempId, 'score');
                            const cellId = scoreCellIdForParticipant(
                              epId,
                              gameNum,
                              spId,
                              gameId
                            );
                            const laneLabel = resolveLaneLabelForGame(
                              laneLabelLookup,
                              spId,
                              gameNum,
                              game
                            );

                            return (
                              <td key={gameNum} className="px-4 py-3 whitespace-nowrap text-center">
                                {laneLabel ? (
                                  <div className="mb-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                                    Lane {laneLabel}
                                  </div>
                                ) : null}
                                {!allowScoreEdits ? (
                                  <div className="text-sm text-text-dim">—</div>
                                ) : gameId ? (
                                  <InlineEditableCell
                                    type="number"
                                    value={game?.score}
                                    pendingValue={pendingScore}
                                    onChange={(value) =>
                                      onGameScoreChange(gameId, 'score', toScoreFieldValue(value))
                                    }
                                    batchMode={true}
                                    min={0}
                                    max={300}
                                    placeholder="—"
                                    className="w-20 mx-auto"
                                    displayLayout="centered-overlay"
                                    scoringTabCellId={cellId}
                                    enableScoringTabNavigation={enableScoringTabNavigation}
                                  />
                                ) : (
                                  <InlineEditableCell
                                    type="number"
                                    value={
                                      tempPending !== undefined ? tempPending : undefined
                                    }
                                    pendingValue={tempPending}
                                    onChange={(value) => {
                                      const v = toScoreFieldValue(value);
                                      if (v !== null && v !== undefined) {
                                        handleParticipantScoreChange(
                                          squadNumericId,
                                          participant,
                                          gameNum,
                                          v
                                        );
                                      }
                                    }}
                                    batchMode={true}
                                    min={0}
                                    max={300}
                                    placeholder="—"
                                    className="w-20 mx-auto"
                                    displayLayout="centered-overlay"
                                    scoringTabCellId={cellId}
                                    enableScoringTabNavigation={enableScoringTabNavigation}
                                  />
                                )}
                              </td>
                            );
                          })}
                          {gameCountAdjustControls ? (
                            <td className="px-2 py-3" aria-hidden />
                          ) : null}

                          {/* Scratch total (with-handicap series in next column when enabled) */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-text">
                              {formatSeriesTotal(
                                handicapEnabled ? totals.totalScratch : totals.totalWithHandicap,
                                totals.gamesScored
                              )}
                            </div>
                          </td>

                          {handicapEnabled && (
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-text">
                                {formatSeriesTotal(totals.totalWithHandicap, totals.gamesScored)}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DualHorizontalScrollTable>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {squadCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-text-muted text-lg">No squads available for scoring</div>
          <div className="text-text-dim text-sm mt-1">
            Squads will appear here after participants are assigned. Lock each squad on the Squads tab to enter scores.
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualScoring;
