import { formatPlacementOrdinal } from './advancementCalculator';

export interface StandingsLabelNodeInput {
  id: number;
  display_order: number;
  placement_count: number;
  include_in_standings: boolean;
}

export interface StandingsLabelEntry {
  label: string;
  globalRank: number;
}

export function formatStandingsPlaceLabel(globalRank: number): string {
  return `${formatPlacementOrdinal(globalRank)} Place`;
}

/**
 * Nodes should be sorted by (display_order, id) before calling.
 */
export function buildStandingsLabels(
  nodes: StandingsLabelNodeInput[]
): Map<number, Map<number, StandingsLabelEntry | null>> {
  const result = new Map<number, Map<number, StandingsLabelEntry | null>>();
  let globalOffset = 0;

  for (const node of nodes) {
    const nodeLabels = new Map<number, StandingsLabelEntry | null>();
    const count = Math.max(0, node.placement_count);

    for (let pos = 1; pos <= count; pos += 1) {
      if (node.include_in_standings) {
        const globalRank = globalOffset + pos;
        nodeLabels.set(pos, {
          label: formatStandingsPlaceLabel(globalRank),
          globalRank,
        });
      } else {
        nodeLabels.set(pos, null);
      }
    }

    result.set(node.id, nodeLabels);
    if (node.include_in_standings) {
      globalOffset += count;
    }
  }

  return result;
}

export function lookupStandingsLabel(
  labels: Map<number, Map<number, StandingsLabelEntry | null>>,
  finalNodeId: number,
  localPlacement: number
): StandingsLabelEntry | null {
  return labels.get(finalNodeId)?.get(localPlacement) ?? null;
}
