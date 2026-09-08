import type { ApiClient } from './apiClient';
import {
  assertAdvancementPool,
  assertChampionshipAndPrizes,
  assertFinalComplete,
  isBenignAdvancementError,
} from './assertions';
import type { FinalMethod } from './structures';
import type { ProvisionedEvent } from './provision';

type GameRow = {
  id: number;
  score?: number | null;
  event_participant_id?: number | null;
  team_id?: number | null;
  match_series_id?: number | null;
  match_game_index?: number | null;
  is_team_game?: boolean;
  status?: string;
};

type MatchSeriesRow = {
  id: number;
  status: string;
  winner_side?: number | null;
  race_to_wins?: number | null;
  participants?: Array<{
    side: number;
    event_participant_id?: number | null;
    team_id?: number | null;
  }>;
};

type PoolEntry = {
  id: number;
  event_participant_id?: number | null;
  team_id?: number | null;
  assigned_squad_id?: number | null;
  is_assigned_to_squad?: boolean;
};

async function listRoundGames(api: ApiClient, roundId: number): Promise<GameRow[]> {
  try {
    return await api.get<GameRow[]>(`/games/round/${roundId}`);
  } catch {
    return [];
  }
}

async function chunkedUnifiedScore(
  api: ApiClient,
  updates: Array<{ game_id: number; score: number; total_score?: number }>
): Promise<void> {
  // Small chunks: each score can trigger post-score pipeline work.
  const chunkSize = 20;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const slice = updates.slice(i, i + chunkSize);
    await api.post('/games/batch/unified', {
      temporary_shells: [],
      game_updates: slice.map((u) => ({
        game_id: u.game_id,
        score: u.score,
        total_score: u.total_score ?? u.score,
      })),
      team_member_scores: [],
    });
  }
}

/** Prefer CSV bulk import for eliminator rounds (one pipeline pass). */
export async function scoreEliminatorRoundViaCsv(
  api: ApiClient,
  roundId: number,
  options?: { baseHigh?: number; scoringMode?: 'individual' | 'team' }
): Promise<void> {
  const baseHigh = options?.baseHigh ?? 299;
  const scoringMode = options?.scoringMode ?? 'individual';
  const template = await api.downloadText(
    `/rounds/${roundId}/scores/csv-template?scoring_mode=${scoringMode}`
  );
  const lines = template.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error(`Empty score CSV template for round ${roundId}`);
  }
  const header = lines[0].split(',');
  const gameIdx = header.findIndex((h) => h.trim().toLowerCase() === 'game_1');
  if (gameIdx < 0) {
    throw new Error(`CSV template missing game_1 column: ${header.join(',')}`);
  }
  const out = [lines[0]];
  let rowScore = baseHigh;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < header.length) {
      // pad
      while (cols.length < header.length) cols.push('');
    }
    // Fill all game_* columns with descending scores
    for (let c = 0; c < header.length; c++) {
      if (/^game_\d+$/i.test(header[c].trim())) {
        cols[c] = String(Math.max(100, rowScore));
      }
    }
    out.push(cols.join(','));
    rowScore -= 1;
  }
  await api.uploadCsv(
    `/rounds/${roundId}/scores/csv?scoring_mode=${scoringMode}`,
    `round_${roundId}_scores.csv`,
    out.join('\n')
  );
}

export async function scoreEliminatorRound(
  api: ApiClient,
  roundId: number,
  options?: { baseHigh?: number; scoringMode?: 'individual' | 'team' }
): Promise<number> {
  await scoreEliminatorRoundViaCsv(api, roundId, options);
  return -1;
}

export async function processAdvancement(
  api: ApiClient,
  roundId: number
): Promise<unknown> {
  return api.post(`/rounds/${roundId}/process-advancement`);
}

async function assignPoolToFinalSquad(
  api: ApiClient,
  ctx: ProvisionedEvent,
  finalRoundId: number,
  finalSquadId: number,
  isTeams: boolean
): Promise<void> {
  let list = await api.get<PoolEntry[]>(
    `/advancement-pool/round/${finalRoundId}/unassigned`
  );
  if (!Array.isArray(list) || !list.length) {
    const all = await api.get<PoolEntry[]>(
      `/advancement-pool/round/${finalRoundId}`
    );
    list = (Array.isArray(all) ? all : []).filter(
      (e) => !e.is_assigned_to_squad && !e.assigned_squad_id
    );
  }

  if (!list.length) {
    throw new Error(`No advancement pool entries for round ${finalRoundId}`);
  }

  if (isTeams) {
    const participants = await api.get<
      Array<{ id: number; team_id?: number | null }>
    >(`/events/${ctx.eventId}/participants`);
    const pidToTeam = new Map(
      participants
        .filter((p) => p.team_id != null)
        .map((p) => [p.id, p.team_id as number])
    );
    const teamIds = [
      ...new Set(
        list
          .map((e) =>
            e.team_id != null
              ? e.team_id
              : e.event_participant_id != null
                ? pidToTeam.get(e.event_participant_id)
                : undefined
          )
          .filter((id): id is number => typeof id === 'number')
      ),
    ];
    if (!teamIds.length) {
      throw new Error('Could not resolve team ids from advancement pool');
    }
    await api.post('/squads/batch-team-operations', {
      operations: teamIds.map((team_id) => ({
        action: 'assign',
        team_id,
        squad_id: finalSquadId,
      })),
    });
  } else {
    const pids = [
      ...new Set(
        list
          .map((e) => e.event_participant_id)
          .filter((id): id is number => typeof id === 'number')
      ),
    ];
    await api.post('/squads/batch-assign', {
      assignments: pids.map((event_participant_id, idx) => ({
        event_participant_id,
        squad_id: finalSquadId,
        position: idx + 1,
      })),
    });
  }

  for (const e of list) {
    try {
      await api.post('/advancement-pool/assign', {
        pool_entry_id: e.id,
        squad_id: finalSquadId,
      });
    } catch {
      /* best-effort mirror on pool row */
    }
  }
}

export async function lockFinalRound(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  await assignPoolToFinalSquad(
    api,
    ctx,
    ctx.finalRoundId,
    ctx.finalSquadId,
    ctx.config.eventFormat === 'teams'
  );
  if (ctx.config.eventFormat === 'teams') {
    await api.post(`/rounds/${ctx.finalRoundId}/lock-in-teams`);
  } else {
    await api.post(`/rounds/${ctx.finalRoundId}/lock-in`);
  }
  const method = ctx.config.finalMethod;
  if (method !== 'eliminator' && method !== 'pods') {
    await api.post(`/rounds/${ctx.finalRoundId}/match-structure/sync?force_rebuild=true`);
  }
}

function seriesPlayable(s: MatchSeriesRow): boolean {
  const parts = s.participants || [];
  if (parts.length !== 2) return false;
  return parts.every((p) => p.event_participant_id || p.team_id);
}

async function completePlayableSeries(
  api: ApiClient,
  roundId: number,
  maxWaves = 80,
  fillAllGames = false
): Promise<number> {
  let completed = 0;
  for (let wave = 0; wave < maxWaves; wave++) {
    // Materialize game shells for newly playable series (bracket propagation, stepladder, etc.)
    await api.post(`/rounds/${roundId}/match-structure/sync`);

    const payload = await api.get<{ match_series: MatchSeriesRow[] }>(
      `/rounds/${roundId}/match-series`
    );
    const series = payload.match_series || [];
    if (
      series.length > 0 &&
      series.every(
        (s) =>
          (s.status === 'complete' || s.status === 'COMPLETE') &&
          s.winner_side != null
      )
    ) {
      break;
    }

    const playable = series.filter(
      (s) =>
        seriesPlayable(s) &&
        s.status !== 'complete' &&
        s.status !== 'COMPLETE'
    );
    if (!playable.length) break;

    const games = await listRoundGames(api, roundId);
    const bySeries = new Map<number, GameRow[]>();
    for (const g of games) {
      if (g.match_series_id == null) continue;
      const list = bySeries.get(g.match_series_id) || [];
      list.push(g);
      bySeries.set(g.match_series_id, list);
    }

    const updates: Array<{ game_id: number; score: number }> = [];
    let waveCompleted = 0;
    for (const s of playable) {
      const shells = bySeries.get(s.id) || [];
      if (!shells.length) continue;
      const parts = (s.participants || []).slice().sort((a, b) => a.side - b.side);
      const race = fillAllGames ? Number.POSITIVE_INFINITY : s.race_to_wins || 1;
      const byIndex = new Map<number, GameRow[]>();
      for (const g of shells) {
        const idx = g.match_game_index ?? 0;
        const list = byIndex.get(idx) || [];
        list.push(g);
        byIndex.set(idx, list);
      }
      let wins = 0;
      let pushed = 0;
      for (const idx of [...byIndex.keys()].sort((a, b) => a - b)) {
        if (wins >= race) break;
        for (const g of byIndex.get(idx) || []) {
          if (g.score != null) continue;
          const side0 =
            (parts[0]?.event_participant_id != null &&
              g.event_participant_id === parts[0].event_participant_id) ||
            (parts[0]?.team_id != null && g.team_id === parts[0].team_id);
          updates.push({ game_id: g.id, score: side0 ? 225 : 180 });
          pushed += 1;
        }
        wins += 1;
      }
      if (pushed) waveCompleted += 1;
    }
    if (updates.length) {
      await chunkedUnifiedScore(api, updates);
      completed += waveCompleted;
    } else {
      break;
    }
  }
  return completed;
}

export async function scoreQualifyingAndAdvance(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  const scoringMode =
    ctx.config.eventFormat === 'teams' ? 'team' : 'individual';
  await scoreEliminatorRound(api, ctx.qualRoundId, { scoringMode });
  await processAdvancement(api, ctx.qualRoundId);
  await assertAdvancementPool(api, ctx);
  await lockFinalRound(api, ctx);
  await scoreFinalRound(api, ctx);
  await assertFinalComplete(api, ctx);
  await assertChampionshipAndPrizes(api, ctx);
}

async function processFinalAdvancement(
  api: ApiClient,
  roundId: number
): Promise<void> {
  try {
    await processAdvancement(api, roundId);
  } catch (err) {
    if (isBenignAdvancementError(err)) return;
    throw err;
  }
}

/** Mark match-play final completed so championship advancement can run. */
async function completeFinalRoundIfReady(
  api: ApiClient,
  roundId: number
): Promise<void> {
  try {
    await api.post(`/rounds/${roundId}/complete`);
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already|completed/i.test(msg) && !/cannot be completed/i.test(msg)) {
      await processFinalAdvancement(api, roundId);
      return;
    }
    // Surface completion snapshot for diagnosis
    try {
      const status = await api.get<{
        scoring_complete?: boolean;
        completed_series?: number;
        total_series?: number;
        pending_series?: number;
      }>(`/rounds/${roundId}/real-time-status`);
      throw new Error(
        `Could not complete final round ${roundId}: ${msg}; ` +
          `scoring_complete=${status.scoring_complete} ` +
          `series=${status.completed_series}/${status.total_series} ` +
          `pending=${status.pending_series ?? '?'}`
      );
    } catch (inner) {
      if (inner instanceof Error && inner.message.startsWith('Could not complete')) {
        throw inner;
      }
      throw err;
    }
  }
}

async function scorePinfallFinal(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  const scoringMode =
    ctx.config.eventFormat === 'teams' ? 'team' : 'individual';
  await scoreEliminatorRound(api, ctx.finalRoundId, {
    baseHigh: 280,
    scoringMode,
  });
  await processFinalAdvancement(api, ctx.finalRoundId);
  try {
    await api.post(`/rounds/${ctx.finalRoundId}/complete`);
  } catch (err) {
    if (!isBenignAdvancementError(err)) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cannot be completed|already/i.test(msg)) throw err;
    }
  }
}

export async function scoreFinalRound(
  api: ApiClient,
  ctx: ProvisionedEvent
): Promise<void> {
  const method: FinalMethod = ctx.config.finalMethod;
  if (method === 'eliminator' || method === 'pods') {
    await scorePinfallFinal(api, ctx);
    return;
  }
  const fillAllGames = method === 'stepladder' || method === 'round_robin';
  const completed = await completePlayableSeries(
    api,
    ctx.finalRoundId,
    80,
    fillAllGames
  );
  if (completed < 1) {
    throw new Error(
      `Final ${method} round ${ctx.finalRoundId}: completed 0 playable series`
    );
  }
  await completeFinalRoundIfReady(api, ctx.finalRoundId);
}
