import { SideActionsAPI } from '../../../api/side-actions';
import type {
  HighGameReportListMode,
  HighSetReportListMode,
  MysteryDoublesReportListMode,
  LoveDoublesReportListMode,
  AlibiDoublesReportListMode,
} from '../../../api/side-actions';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import { buildHighGameEntrySummaryReportDocument } from './buildHighGameEntrySummaryReportDocument';
import { buildHighGameReportDocument } from './buildHighGameReportDocument';
import { buildHighSetEntrySummaryReportDocument } from './buildHighSetEntrySummaryReportDocument';
import { buildHighSetReportDocument } from './buildHighSetReportDocument';
import { buildEliminatorEntrySummaryReportDocument } from './buildEliminatorEntrySummaryReportDocument';
import { buildMysteryDoublesEntrySummaryReportDocument } from '../../../features/side-actions/mystery-doubles/reports/buildMysteryDoublesEntrySummaryReportDocument';
import { buildMysteryDoublesReportDocument } from '../../../features/side-actions/mystery-doubles/reports/buildMysteryDoublesReportDocument';
import { buildMysteryGameEntrySummaryReportDocument } from '../../../features/side-actions/mystery-game/reports/buildMysteryGameEntrySummaryReportDocument';
import { buildMysteryGameReportDocument } from '../../../features/side-actions/mystery-game/reports/buildMysteryGameReportDocument';
import { buildLoveDoublesEntrySummaryReportDocument } from '../../../features/side-actions/love-doubles/reports/buildLoveDoublesEntrySummaryReportDocument';
import { buildLoveDoublesReportDocument } from '../../../features/side-actions/love-doubles/reports/buildLoveDoublesReportDocument';
import { buildAlibiDoublesEntrySummaryReportDocument } from '../../../features/side-actions/alibi-doubles/reports/buildAlibiDoublesEntrySummaryReportDocument';
import { buildAlibiDoublesReportDocument } from '../../../features/side-actions/alibi-doubles/reports/buildAlibiDoublesReportDocument';
import { buildEntrySummaryReportDocument } from './buildEntrySummaryReportDocument';
import { buildEventEntrySummaryReportDocument } from './buildEventEntrySummaryReportDocument';
import type { EntrySummaryScope } from './EntrySummaryScopeField';

export type ReportContextIds = { tid: number; eid: number; sid: number };
export type HighGameEffectiveOptions = {
  gameNumbers: number[];
  payoutMode: 'per_game' | 'combined';
};

export async function buildHighGameEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getHighGameEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildHighGameEntrySummaryReportDocument(report);
}

export async function loadHighGameEffectiveOptions(
  sideActionId: number,
  poolId?: number
): Promise<HighGameEffectiveOptions> {
  const sa = await SideActionsAPI.getSideAction(sideActionId);
  const pool = poolId ? sa.pools.find((candidate) => candidate.id === poolId) : undefined;
  const cfg = (sa.type_config || {}) as {
    game_numbers?: number[];
    payout_mode?: 'per_game' | 'combined';
  };
  const poolTypeConfig = (pool?.override_config?.type_config || {}) as {
    payout_mode?: 'per_game' | 'combined';
  };
  const games = (pool?.game_numbers?.length
    ? pool.game_numbers
    : cfg.game_numbers || sa.game_numbers || [])
    .filter((n) => Number(n) >= 1)
    .map(Number);
  return {
    gameNumbers: games,
    payoutMode: poolTypeConfig.payout_mode ?? cfg.payout_mode ?? 'per_game',
  };
}

export async function loadHighGameAvailableGames(
  sideActionId: number,
  poolId?: number
): Promise<number[]> {
  return (await loadHighGameEffectiveOptions(sideActionId, poolId)).gameNumbers;
}

export async function buildHighGameReportDoc(
  ctx: ReportContextIds,
  gameNumbers: number[],
  listMode: HighGameReportListMode,
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getHighGameReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    game_numbers: gameNumbers,
    list_mode: listMode,
    pool_id: poolId,
  });
  return buildHighGameReportDocument(report);
}

export async function buildHighSetEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getHighSetEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildHighSetEntrySummaryReportDocument(report);
}

export async function buildHighSetReportDoc(
  ctx: ReportContextIds,
  listMode: HighSetReportListMode,
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getHighSetReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    list_mode: listMode,
    pool_id: poolId,
  });
  return buildHighSetReportDocument(report);
}

export async function buildEliminatorEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getEliminatorEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildEliminatorEntrySummaryReportDocument(report);
}

export async function buildMysteryDoublesEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getMysteryDoublesEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildMysteryDoublesEntrySummaryReportDocument(report);
}

export async function buildMysteryDoublesReportDoc(
  ctx: ReportContextIds,
  listMode: MysteryDoublesReportListMode,
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getMysteryDoublesReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    list_mode: listMode,
    pool_id: poolId,
  });
  return buildMysteryDoublesReportDocument(report);
}

export async function buildMysteryGameEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getMysteryGameEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildMysteryGameEntrySummaryReportDocument(report);
}

export async function buildMysteryGameReportDoc(
  ctx: ReportContextIds,
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getMysteryGameReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    pool_id: poolId,
  });
  return buildMysteryGameReportDocument(report);
}

export async function buildLoveDoublesEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getLoveDoublesEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildLoveDoublesEntrySummaryReportDocument(report);
}

export async function buildLoveDoublesReportDoc(
  ctx: ReportContextIds,
  listMode: LoveDoublesReportListMode,
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getLoveDoublesReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    list_mode: listMode,
    pool_id: poolId,
  });
  return buildLoveDoublesReportDocument(report);
}

export async function buildAlibiDoublesEntrySummaryDoc(
  ctx: ReportContextIds,
  scope: 'this' | 'all',
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getAlibiDoublesEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildAlibiDoublesEntrySummaryReportDocument(report);
}

export async function buildAlibiDoublesReportDoc(
  ctx: ReportContextIds,
  listMode: AlibiDoublesReportListMode,
  poolId?: number
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getAlibiDoublesReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    list_mode: listMode,
    pool_id: poolId,
  });
  return buildAlibiDoublesReportDocument(report);
}

export async function buildEventEntrySummaryDoc(
  ctx: ReportContextIds
): Promise<ReportDocument> {
  const report = await SideActionsAPI.getEventEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
  });
  return buildEventEntrySummaryReportDocument(report);
}

export async function buildEntrySummaryPreviewDoc(
  ctx: ReportContextIds,
  scope: EntrySummaryScope,
  poolId?: number
): Promise<ReportDocument> {
  if (scope === 'all_side_actions') {
    return buildEventEntrySummaryDoc(ctx);
  }
  const report = await SideActionsAPI.getEntrySummaryReport({
    side_action_id: ctx.sid,
    tournament_id: ctx.tid,
    event_id: ctx.eid,
    scope,
    pool_id: poolId,
  });
  return buildEntrySummaryReportDocument(report);
}

export type { EntrySummaryScope };

export const OPEN_POT_ENTRY_SUMMARY_ERRORS = {
  high_game: 'Failed to build High Game entry summary.',
  high_set: 'Failed to build High Series entry summary.',
  eliminator: 'Failed to build Eliminator entry summary.',
} as const;

export type OpenPotEntrySummaryKind = keyof typeof OPEN_POT_ENTRY_SUMMARY_ERRORS;

export async function buildOpenPotEntrySummaryDoc(
  kind: OpenPotEntrySummaryKind,
  ctx: ReportContextIds,
  scope: EntrySummaryScope,
  poolId?: number
): Promise<ReportDocument> {
  if (scope === 'all_side_actions') {
    return buildEntrySummaryPreviewDoc(ctx, scope);
  }
  if (kind === 'high_game') {
    return buildHighGameEntrySummaryDoc(ctx, scope, poolId);
  }
  if (kind === 'high_set') {
    return buildHighSetEntrySummaryDoc(ctx, scope, poolId);
  }
  return buildEliminatorEntrySummaryDoc(ctx, scope, poolId);
}
