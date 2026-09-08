import { useMemo } from 'react';
import {
  flattenLaneBoardRows,
  useEventLaneBoard,
} from '../../features/lanes/useEventLaneBoard';
import { buildAssignmentPreviewFromRows } from '../event-lane/buildLaneAssignmentPreviewReportDocument';
import { previewLanesByTeamIdFromPreview } from '../../utils/bakerLeagueLaneAssignments';
import type { LanePair } from '../../features/lanes/types';

export function useBakerLeagueLanePreview(args: {
  eventId: number;
  selectedRoundId: number | null;
  enabled: boolean;
  scheduledGames: number | null | undefined;
  fallbackGameCount: number;
  positionRoundGame: number | null | undefined;
  positionRoundLanePlacement: string | null | undefined;
}) {
  const {
    eventId,
    selectedRoundId,
    enabled,
    scheduledGames,
    fallbackGameCount,
    positionRoundGame,
    positionRoundLanePlacement,
  } = args;

  const laneBoardQuery = useEventLaneBoard(eventId, {
    roundId: selectedRoundId,
    enabled: Boolean(enabled && selectedRoundId),
  });

  const lanePreviewLanesByTeamId = useMemo(() => {
    const board = laneBoardQuery.data;
    if (!board) return new Map<number, Array<number | null>>();
    const pairs = (board.pairs_in_play || board.engine?.pairs_in_play || []) as LanePair[];
    if (!pairs.length) return new Map<number, Array<number | null>>();
    const rows = flattenLaneBoardRows(board.lanes, board.unassigned);
    const gameCount = Math.max(1, scheduledGames ?? fallbackGameCount ?? 1);
    const placement = String(positionRoundLanePlacement ?? 'start_low');
    const seatedTeamIds = new Set(
      rows
        .filter((r) => r.team_id != null && r.assigned_lane != null)
        .map((r) => Number(r.team_id))
    );
    const preview = buildAssignmentPreviewFromRows({
      pairs,
      gameCount,
      movement: board.engine?.movement || {
        enabled: false,
        interval_games: 1,
        mode: 'stay',
        step_pairs: 1,
        staggered_steps: [],
        league_team_count: null,
        league_wrap_pair_offset: null,
        split_house: false,
        split_after_pair_low: null,
      },
      rows,
      positionRound:
        positionRoundGame != null
          ? {
              game: positionRoundGame,
              placement,
              teamCount: Math.max(2, seatedTeamIds.size || 2),
              roundId: selectedRoundId,
            }
          : null,
    });
    return previewLanesByTeamIdFromPreview(preview);
  }, [
    laneBoardQuery.data,
    scheduledGames,
    fallbackGameCount,
    positionRoundLanePlacement,
    positionRoundGame,
    selectedRoundId,
  ]);

  const laneBoardPairsInPlay = useMemo(() => {
    const board = laneBoardQuery.data;
    return (board?.pairs_in_play || board?.engine?.pairs_in_play || []) as LanePair[];
  }, [laneBoardQuery.data]);

  return {
    laneBoardQuery,
    lanePreviewLanesByTeamId,
    laneBoardPairsInPlay,
  };
}
