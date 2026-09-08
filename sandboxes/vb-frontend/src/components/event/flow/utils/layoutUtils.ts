import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { RoundRead } from '../../../../types/round';
import { RoundRelationshipRead } from '../../../../types/roundRelationship';
import { FinalNodeRead } from '../../../../types/event';
import {
  isPersistedRoundCompleted,
  normalizeRoundStatus,
} from '../../../../utils/statusUtils';
import { getCompetitionMethodDisplayLabel } from '../../../../utils/competitionMethodDisplay';
import { resolvePodsAdvancementCount } from '../../formatEditor/podsMatchupsUtils';

// Node dimensions - increased for better visibility
const NODE_WIDTH = 320;
const NODE_HEIGHT = 180;
const CHAMPIONS_NODE_WIDTH = 360;
const CHAMPIONS_NODE_HEIGHT = 200;

// Layout direction
const LAYOUT_DIRECTION = 'LR'; // Left to Right

// Calculate dynamic spacing based on tournament complexity
const calculateSpacing = (nodeCount: number, edgeCount: number) => {
  const baseNodeSep = 160; // Increased to accommodate larger nodes
  const baseRankSep = 250; // Increased to accommodate larger nodes
  
  // Increase spacing for complex tournaments
  const complexityFactor = Math.max(1, Math.sqrt(edgeCount / nodeCount));
  
  return {
    nodesep: Math.max(baseNodeSep, baseNodeSep * complexityFactor),
    ranksep: Math.max(baseRankSep, baseRankSep * complexityFactor),
  };
};

/**
 * Create a React Flow node from round data
 */
export const createRoundNode = (
  round: RoundRead,
  relationships: RoundRelationshipRead[] = []
): Node => {
  // Determine if this is an initial or final round
  const isInitial = round.round_number === 1;
  const isFinal = false; // We'll determine this from relationships
  const competitionMethod =
    round.competition_method != null && String(round.competition_method).trim() !== ''
      ? String(round.competition_method)
      : 'eliminator';

  return {
    id: `round-${round.id}`,
    type: 'tournament-round',
    position: { x: 0, y: 0 }, // Will be set by layout
    data: {
      round_id: round.id,
      round_number: round.round_number,
      round_name: `Round ${round.round_number}`,
      friendly_name: round.friendly_name,
      status: round.status,
      participant_count: 0, // This will be populated dynamically
      advancement_count: 0, // This will be populated from relationships
      is_initial: isInitial,
      is_final: isFinal,
      allows_reentry: round.allows_reentry,
      competition_method: competitionMethod,
      competition_method_display_label: getCompetitionMethodDisplayLabel(competitionMethod, {
        roundId: round.id,
        relationships,
      }),
      merge_resolution_mode: round.merge_resolution_mode,
      merge_source_priority_relationship_ids: round.merge_source_priority_relationship_ids,
      has_game_conflict: false,
    },
    draggable: true,
  };
};

/**
 * Create a champions node
 */
export const createFinalNode = (
  finalNodeId: number,
  name: string,
  championshipCount: number = 3,
  description?: string | null
): Node => {
  const trimmed = description?.trim();
  return {
    id: `final-node-${finalNodeId}`,
    type: 'champions',
    position: { x: 0, y: 0 }, // Will be set by layout
    data: {
      final_node_id: finalNodeId,
      final_node_name: name,
      championship_count: championshipCount,
      ...(trimmed ? { description: trimmed } : {}),
    },
    draggable: true,
  };
};

/**
 * Create a React Flow edge from relationship data
 */
export const createRelationshipEdge = (
  relationship: RoundRelationshipRead,
  edgeIndex: number,
  totalEdges: number,
  sourceHandle?: string,
  targetHandle?: string,
  sourceRound?: RoundRead | null
): Edge => {
  const sourceId = `round-${relationship.source_round_id}`;
  const targetId = relationship.target_round_id
    ? `round-${relationship.target_round_id}`
    : `final-node-${relationship.final_node_id}`;

  // Always use tournament-edge for consistent custom styling and coloring
  const edgeType = 'tournament-edge';

  // Create unique edge ID to prevent conflicts
  const edgeId = `relationship-${relationship.id}-${relationship.source_round_id}-to-${relationship.target_round_id || `final-node-${relationship.final_node_id}`}`;

  const sourceMethod = String(sourceRound?.competition_method ?? '').toLowerCase();
  const isPodsSource = sourceMethod === 'pods';
  const podsAdvanceTotal =
    isPodsSource && sourceRound
      ? resolvePodsAdvancementCount({
          methodConfig: (sourceRound.competition_method_config || {}) as Record<string, unknown>,
        })
      : null;
  const participantCount =
    podsAdvanceTotal != null && podsAdvanceTotal > 0
      ? podsAdvanceTotal
      : relationship.advancement_count || 0;

  return {
    id: edgeId,
    source: sourceId,
    target: targetId,
    type: edgeType,
    data: {
      relationship_id: relationship.id,
      target_round_id: relationship.target_round_id,
      final_node_id: relationship.final_node_id,
      advancement_filter: relationship.advancement_filter,
      description: relationship.description,
      participant_count: participantCount,
      source_competition_method: sourceMethod || null,
    },
    animated: false,
    style: {
      strokeWidth: 2, // Reduced from 3 to make relationships smaller
    },
    // Add source and target handles for complex relationships
    sourceHandle: sourceHandle,
    targetHandle: targetHandle,
  };
};

/**
 * Calculate graph bounds for proper sizing
 */
export const calculateGraphBounds = (nodes: Node[]) => {
  if (nodes.length === 0) return { width: 800, height: 600 };

  const minX = Math.min(...nodes.map(n => n.position.x));
  const maxX = Math.max(...nodes.map(n => n.position.x + (n.type === 'champions' ? CHAMPIONS_NODE_WIDTH : NODE_WIDTH)));
  const minY = Math.min(...nodes.map(n => n.position.y));
  const maxY = Math.max(...nodes.map(n => n.position.y + (n.type === 'champions' ? CHAMPIONS_NODE_HEIGHT : NODE_HEIGHT)));

  const width = maxX - minX + 100; // Add padding
  const height = maxY - minY + 100; // Add padding

  return { width, height };
};

/**
 * Apply automatic layout using Dagre
 */
export const applyDagreLayout = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[], bounds: { width: number, height: number } } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Calculate dynamic spacing
  const spacing = calculateSpacing(nodes.length, edges.length);

  // Configure the graph with improved spacing
  dagreGraph.setGraph({
    rankdir: LAYOUT_DIRECTION,
    nodesep: spacing.nodesep,    // Increased horizontal spacing
    ranksep: spacing.ranksep,    // Increased vertical spacing
    marginx: 80,                 // Increased margin
    marginy: 80,                 // Increased margin
    edgesep: 40,                 // Add edge separation
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    const width = node.type === 'champions' ? CHAMPIONS_NODE_WIDTH : NODE_WIDTH;
    const height = node.type === 'champions' ? CHAMPIONS_NODE_HEIGHT : NODE_HEIGHT;
    
    dagreGraph.setNode(node.id, {
      width,
      height,
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply the layout
  dagre.layout(dagreGraph);

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.type === 'champions' ? CHAMPIONS_NODE_WIDTH : NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (node.type === 'champions' ? CHAMPIONS_NODE_HEIGHT : NODE_HEIGHT) / 2,
      },
    };
  });

  // Calculate bounds for proper sizing
  const bounds = calculateGraphBounds(layoutedNodes);

  return { nodes: layoutedNodes, edges, bounds };
};

/**
 * Create nodes and edges from tournament data
 */
export const createTournamentFlow = (
  rounds: RoundRead[],
  relationships: RoundRelationshipRead[],
  finalNodes: FinalNodeRead[] = []
): { nodes: Node[], edges: Edge[], bounds: { width: number, height: number } } => {
  const roundById = new Map(rounds.map((round) => [round.id, round]));

  // Create round nodes
  const roundNodes = rounds.map((round) => createRoundNode(round, relationships));
  roundNodes.forEach((node) => {
    const r = roundById.get(node.data.round_id);
    if (!r) return;
    const cfg = (r.competition_method_config || {}) as Record<string, unknown>;
    const mGc = Number(cfg.game_count || 0);
    const rGc = Number(r.game_count);
    const hasConfiguredMergeMode = Boolean(r.merge_resolution_mode);
    const gameMismatch = mGc > 0 && mGc !== rGc;
    if (gameMismatch && !hasConfiguredMergeMode) {
      node.data.has_game_conflict = true;
    }
  });
  
  const finalNodeMap = new Map(finalNodes.map((node) => [node.id, node]));
  const idsFromRelationships = new Set(
    relationships
      .filter((rel) => !rel.target_round_id && rel.final_node_id)
      .map((rel) => rel.final_node_id as number)
  );
  const idsFromApi = new Set(finalNodes.map((n) => n.id));
  const finalNodeIds = Array.from(new Set([...idsFromRelationships, ...idsFromApi])).sort(
    (a, b) => {
      const ma = finalNodeMap.get(a);
      const mb = finalNodeMap.get(b);
      const oa = ma?.display_order ?? 0;
      const ob = mb?.display_order ?? 0;
      if (oa !== ob) return oa - ob;
      return a - b;
    }
  );
  const exitNodes = finalNodeIds.map((id) => {
    const rels = relationships.filter(rel => rel.final_node_id === id);
    const model = finalNodeMap.get(id);
    const fromPlacement =
      model?.placement_count != null && model.placement_count > 0
        ? model.placement_count
        : null;
    const fromRels = rels.reduce((total, rel) => total + (rel.advancement_count || 1), 0);
    const championshipCount = fromPlacement ?? (fromRels || 1);
    return createFinalNode(
      id,
      model?.name || `Final Node ${id}`,
      championshipCount || 1,
      model?.description
    );
  });
  const nodes = [...roundNodes, ...exitNodes];

  // Remove duplicate relationships (same source, target, and advancement_filter)
  const uniqueRelationships = relationships.filter((rel, index, arr) => {
    const key = `${rel.source_round_id}-${rel.target_round_id || `final-${rel.final_node_id}`}-${rel.advancement_filter}`;
    return arr.findIndex(r => 
      `${r.source_round_id}-${r.target_round_id || `final-${r.final_node_id}`}-${r.advancement_filter}` === key
    ) === index;
  });

  // Group relationships by source node to assign different handles
  const relationshipsBySource = new Map<number, RoundRelationshipRead[]>();
  uniqueRelationships.forEach(rel => {
    if (!relationshipsBySource.has(rel.source_round_id)) {
      relationshipsBySource.set(rel.source_round_id, []);
    }
    relationshipsBySource.get(rel.source_round_id)!.push(rel);
  });

  // Group relationships by target node to assign different handles
  const relationshipsByTarget = new Map<string, RoundRelationshipRead[]>();
  uniqueRelationships.forEach(rel => {
    const targetKey = rel.target_round_id ? rel.target_round_id.toString() : `final-${rel.final_node_id}`;
    if (!relationshipsByTarget.has(targetKey)) {
      relationshipsByTarget.set(targetKey, []);
    }
    relationshipsByTarget.get(targetKey)!.push(rel);
  });

  // Create relationship edges with handle assignments
  const edges: Edge[] = [];
  const handlePositions = ['top', 'center', 'bottom'];
  
  relationshipsBySource.forEach((rels, sourceId) => {
    rels.forEach((rel, sourceIndex) => {
      // Find this relationship's index among all relationships targeting the same node
      const targetKey = rel.target_round_id ? rel.target_round_id.toString() : `final-${rel.final_node_id}`;
      const targetRels = relationshipsByTarget.get(targetKey) || [];
      const targetIndex = targetRels.findIndex(r => r.id === rel.id);
      
      // Assign handles based on indices, cycling through available positions
      const sourceHandle = rels.length > 1 ? `source-${handlePositions[sourceIndex % handlePositions.length]}` : undefined;
      const targetHandle = targetRels.length > 1 ? `target-${handlePositions[targetIndex % handlePositions.length]}` : undefined;
      
      const edge = createRelationshipEdge(
        rel,
        sourceIndex,
        rels.length,
        sourceHandle,
        targetHandle,
        roundById.get(sourceId) ?? null
      );
      edges.push(edge);
    });
  });

  // Apply automatic layout
  return applyDagreLayout(nodes, edges);
};

/**
 * Get tournament flow statistics
 */
export const getTournamentFlowStats = (
  rounds: RoundRead[],
  relationships: RoundRelationshipRead[]
) => {
  const totalRounds = rounds.length;
  const totalParticipants = rounds.reduce((sum, round) => sum + (round.game_count || 0), 0);
  const completedRounds = rounds.filter((round) =>
    isPersistedRoundCompleted(round.status)
  ).length;
  const activeRounds = rounds.filter(
    (round) => normalizeRoundStatus(round.status) === 'in_progress'
  ).length;
  const championshipRelationships = relationships.filter(rel => rel.target_round_id === null).length;

  return {
    totalRounds,
    totalParticipants,
    completedRounds,
    activeRounds,
    championshipRelationships,
    completionPercentage: totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0,
  };
}; 