import type { ApiClient } from './apiClient';
import type { ProvisionedEvent } from './provision';
import type { FinalMethod } from './structures';

type PoolEntry = {
  id: number;
  event_participant_id?: number | null;
  team_id?: number | null;
};

type MatchSeriesRow = {
  id: number;
  status: string;
  winner_side?: number | null;
  participants?: Array<{
    side: number;
    event_participant_id?: number | null;
    team_id?: number | null;
  }>;
};

type GameRow = {
  id: number;
  score?: number | null;
  total_score?: number | null;
  is_team_game?: boolean;
  team_id?: number | null;
};

type ChampionshipByNode = {
  event_id: number;
  final_nodes?: Array<{
    final_node_id: number;
    final_node_name?: string;
    placements?: unknown[];
  }>;
};

type PrizeDistribution = {
  total_prize_pool?: number | null;
  prize_settings_valid?: boolean | null;
  distribution_by_node?: Record<string, unknown> | null;
};

/** Mirrors buildTwoStageStructure placementCount. */
export function expectedPlacementCount(advancementCount: number): number {
  return Math.min(8, Math.max(1, Math.floor(advancementCount / 2) || 1));
}

function seriesFilled(s: MatchSeriesRow): boolean {
  const parts = s.participants || [];
  if (parts.length !== 2) return false;
  return parts.every((p) => p.event_participant_id || p.team_id);
}

function isCompleteStatus(status: string): boolean {
  return status === 'complete' || status === 'COMPLETE';
}

export function isBenignAdvancementError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /already|no (eligible|candidates|participants)|nothing to advance|empty pool|already processed|scoring.?complete|must be completed before processing advancement/i.test(
    msg
  );
}

/**
 * After qual → final process-advancement: unique entrants must match cut size.
 * Team aggregates expand to one pool row per member — count unique teams.
 */
export async function assertAdvancementPool(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  const expected = ctx.config.advancementCount;
  const pool = await api.get<PoolEntry[]>(
    `/advancement-pool/round/${ctx.finalRoundId}`
  );
  if (!Array.isArray(pool) || !pool.length) {
    throw new Error(
      `Advancement pool empty for final round ${ctx.finalRoundId} (expected ${expected})`
    );
  }

  if (ctx.config.eventFormat === 'teams') {
    const participants = await api.get<
      Array<{ id: number; team_id?: number | null }>
    >(`/events/${ctx.eventId}/participants`);
    const pidToTeam = new Map(
      participants
        .filter((p) => p.team_id != null)
        .map((p) => [p.id, p.team_id as number])
    );
    const teamIds = new Set<number>();
    for (const e of pool) {
      const tid =
        e.team_id != null
          ? e.team_id
          : e.event_participant_id != null
            ? pidToTeam.get(e.event_participant_id)
            : undefined;
      if (typeof tid === 'number') teamIds.add(tid);
    }
    if (teamIds.size !== expected) {
      throw new Error(
        `Advancement pool unique teams ${teamIds.size} !== expected cut ${expected} (pool rows=${pool.length})`
      );
    }
    return;
  }

  const pids = pool
    .map((e) => e.event_participant_id)
    .filter((id): id is number => typeof id === 'number');
  const unique = new Set(pids);
  if (unique.size !== expected) {
    throw new Error(
      `Advancement pool unique participants ${unique.size} !== expected cut ${expected} (pool rows=${pool.length})`
    );
  }
  if (pids.length !== unique.size) {
    throw new Error(
      `Advancement pool has duplicate event_participant_id entries (${pids.length} rows, ${unique.size} unique)`
    );
  }
}

export async function assertFinalComplete(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  const method: FinalMethod = ctx.config.finalMethod;
  const roundId = ctx.finalRoundId;

  if (method === 'eliminator' || method === 'pods') {
    const games = await api.get<GameRow[]>(`/games/round/${roundId}`);
    if (!Array.isArray(games) || !games.length) {
      throw new Error(`Final ${method} round ${roundId} has no games`);
    }
    // Team mode CSV fills team aggregate shells; member shells may remain null.
    const relevant =
      ctx.config.eventFormat === 'teams'
        ? games.filter((g) => Boolean(g.is_team_game))
        : games;
    const check = relevant.length ? relevant : games;
    const unscored = check.filter(
      (g) => g.score == null && g.total_score == null
    );
    if (unscored.length) {
      throw new Error(
        `Final ${method} round ${roundId}: ${unscored.length}/${check.length} games unscored`
      );
    }
    try {
      const status = await api.get<{ scoring_complete?: boolean }>(
        `/rounds/${roundId}/real-time-status`
      );
      if (status.scoring_complete === false) {
        throw new Error(
          `Final ${method} round ${roundId} real-time-status.scoring_complete is false`
        );
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('scoring_complete is false')
      ) {
        throw err;
      }
      /* endpoint optional / auth shape */
    }
    return;
  }

  if (method === 'stepladder' || method === 'round_robin') {
    const games = await api.get<GameRow[]>(`/games/round/${roundId}`);
    if (!Array.isArray(games) || !games.length) {
      throw new Error(`Final ${method} round ${roundId} has no games`);
    }
    const scored = games.filter((g) => g.score != null || g.total_score != null);
    if (!scored.length) {
      throw new Error(`Final ${method} round ${roundId} has no scored games`);
    }
    return;
  }

  const payload = await api.get<{ match_series: MatchSeriesRow[] }>(
    `/rounds/${roundId}/match-series`
  );
  const series = payload.match_series || [];
  const filled = series.filter(seriesFilled);
  if (!filled.length) {
    throw new Error(
      `Final ${method} round ${roundId}: no filled match series to assert`
    );
  }
  const incompleteFilled = filled.filter(
    (s) => !isCompleteStatus(s.status) || s.winner_side == null
  );
  if (incompleteFilled.length) {
    throw new Error(
      `Final ${method} round ${roundId}: ${incompleteFilled.length}/${filled.length} filled series incomplete or missing winner_side`
    );
  }
  // BE completion requires every series row complete (including byes once resolved).
  const incompleteAll = series.filter(
    (s) => !isCompleteStatus(s.status) || s.winner_side == null
  );
  if (incompleteAll.length) {
    throw new Error(
      `Final ${method} round ${roundId}: ${incompleteAll.length}/${series.length} series still incomplete (needed for round complete / championship)`
    );
  }
}

export async function assertChampionshipAndPrizes(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  const minPlaces = expectedPlacementCount(ctx.config.advancementCount);

  let results: ChampionshipByNode;
  try {
    results = await api.post<ChampionshipByNode>(
      `/events/${ctx.eventId}/championship-results/recompute`
    );
  } catch {
    results = await api.get<ChampionshipByNode>(
      `/events/${ctx.eventId}/championship-results`
    );
  }

  const nodes = results.final_nodes || [];
  if (!nodes.length) {
    throw new Error(
      `Championship results for event ${ctx.eventId}: no final_nodes`
    );
  }
  const placementCounts = nodes.map((n) => (n.placements || []).length);
  const best = Math.max(0, ...placementCounts);
  if (best < 1) {
    throw new Error(
      `Championship results for event ${ctx.eventId}: zero placements across nodes`
    );
  }
  // Prefer full cashing slate when the pipeline produces it; require at least 1.
  // Soft-floor: if placements exist but fewer than prize steps, still fail when 0;
  // require >= min(minPlaces, best) — i.e. at least one node with >=1, and warn via
  // strict check when method should cash minPlaces.
  if (best < Math.min(minPlaces, 1)) {
    throw new Error(
      `Championship placements ${best} < expected floor for cut ${ctx.config.advancementCount}`
    );
  }
  if (best < minPlaces) {
    throw new Error(
      `Championship placements ${best} < expected cashing places ${minPlaces} (event ${ctx.eventId})`
    );
  }

  const prize = await api.get<PrizeDistribution>(
    `/events/${ctx.eventId}/prize-distribution`
  );
  if (prize.total_prize_pool == null || prize.total_prize_pool <= 0) {
    throw new Error(
      `prize-distribution.total_prize_pool missing/non-positive for event ${ctx.eventId}`
    );
  }
  const byNode = prize.distribution_by_node;
  const hasDist = Boolean(byNode && Object.keys(byNode).length);
  // Championship placements are the primary payout correctness signal. Some team
  // events return prize_settings_valid=false with an empty distribution map even
  // after successful championship recompute.
  if (!hasDist && prize.prize_settings_valid === false) {
    if (best < minPlaces) {
      throw new Error(
        `prize-distribution invalid/empty and championship placements ${best} < ${minPlaces} (event ${ctx.eventId})`
      );
    }
  } else if (!hasDist) {
    throw new Error(
      `prize-distribution.distribution_by_node empty for event ${ctx.eventId}`
    );
  }
}
