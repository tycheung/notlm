import type { EventComplete, FinalNodeRead } from '../types/event';

export type LineageFeeMode = 'flat' | 'per_game';

export function configuredGameCount(
  rounds?: Array<{ game_count?: number | null }> | null
): number {
  return (rounds || []).reduce((sum, round) => sum + (Number(round.game_count) || 0), 0);
}

export function lineageMaxGames(configuredGames: number, approvedCount: number): number {
  return Math.max(0, configuredGames) * Math.max(0, approvedCount);
}

export function lineageGamesForCalc(
  billedGames: number | null | undefined,
  configuredGames: number,
  approvedCount: number
): number {
  if (billedGames != null) return Math.max(0, billedGames);
  return lineageMaxGames(configuredGames, approvedCount);
}

export function computeHouseCutTotal(
  entryFee: number,
  additionalPrizePool: number,
  houseCutType: string,
  houseCutPercentage: number,
  houseCutAmount: number,
  approvedCount: number
): number {
  const totalEntryFees = (entryFee || 0) * Math.max(0, approvedCount);
  const totalPool = totalEntryFees + (additionalPrizePool || 0);
  if (houseCutType === 'percentage') {
    return Math.round(totalPool * ((houseCutPercentage || 0) / 100) * 100) / 100;
  }
  if (houseCutType === 'dollars_per_entry') {
    return Math.round((houseCutPercentage || 0) * approvedCount * 100) / 100;
  }
  return Math.round((houseCutAmount || 0) * 100) / 100;
}

export function computeLineageTotal(
  lineageFeeMode: LineageFeeMode | string,
  lineagePerGame: number,
  lineageAmount: number,
  approvedCount: number,
  totalGames: number,
  billedGames?: number | null
): number {
  if (lineageFeeMode === 'per_game') {
    const games = lineageGamesForCalc(billedGames, totalGames, approvedCount);
    return Math.round((lineagePerGame || 0) * games * 100) / 100;
  }
  return Math.round((lineageAmount || 0) * 100) / 100;
}

export function computeNetPrizePool(
  entryFee: number,
  additionalPrizePool: number,
  houseCutType: string,
  houseCutPercentage: number,
  houseCutAmount: number,
  approvedCount: number,
  lineageFeeMode: LineageFeeMode | string = 'flat',
  lineagePerGame = 0,
  lineageAmount = 0,
  totalGames = 0,
  billedGames: number | null = null
): number {
  const totalEntryFees = (entryFee || 0) * Math.max(0, approvedCount);
  const totalPool = totalEntryFees + (additionalPrizePool || 0);
  const house = computeHouseCutTotal(
    entryFee,
    additionalPrizePool,
    houseCutType,
    houseCutPercentage,
    houseCutAmount,
    approvedCount
  );
  const lineage = computeLineageTotal(
    lineageFeeMode,
    lineagePerGame,
    lineageAmount,
    approvedCount,
    totalGames,
    billedGames
  );
  return Math.round((totalPool - house - lineage) * 100) / 100;
}

export function countActiveFinalNodes(nodes: FinalNodeRead[]): number {
  return nodes.filter((n) => n.is_active).length;
}

export function computeNodeSliceRaw(
  node: FinalNodeRead,
  prizePool: number,
  participantCount: number
): number {
  const t = node.node_pool_type || 'percentage';
  const v = Number(node.node_pool_value ?? 0);
  if (t === 'percentage') return Math.round((v / 100) * prizePool * 100) / 100;
  if (t === 'dollars_per_entry') return Math.round(v * participantCount * 100) / 100;
  return Math.round(v * 100) / 100;
}

export function effectiveNodeSlice(
  node: FinalNodeRead,
  prizePool: number,
  participantCount: number,
  activeCount: number
): number {
  if (activeCount === 1 && node.is_active) {
    return Math.round(prizePool * 100) / 100;
  }
  return computeNodeSliceRaw(node, prizePool, participantCount);
}

export function poolFromEventComplete(ec: EventComplete, approvedCount: number): number {
  return computeNetPrizePool(
    ec.entry_fee || 0,
    ec.additional_prize_pool || 0,
    ec.house_cut_type || 'percentage',
    ec.house_cut_percentage ?? 0,
    ec.house_cut_amount ?? 0,
    approvedCount,
    ec.lineage_fee_mode || 'flat',
    ec.lineage_per_game ?? 0,
    ec.lineage_amount ?? 0,
    configuredGameCount(ec.rounds),
    ec.lineage_billed_games ?? null
  );
}
