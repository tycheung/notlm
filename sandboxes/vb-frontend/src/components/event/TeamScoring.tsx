import React, { useState, useMemo, useLayoutEffect, useEffect } from 'react';
import InlineEditableCell from '../common/InlineEditableCell';
import Loading from '../common/Loading';
import { GameRead, GameUpdate } from '../../types/game';
import { EventParticipantWithUser } from '../../types/event';
import { SquadRead } from '../../types/squad';
import { TemporaryGameMetadata } from '../../hooks/useTemporaryGames';
import type { AdvancementDestinationMap } from '../../utils/advancementDestinations';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  getDestinationsForParticipant,
  getDestinationsForTeam,
} from '../../utils/advancementDestinations';
import {
  buildHandicapEventSettings,
  computeTeamSeriesTotalsFromMembers,
  formatSeriesTotal,
  sumMemberScratchForTeamGame,
  type TeamMemberSeriesInput,
} from '../../utils/scoringTotals';
import AdvancementDestinationMark from '../event-scoring/AdvancementDestinationMark';
import { getIndividualTempGameId } from '../../utils/gameTempIds';
import { useScoringTabOrder } from '../../contexts/ScoringTabOrderContext';
import type { ScoringTabMode } from '../../hooks/useScoringTabMode';
import type { TeamScoringMode } from '../../hooks/useScoringTabMode';
import { resolveLaneLabelForGame } from '../../features/lanes/buildLaneLabelLookup';
import { resolveDisplayLaneForTeamGame } from '../../utils/bakerLeagueLaneAssignments';
import type { ScoringParticipantSortOrder } from '../../utils/scoringParticipantSort';
import {
  isTeamScoringCategoryLockedIn,
  sortTeamScoringSquadCategories,
} from '../../utils/teamScoringCategories';
import { TeamScoringGameHeaders } from './TeamScoringGameHeaders';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface TeamMember extends EventParticipantWithUser {
  is_captain?: boolean;
  squad_participant_id?: number;
  /** EventParticipant.id when API distinguishes from EventTeamMember.id (member.id) */
  event_participant_id?: number | null;
}

interface TeamParticipant extends EventParticipantWithUser {
  team_name?: string;
  team_number?: number;
  /** Display fallbacks used by some API payloads */
  display_name?: string;
  name?: string;
  members?: TeamMember[];
  is_reentry?: boolean;
}

interface SquadCategory {
  id: string;
  name: string;
  participants: TeamParticipant[];
  scoringSquadId?: number;
  advanceCount?: number;
}

interface TeamScoringProps {
  squadCategories: SquadCategory[];
  gameCount: number;
  advancementDestinationMap: AdvancementDestinationMap;
  onGameScoreChange: (gameId: number, field: keyof GameUpdate, value: number | null) => void;
  onTemporaryGameScoreChange: (metadata: TemporaryGameMetadata, field: keyof GameUpdate, value: number | null) => string;
  pendingGameChanges: Record<number | string, Partial<GameUpdate>>;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (categoryId: string) => void;
  isLoadingSquadParticipants: boolean;
  loadingGames: boolean;
  getCurrentRoundGameCount: () => number;
  getPendingGameValue: (gameId: number | string, field: keyof GameUpdate) => number | null | undefined;
  hasGamePendingChanges: (participantId: number | string) => boolean;
  getParticipantGames: (participantId: number) => GameRead[];
  getGameIdForParticipantAndGameNumber: (participantId: number, gameNumber: number) => number | null;
  getTeamGames?: (teamId: number, gameNumber?: number) => GameRead[];
  getTeamGameIdForTeamAndGameNumber?: (teamId: number, gameNumber: number) => number | null;
  allGames: GameRead[]; // All games including team games
  squads?: SquadRead[]; // Squad data to look up round_id
  tabMode: ScoringTabMode;
  participantSortOrder?: ScoringParticipantSortOrder;
  enableScoringTabNavigation: boolean;
  teamScoringMode: TeamScoringMode;
  /** Baker: one shared team score (0–300); member cells are display-only. */
  isBakerRound?: boolean;
  handicapEnabled?: boolean;
  handicapBaseScore?: number;
  handicapPercentage?: number;
  gameCountAdjustControls?: React.ReactNode;
  laneLabelLookup?: Map<string, string>;
  previewLanesByTeamId?: Map<number, Array<number | null>>;
  standingPlaceByTeamId?: Map<number, number>;
  positionRoundLanePlacement?: string | null;
  pairsInPlay?: Array<[number, number]> | null;
  /** Match-play bonus pins column when round config awards win/tie/loss. */
  bonusPinsEnabled?: boolean;
  bonusPinsByTeamId?: Map<number, number> | Record<number, number>;
  /** League RR: round id for in-scoring position-round lock. */
  selectedRoundId?: number | null;
  eventId?: number | null;
  /** League RR: 1-based position round game from format config. */
  positionRoundGame?: number | null;
}

import {
  DualHorizontalScrollTable,
  buildTeamMemberSeriesInput,
  calculateTeamQualifyingTotal,
  formatQualifyingAverage,
  getScoringParticipantId,
  getTeamCaptainName,
  lookupBonusPins,
  resolveRoundAndSquadForTeam,
  teamTempGameId,
  toScoreFieldValue,
} from './teamScoringHelpers';

const TeamScoring: React.FC<TeamScoringProps> = ({
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
  getTeamGames,
  getTeamGameIdForTeamAndGameNumber,
  allGames,
  squads = [],
  tabMode,
  participantSortOrder = 'assignment',
  enableScoringTabNavigation,
  teamScoringMode,
  isBakerRound = false,
  handicapEnabled = false,
  handicapBaseScore = 200,
  handicapPercentage = 0,
  gameCountAdjustControls,
  laneLabelLookup,
  previewLanesByTeamId,
  standingPlaceByTeamId,
  positionRoundLanePlacement = null,
  pairsInPlay = null,
  bonusPinsEnabled = false,
  bonusPinsByTeamId,
  selectedRoundId = null,
  eventId = null,
  positionRoundGame = null,
}) => {
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const scoringTabCtx = useScoringTabOrder();
  const gameNumbers = Array.from({ length: gameCount }, (_, i) => i + 1);

  const sortedSquadCategories = useMemo(
    () =>
      sortTeamScoringSquadCategories(squadCategories, participantSortOrder, {
        laneLabelLookup,
        previewLanesByTeamId,
      }),
    [squadCategories, participantSortOrder, laneLabelLookup, previewLanesByTeamId]
  );

  const positionGameAlreadyScored = useMemo(() => {
    if (positionRoundGame == null) return false;
    return allGames.some(
      (g) =>
        Number(g.game_number) === Number(positionRoundGame) &&
        g.score != null &&
        Number.isFinite(Number(g.score))
    );
  }, [allGames, positionRoundGame]);

  const isSquadCategoryLockedIn = (category: SquadCategory): boolean =>
    isTeamScoringCategoryLockedIn(category, squads);

  // Toggle team expansion
  const toggleTeamExpansion = (teamId: number) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const allTeamIds = useMemo(
    () =>
      squadCategories
        .filter((category) => expandedCategories[category.id] && category.id !== 'unassigned')
        .flatMap((category) => category.participants.map((team) => team.id)),
    [squadCategories, expandedCategories]
  );

  const allTeamsExpanded = useMemo(
    () => allTeamIds.length > 0 && allTeamIds.every((id) => expandedTeams.has(id)),
    [allTeamIds, expandedTeams]
  );

  const toggleAllTeamsExpanded = () => {
    if (allTeamIds.length === 0) return;
    if (allTeamsExpanded) {
      setExpandedTeams(new Set<number>());
      return;
    }
    setExpandedTeams(new Set<number>(allTeamIds));
  };

  // Baker: keep a clean teams × games sheet (members stay collapsed).
  useEffect(() => {
    if (isBakerRound || allTeamIds.length === 0) return;
    setExpandedTeams((prev) => {
      if (prev.size > 0) return prev;
      return new Set<number>(allTeamIds);
    });
  }, [allTeamIds, isBakerRound]);

  // Get team game ID for a specific team and game number
  // Use provided helper if available, otherwise fallback to searching allGames
  const getTeamGameIdForTeamAndGameNumberLocal = (teamId: number, gameNumber: number): number | null => {
    if (getTeamGameIdForTeamAndGameNumber) {
      return getTeamGameIdForTeamAndGameNumber(teamId, gameNumber);
    }
    // Fallback to searching allGames
    const teamGame = allGames.find((game) => 
      game.team_id === teamId && 
      game.game_number === gameNumber && 
      game.is_team_game === true
    );
    return teamGame ? teamGame.id : null;
  };

  const isTeamScoreStagedOrExists = (teamId: number, gameNumber: number): boolean => {
    const teamGameId = getTeamGameIdForTeamAndGameNumberLocal(teamId, gameNumber);
    if (teamGameId) {
      const pendingTeamScore = getPendingGameValue(teamGameId, 'score');
      if (pendingTeamScore !== undefined && pendingTeamScore !== null) {
        return true;
      }
      const teamGame = allGames.find((g) => g.id === teamGameId);
      if (teamGame && teamGame.score !== null && teamGame.score !== undefined) {
        return true;
      }
    }
    const tempPending = getPendingGameValue(teamTempGameId(teamId, gameNumber), 'score');
    return tempPending !== undefined && tempPending !== null;
  };

  const handleTeamScoreChange = (
    team: TeamParticipant,
    categoryId: string,
    gameNumber: number,
    score: number | null
  ) => {
    const existingId = getTeamGameIdForTeamAndGameNumberLocal(team.id, gameNumber);
    if (existingId) {
      onGameScoreChange(existingId, 'score', score);
      return;
    }
    if (score === null || score === undefined) return;
    const captain =
      (team.members || []).find((m) => m.is_captain) || team.members?.[0] || null;
    const userId = captain?.user_id ?? team.user_id;
    if (!userId) {
      console.warn('Cannot create team game shell: missing user_id', team);
      return;
    }
    const { roundId, squadId } = resolveRoundAndSquadForTeam(
      team.id,
      squadCategories,
      squads,
      allGames,
      undefined
    );
    const squadFromCategory =
      categoryId !== 'unassigned' ? parseInt(categoryId, 10) : NaN;
    const resolvedSquadId =
      squadId ?? (!Number.isNaN(squadFromCategory) ? squadFromCategory : undefined);
    if (!roundId) {
      console.warn('Cannot create team game shell: missing round_id', team);
      return;
    }
    onTemporaryGameScoreChange(
      {
        event_participant_id: captain
          ? getScoringParticipantId(captain)
          : Number(team.id),
        squad_participant_id: captain?.squad_participant_id,
        team_id: team.id,
        user_id: userId,
        game_number: gameNumber,
        round_id: roundId,
        squad_id: resolvedSquadId,
        is_team_game: true,
      },
      'score',
      score
    );
  };
  const memberIndividualTotalForGame = (
    team: TeamParticipant,
    gameNum: number
  ): number => {
    return (team.members || []).reduce((total: number, member: TeamMember) => {
      const pid = getScoringParticipantId(member);
      const memberGames = getParticipantGames(pid);
      const memberGame = memberGames.find((g) => g.game_number === gameNum);
      const memberGameId = getGameIdForParticipantAndGameNumber(pid, gameNum);
      const memberPendingScore = memberGameId
        ? getPendingGameValue(memberGameId, 'score')
        : undefined;
      const scoreToUse =
        memberPendingScore !== undefined
          ? memberPendingScore
          : memberGame?.score || 0;
      return total + (scoreToUse || 0);
    }, 0);
  };
  const orderedScoreCellIds = useMemo(() => {
    const horizontal: string[] = [];
    for (const category of sortedSquadCategories) {
      if (!expandedCategories[category.id] || category.id === 'unassigned') continue;
      if (!isSquadCategoryLockedIn(category)) continue;
      for (const team of category.participants) {
        const isTeamExpanded = expandedTeams.has(team.id);
        // Horizontal mode should move across games first for a row.
        // For individual rows this means: one member's game1..gameN before next member.
        for (const gameNum of gameNumbers) {
          const teamScoreExists = isTeamScoreStagedOrExists(team.id, gameNum);
          const individualGameTotal = memberIndividualTotalForGame(team, gameNum);
          const hasIndividualScoresForGame =
            individualGameTotal > 0 && !teamScoreExists;
          const allowTeamCellInMode =
            teamScoringMode === 'team' ||
            (teamScoringMode === 'mixed' && !hasIndividualScoresForGame);
          if (allowTeamCellInMode) {
            const teamGameId = getTeamGameIdForTeamAndGameNumberLocal(
              team.id,
              gameNum
            );
            horizontal.push(
              teamGameId
                ? `score-cell-${teamGameId}`
                : `score-cell-${teamTempGameId(team.id, gameNum)}`
            );
          }
        }
        if (!isTeamExpanded || !team.members || team.members.length === 0) continue;
        for (const member of team.members) {
          const pid = getScoringParticipantId(member);
          for (const gameNum of gameNumbers) {
            const allowMemberCellsInMode =
              teamScoringMode === 'individual' ||
              (teamScoringMode === 'mixed' &&
                !isTeamScoreStagedOrExists(team.id, gameNum));
            if (!allowMemberCellsInMode) continue;
            const gameId = getGameIdForParticipantAndGameNumber(pid, gameNum);
            horizontal.push(
              gameId
                ? `score-cell-${gameId}`
                : getIndividualTempGameId({
                    event_participant_id: pid,
                    game_number: gameNum,
                    squad_participant_id: member.squad_participant_id,
                  })
            );
          }
        }
      }
    }
    const vertical: string[] = [];
    for (const gameNum of gameNumbers) {
      for (const category of sortedSquadCategories) {
        if (!expandedCategories[category.id] || category.id === 'unassigned')
          continue;
        if (!isSquadCategoryLockedIn(category)) continue;
        for (const team of category.participants) {
          const isTeamExpanded = expandedTeams.has(team.id);
          const teamScoreExists = isTeamScoreStagedOrExists(team.id, gameNum);
          const individualGameTotal = memberIndividualTotalForGame(team, gameNum);
          const hasIndividualScoresForGame =
            individualGameTotal > 0 && !teamScoreExists;
          const allowTeamCellInMode =
            teamScoringMode === 'team' ||
            (teamScoringMode === 'mixed' && !hasIndividualScoresForGame);
          if (allowTeamCellInMode) {
            const teamGameId = getTeamGameIdForTeamAndGameNumberLocal(
              team.id,
              gameNum
            );
            vertical.push(
              teamGameId
                ? `score-cell-${teamGameId}`
                : `score-cell-${teamTempGameId(team.id, gameNum)}`
            );
          }
          const allowMemberCellsInMode =
            teamScoringMode === 'individual' ||
            (teamScoringMode === 'mixed' && !isTeamScoreStagedOrExists(team.id, gameNum));
          if (
            isTeamExpanded &&
            team.members &&
            team.members.length > 0 &&
            allowMemberCellsInMode
          ) {
            for (const member of team.members) {
              const pid = getScoringParticipantId(member);
              const gameId = getGameIdForParticipantAndGameNumber(pid, gameNum);
              vertical.push(
                gameId
                  ? `score-cell-${gameId}`
                  : getIndividualTempGameId({
                      event_participant_id: pid,
                      game_number: gameNum,
                      squad_participant_id: member.squad_participant_id,
                    })
              );
            }
          }
        }
      }
    }
    return tabMode === 'horizontal' ? horizontal : vertical;
  }, [
    sortedSquadCategories,
    expandedCategories,
    expandedTeams,
    gameNumbers,
    gameCount,
    tabMode,
    allGames,
    getPendingGameValue,
    getParticipantGames,
    getGameIdForParticipantAndGameNumber,
    getTeamGameIdForTeamAndGameNumber,
    teamScoringMode,
    squads,
  ]);
  useLayoutEffect(() => {
    if (!scoringTabCtx || !enableScoringTabNavigation) return;
    scoringTabCtx.setOrderedCellIds(orderedScoreCellIds);
  }, [
    scoringTabCtx,
    enableScoringTabNavigation,
    orderedScoreCellIds,
  ]);
  // Handle individual score change - use temporary game shell if game doesn't exist
  const handleIndividualScoreChange = (teamId: number, gameNumber: number, memberId: number, member: TeamMember, score: number) => {
    // Check if individual game already exists
    const existingGameId = getGameIdForParticipantAndGameNumber(memberId, gameNumber);
    if (existingGameId) {
      // Game exists, just stage the score change
      onGameScoreChange(existingGameId, 'score', score);
      return;
    }
    // Game doesn't exist, create temporary game shell
    // Find the team game to get squad info - use helper if available
    let teamGame: GameRead | undefined = undefined;
    if (getTeamGames) {
      const teamGames = getTeamGames(teamId, gameNumber);
      teamGame = teamGames.length > 0 ? teamGames[0] : undefined;
    } else {
      // Fallback to searching allGames
      teamGame = allGames.find((game) => 
        game.team_id === teamId && 
        game.game_number === gameNumber && 
        game.is_team_game === true
      );
    }
    const { roundId, squadId } = resolveRoundAndSquadForTeam(
      teamId,
      squadCategories,
      squads,
      allGames,
      teamGame
    );
    if (!roundId) {
      console.error(
        `Cannot create temporary game shell: cannot determine round_id for team ${teamId}, game ${gameNumber}`,
        { teamGame, squadId }
      );
      return;
    }
    if (!member.user_id) {
      console.error('Cannot create temporary game shell: member has no user_id', member);
      return;
    }
    // Stage parent team game shell when none exists yet (batch save creates it before member scores).
    if (!teamGame) {
      onTemporaryGameScoreChange(
        {
          event_participant_id: memberId,
          squad_participant_id: member.squad_participant_id,
          team_id: teamId,
          user_id: member.user_id,
          game_number: gameNumber,
          round_id: roundId,
          squad_id: squadId ?? undefined,
          is_team_game: true,
        },
        'score',
        null
      );
    }
    onTemporaryGameScoreChange(
      {
        event_participant_id: memberId,
        squad_participant_id: member.squad_participant_id,
        team_id: teamId,
        user_id: member.user_id,
        team_game_id: teamGame?.id,
        game_number: gameNumber,
        round_id: roundId,
        squad_id: squadId ?? undefined,
        is_team_game: false,
      },
      'score',
      score
    );
  };
  const captainDisplayName = getTeamCaptainName;
  const handicapSettings = buildHandicapEventSettings(
    handicapBaseScore,
    handicapPercentage,
    handicapEnabled
  );
  const memberSeriesInput = (member: TeamMember): TeamMemberSeriesInput =>
    buildTeamMemberSeriesInput(member, {
      handicapSettings,
      getParticipantGames,
      getGameIdForParticipantAndGameNumber,
      getPendingGameValue,
    });
  const buildTeamMemberSeriesInputs = (team: TeamParticipant): TeamMemberSeriesInput[] =>
    (team.members || []).map((member) => memberSeriesInput(member));
  const computeMemberSeriesTotals = (member: TeamMember) =>
    computeTeamSeriesTotalsFromMembers([memberSeriesInput(member)], gameNumbers);
  /** Handicap / total columns always sum members using event qual-avg (never team-game rows). */
  const computeTeamSeriesTotals = (team: TeamParticipant) =>
    computeTeamSeriesTotalsFromMembers(buildTeamMemberSeriesInputs(team), gameNumbers);
  if (isLoadingSquadParticipants || loadingGames) {
    return <Loading size="large" />;
  }
  return (
    <div>
      {/* Squad Categories */}
      {sortedSquadCategories.map((category) => {
        const isExpanded = expandedCategories[category.id];
        const squadScoringEnabled = isSquadCategoryLockedIn(category);
        return (
          <div key={category.id} className="bg-surface border border-border rounded-lg shadow-sm">
            {/* Squad Header */}
            <div className="px-4 py-3 border-b border-border bg-surface-light">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onToggleCategory(category.id)}
                  className="p-1 hover:bg-surface rounded border-0 bg-transparent"
                  style={{ border: 'none', backgroundColor: 'transparent' }}
                >
                  {isExpanded ? (
                    <ExpandMoreIcon className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-text-muted" />
                  )}
                </button>
                <h4 className="font-medium text-text">
                  {category.name} ({category.participants.length} team{category.participants.length !== 1 ? 's' : ''})
                  {typeof category.advanceCount === 'number' ? (
                    <span className="ml-2 text-xs font-normal text-text-muted">
                      · top {category.advanceCount} advance
                    </span>
                  ) : null}
                  {category.id !== 'unassigned' && !squadScoringEnabled && (
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
                  <thead className="bg-primary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>Team / Member</span>
                          {allTeamIds.length > 0 && (
                            <button
                              onClick={toggleAllTeamsExpanded}
                              className={`inline-flex shrink-0 items-center justify-center w-7 h-7 text-text bg-surface/25 hover:bg-surface/40 border border-border/60 rounded-md transition-colors duration-150 ${allTeamsExpanded ? 'ring-1 ring-border/80' : ''}`}
                              type="button"
                              aria-label={
                                allTeamsExpanded ? 'Collapse all teams' : 'Show all team members'
                              }
                              title={
                                allTeamsExpanded ? 'Collapse all teams' : 'Show all team members'
                              }
                            >
                              {allTeamsExpanded ? (
                                <RemoveIcon className="w-4 h-4" aria-hidden />
                              ) : (
                                <AddIcon className="w-4 h-4" aria-hidden />
                              )}
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider">
                        Qual. Avg
                      </th>
                      <TeamScoringGameHeaders
                        gameNumbers={gameNumbers}
                        positionRoundGame={positionRoundGame}
                        selectedRoundId={selectedRoundId}
                        eventId={eventId}
                        positionGameAlreadyScored={positionGameAlreadyScored}
                        gameCountAdjustControls={gameCountAdjustControls}
                        bonusPinsEnabled={bonusPinsEnabled}
                        handicapEnabled={handicapEnabled}
                      />
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {category.participants.map((team) => {
                      const hasTeamPendingChanges = hasGamePendingChanges(team.id);
                      const isTeamExpanded = expandedTeams.has(team.id);
                      const captainName = captainDisplayName(team);
                      const teamSeriesTotals = computeTeamSeriesTotals(team);
                      const teamAdvancementDestinations = getDestinationsForTeam(
                        advancementDestinationMap,
                        team.id
                      );

                      return (
                        <React.Fragment key={team.id}>
                          {/* Team Row */}
                          <tr className={`${hasTeamPendingChanges ? 'bg-pending/15' : 'bg-accent/10'} border-b-2 border-accent/40`}>
                            {/* Team Name with Captain and Scoring Mode Toggle */}
                          <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleTeamExpansion(team.id)}
                                  className="p-1 hover:bg-surface-light rounded border-0 bg-transparent"
                                  style={{ border: 'none', backgroundColor: 'transparent' }}
                                >
                                  {isTeamExpanded ? (
                                    <ExpandMoreIcon className="h-4 w-4 text-text-muted" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-text-muted" />
                                  )}
                                </button>
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <div className="text-sm font-bold text-text flex items-center">
                                    {team.team_name || team.display_name || team.name || `Team ${team.team_number}` || 'Unknown Team'}
                                    {captainName && ` - ${captainName}`}
                                    <span className="ml-2 text-xs font-normal text-text-muted">
                                      ({team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''})
                                    </span>
                                    <AdvancementDestinationMark destinations={teamAdvancementDestinations} />
                                  </div>
                                  {team.is_reentry && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/25 text-accent">
                                      Re-entry
                                    </span>
                                  )}
                                  {team.duplicate_entry && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                      Duplicate{team.duplicate_entry_count ? ` x${team.duplicate_entry_count}` : ''}
                                    </span>
                                  )}
                                </div>
                            </div>
                          </td>

                            {/* Team Qualifying Average */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-text">
                                {(() => {
                                  const total = calculateTeamQualifyingTotal(team.members);
                                  return total == null ? '—' : total.toFixed(1);
                                })()}
                              </div>
                            </td>

                            {/* Team Game Scores */}
                            {gameNumbers.map((gameNum) => {
                              // For team scoring, use the actual team game ID
                              const teamGameId = getTeamGameIdForTeamAndGameNumberLocal(team.id, gameNum);
                              const teamGame = teamGameId ? allGames.find((g: any) => g.id === teamGameId) : null;
                              const tempId = teamTempGameId(team.id, gameNum);
                              const pendingScore = teamGameId
                                ? getPendingGameValue(teamGameId, 'score')
                                : getPendingGameValue(tempId, 'score');
                              const scoreCellId = teamGameId
                                ? `score-cell-${teamGameId}`
                                : `score-cell-${tempId}`;

                              // Check if team score is staged or exists
                              const teamScoreExists = isTeamScoreStagedOrExists(team.id, gameNum);

                              const memberInputs = buildTeamMemberSeriesInputs(team);
                              const individualGameTotal = sumMemberScratchForTeamGame(memberInputs, gameNum);

                              const hasIndividualScoresForGame = individualGameTotal > 0 && !teamScoreExists;
                              const isTeamEntryAllowed = teamScoringMode !== 'individual';
                              const shouldShowCalculatedTeamTotal =
                                !isTeamEntryAllowed ||
                                (teamScoringMode === 'mixed' && hasIndividualScoresForGame);

                              return (
                                <td key={gameNum} className="px-4 py-3 whitespace-nowrap text-center">
                                  {(() => {
                                    const displayLane = resolveDisplayLaneForTeamGame({
                                      teamId: team.id,
                                      gameNumber: gameNum,
                                      teamGame,
                                      previewLanesByTeamId,
                                      standingPlace: standingPlaceByTeamId?.get(team.id) ?? null,
                                      positionRoundGame,
                                      positionRoundLanePlacement,
                                      pairsInPlay,
                                      roundId: selectedRoundId,
                                      teamCount: allTeamIds.length,
                                    });
                                    const laneLabel =
                                      displayLane != null
                                        ? String(displayLane)
                                        : resolveLaneLabelForGame(
                                            laneLabelLookup,
                                            null,
                                            gameNum,
                                            teamGame
                                          );
                                    return laneLabel ? (
                                      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                                        Lane {laneLabel}
                                      </div>
                                    ) : null;
                                  })()}
                                  {!squadScoringEnabled ? (
                                    <div className="text-sm text-text-dim">—</div>
                                  ) : shouldShowCalculatedTeamTotal ? (
                                    <div
                                      className={`text-sm font-bold tabular-nums ${
                                        !isTeamEntryAllowed ? 'text-text-muted' : 'text-text'
                                      }`}
                                    >
                                      {individualGameTotal > 0 ? individualGameTotal : '—'}
                                    </div>
                                  ) : teamGameId ? (
                                      <InlineEditableCell
                                        type="number"
                                        value={teamGame?.score}
                                        pendingValue={pendingScore}
                                        disabled={!squadScoringEnabled}
                                        onChange={(value) => {
                                          onGameScoreChange(teamGameId, 'score', toScoreFieldValue(value));
                                        }}
                                        batchMode={true}
                                        min={0}
                                        max={isBakerRound ? 300 : (() => {
                                          // Calculate max based on team member count
                                          // If team.members doesn't exist or is empty, default to 300 (single member equivalent)
                                          const memberCount = team.members?.length ?? 0;
                                          return memberCount > 0 ? 300 * memberCount : 300;
                                        })()}
                                        placeholder="—"
                                        className="w-20 mx-auto font-bold"
                                        displayLayout="centered-overlay"
                                        scoringTabCellId={scoreCellId}
                                        enableScoringTabNavigation={enableScoringTabNavigation}
                                      />
                                    ) : (
                                      <InlineEditableCell
                                        type="number"
                                        value={
                                          pendingScore !== undefined ? pendingScore : undefined
                                        }
                                        pendingValue={pendingScore}
                                        disabled={!squadScoringEnabled}
                                        onChange={(value) => {
                                          const v = toScoreFieldValue(value);
                                          if (v !== null && v !== undefined) {
                                            handleTeamScoreChange(team, category.id, gameNum, v);
                                          }
                                        }}
                                        batchMode={true}
                                        min={0}
                                        max={isBakerRound ? 300 : (() => {
                                          const memberCount = team.members?.length ?? 0;
                                          return memberCount > 0 ? 300 * memberCount : 300;
                                        })()}
                                        placeholder="—"
                                        className="w-20 mx-auto font-bold"
                                        displayLayout="centered-overlay"
                                        scoringTabCellId={scoreCellId}
                                        enableScoringTabNavigation={enableScoringTabNavigation}
                                      />
                                    )}
                                </td>
                              );
                            })}
                            {gameCountAdjustControls ? (
                              <td className="px-2 py-3" aria-hidden />
                            ) : null}

                            {/* Team scratch total (handicap series shown in next column) */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-text">
                                {formatSeriesTotal(
                                  handicapEnabled
                                    ? teamSeriesTotals.totalScratch
                                    : teamSeriesTotals.totalWithHandicap,
                                  teamSeriesTotals.gamesScored
                                )}
                              </div>
                            </td>

                            {bonusPinsEnabled && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-bold text-text tabular-nums">
                                  {lookupBonusPins(bonusPinsByTeamId, team.id) || '—'}
                                </div>
                              </td>
                            )}

                            {handicapEnabled && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-bold text-text">
                                  {formatSeriesTotal(
                                    teamSeriesTotals.totalWithHandicap,
                                    teamSeriesTotals.gamesScored
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>

                          {/* Team Members - Only show if expanded */}
                          {isTeamExpanded && team.members && team.members.length > 0 && (
                            <>
                              {team.members.map((member: TeamMember) => {
                                const pid = getScoringParticipantId(member);
                                const memberGames = getParticipantGames(pid);
                                const memberTotals = computeMemberSeriesTotals(member);
                                const memberAdvancementDestinations =
                                  getDestinationsForParticipant(advancementDestinationMap, pid);
                                const teamDisplayName =
                                  team.team_name ||
                                  team.display_name ||
                                  team.name ||
                                  `Team ${team.team_number}` ||
                                  'Team';
                                const hasMemberPendingChanges = gameNumbers.some((gameNum) => {
                                  const gid = getGameIdForParticipantAndGameNumber(pid, gameNum);
                                  if (gid != null) return hasGamePendingChanges(gid);
                                  const tid = getIndividualTempGameId({
                                    event_participant_id: pid,
                                    game_number: gameNum,
                                    squad_participant_id: member.squad_participant_id,
                                  });
                                  return hasGamePendingChanges(tid);
                                });
                                const isCaptain = member.is_captain;

                                return (
                                  <tr key={`${team.id}-${pid}`} className={`${hasMemberPendingChanges ? 'bg-pending/15' : 'bg-surface-light'} border-l-4 border-accent/50`}>
                                    {/* Member Name */}
                                    <td className="px-8 py-3 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div>
                                          <div className="text-sm text-text-muted flex items-center">
                                            {member.user_name || member.name || (member as { user?: { name?: string } }).user?.name || 'Unknown'}
                                            <AdvancementDestinationMark
                                              destinations={memberAdvancementDestinations}
                                            />
                                            {isCaptain && (
                                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pending/25 text-pending">
                                                Captain
                                              </span>
                                            )}
                                            {member.duplicate_entry && (
                                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                Duplicate{member.duplicate_entry_count ? ` x${member.duplicate_entry_count}` : ''}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-xs text-text-dim mt-0.5">{teamDisplayName}</div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Member Qualifying Average */}
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                      <div className="text-sm text-text-muted">
                                        {formatQualifyingAverage(member.qualifying_average)}
                                      </div>
                                    </td>

                                    {/* Member Game Scores */}
                          {gameNumbers.map((gameNum) => {
                                      const gameId = getGameIdForParticipantAndGameNumber(pid, gameNum);
                                      const game = memberGames.find((g: any) => g.game_number === gameNum);
                            const pendingScore = gameId ? getPendingGameValue(gameId, 'score') : undefined;
                            const spId = member.squad_participant_id ?? null;
                            const laneLabel = resolveLaneLabelForGame(
                              laneLabelLookup,
                              spId,
                              gameNum,
                              game
                            );

                            // Check if team score is staged or exists for this game
                            const teamScoreExists = isTeamScoreStagedOrExists(team.id, gameNum);
                            const isIndividualEntryAllowed = teamScoringMode !== 'team';
                            const isBlockedByTeamScore =
                              teamScoringMode === 'mixed' && teamScoreExists;

                            return (
                              <td key={gameNum} className="px-4 py-3 whitespace-nowrap text-center">
                                {laneLabel ? (
                                  <div className="mb-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                                    Lane {laneLabel}
                                  </div>
                                ) : null}
                                          {!squadScoringEnabled ? (
                                            <div className="text-sm text-text-dim">—</div>
                                          ) : !isIndividualEntryAllowed ? (
                                            <div className="flex flex-col items-center justify-center min-h-[2rem]">
                                              {game?.score !== null && game?.score !== undefined ? (
                                                <div className="text-sm text-text-dim">
                                                  {game.score}
                                                  {isBakerRound || game?.is_baker ? (
                                                    <span className="ml-1 text-[10px] uppercase tracking-wide text-text-muted">
                                                      Baker
                                                    </span>
                                                  ) : null}
                                                </div>
                                              ) : (
                                                <div className="text-sm text-text-dim">—</div>
                                              )}
                                              <div
                                                className="text-xs text-text-muted mt-1"
                                                title={
                                                  isBakerRound
                                                    ? 'Baker: one shared team score (does not count toward averages)'
                                                    : 'Individual scoring disabled in Team mode'
                                                }
                                              >
                                                {isBakerRound ? 'Baker team' : 'Team mode'}
                                              </div>
                                            </div>
                                          ) : isBlockedByTeamScore ? (
                                            // Team score exists - show disabled state with explanation
                                            <div className="flex flex-col items-center justify-center min-h-[2rem]">
                                              {game?.score !== null && game?.score !== undefined ? (
                                                <div className="text-sm text-text-dim line-through">
                                                  {game.score}
                                                </div>
                                              ) : (
                                                <div className="text-sm text-text-dim">—</div>
                                              )}
                                              <div className="text-xs text-text-muted mt-1" title="Individual scores disabled - team score entered">
                                                Team score
                                              </div>
                                            </div>
                                          ) : gameId ? (
                                            // Individual game exists - allow staging/editing
                                            <InlineEditableCell
                                              type="number"
                                              value={game?.score}
                                              pendingValue={pendingScore}
                                              disabled={!squadScoringEnabled}
                                              onChange={(value) => onGameScoreChange(gameId, 'score', toScoreFieldValue(value))}
                                              batchMode={true}
                                              min={0}
                                              max={300}
                                              placeholder="—"
                                              className="w-20 mx-auto"
                                              displayLayout="centered-overlay"
                                              scoringTabCellId={`score-cell-${gameId}`}
                                              enableScoringTabNavigation={enableScoringTabNavigation}
                                            />
                                          ) : (
                                            // Individual game doesn't exist - use temporary game shell
                                            (() => {
                                              const tempId = getIndividualTempGameId({
                                                event_participant_id: pid,
                                                game_number: gameNum,
                                                squad_participant_id: member.squad_participant_id,
                                              });
                                              const tempPendingScore = getPendingGameValue(tempId, 'score');
                                              return (
                                                <InlineEditableCell
                                                  type="number"
                                                  value={tempPendingScore !== undefined ? tempPendingScore : undefined}
                                                  pendingValue={tempPendingScore}
                                                  disabled={!squadScoringEnabled}
                                                  onChange={(value) => {
                                                    if (value !== null && value !== undefined) {
                                                      const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
                                                      if (!isNaN(numValue)) {
                                                        handleIndividualScoreChange(team.id, gameNum, pid, member, numValue);
                                                      }
                                                    }
                                                  }}
                                                  batchMode={true}
                                                  min={0}
                                                  max={300}
                                                  placeholder="—"
                                                  className="w-20 mx-auto"
                                                  displayLayout="centered-overlay"
                                                  scoringTabCellId={tempId}
                                                  enableScoringTabNavigation={enableScoringTabNavigation}
                                                />
                                              );
                                            })()
                                )}
                              </td>
                            );
                          })}
                          {gameCountAdjustControls ? (
                            <td className="px-2 py-3" aria-hidden />
                          ) : null}

                                    {/* Member scratch total */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                                      <div className="text-sm text-text-muted">
                                        {formatSeriesTotal(
                                          handicapEnabled
                                            ? memberTotals.totalScratch
                                            : memberTotals.totalWithHandicap,
                                          memberTotals.gamesScored
                                        )}
                            </div>
                          </td>

                                    {bonusPinsEnabled && (
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <div className="text-sm text-text-dim">—</div>
                                      </td>
                                    )}

                                    {handicapEnabled && (
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <div className="text-sm text-text-muted">
                                          {formatSeriesTotal(
                                            memberTotals.totalWithHandicap,
                                            memberTotals.gamesScored
                                          )}
                                        </div>
                                      </td>
                                    )}
                        </tr>
                                );
                              })}
                            </>
                          )}
                        </React.Fragment>
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
            Squads will appear here after teams are assigned. Lock each squad on the Squads tab to enter scores.
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamScoring;
