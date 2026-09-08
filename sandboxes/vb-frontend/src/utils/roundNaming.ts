import { RoundRead } from '../types/round';
import { RoundRelationshipWithRounds, AdvancementFilter } from '../types/roundRelationship';

export interface RoundNameUpdate {
  roundId: number;
  suggestedName: string;
}

/**
 * Generate default round names based on tournament structure
 * @param rounds - Array of all rounds in the event
 * @param relationships - Array of all relationships between rounds
 * @returns Array of round name updates
 */
export const generateDefaultRoundNames = (
  rounds: RoundRead[],
  relationships: RoundRelationshipWithRounds[]
): RoundNameUpdate[] => {
  if (!rounds || rounds.length === 0) return [];

  // Sort rounds by round_number
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);
  
  // Create maps for easier lookup
  const roundMap = new Map(sortedRounds.map(r => [r.id, r]));
  const nameUpdates: RoundNameUpdate[] = [];
  
  // Find initial rounds (rounds with no source relationships)
  const targetRoundIds = new Set(relationships.map(r => r.target_round_id).filter(Boolean));
  const initialRounds = sortedRounds.filter(r => !targetRoundIds.has(r.id));
  
  // Find final rounds (rounds with final-node exit relationships)
  const finalRoundIds = new Set(
    relationships
      .filter(r => r.final_node_id != null)
      .map(r => r.source_round_id)
  );
  
  // Find losers bracket rounds (rounds that come from LOSERS advancement)
  const losersBracketRoundIds = new Set(
    relationships
      .filter(r => r.advancement_filter === AdvancementFilter.LOSERS)
      .map(r => r.target_round_id)
      .filter(Boolean)
  );
  
  // Build the tournament tree structure
  const childrenMap = new Map<number, number[]>();
  const parentsMap = new Map<number, number[]>();
  
  relationships.forEach(rel => {
    if (rel.target_round_id) {
      if (!childrenMap.has(rel.source_round_id)) {
        childrenMap.set(rel.source_round_id, []);
      }
      childrenMap.get(rel.source_round_id)!.push(rel.target_round_id);
      
      if (!parentsMap.has(rel.target_round_id)) {
        parentsMap.set(rel.target_round_id, []);
      }
      parentsMap.get(rel.target_round_id)!.push(rel.source_round_id);
    }
  });
  
  // Generate names for each round
  for (const round of sortedRounds) {
    let suggestedName = '';
    
    // Check if it's the first round (qualifying)
    if (initialRounds.includes(round)) {
      suggestedName = 'Qualifying';
    }
    // Check if it's a final round
    else if (finalRoundIds.has(round.id)) {
      suggestedName = 'Finals';
    }
    // Check if it's a losers bracket round
    else if (losersBracketRoundIds.has(round.id)) {
      suggestedName = 'Last Chance';
    }
    // Check if it's the round before finals (semi-finals)
    else if (isRoundBeforeFinals(round.id, childrenMap, finalRoundIds, 1)) {
      suggestedName = 'Semi-Finals';
    }
    // Check if it's the round before semi-finals (quarter-finals)
    else if (isRoundBeforeFinals(round.id, childrenMap, finalRoundIds, 2)) {
      suggestedName = 'Quarter-Finals';
    }
    // Otherwise, generate a sequential name
    else {
      const roundPosition = calculateRoundPosition(round.id, initialRounds, childrenMap, parentsMap);
      suggestedName = `Round ${roundPosition}`;
    }
    
    nameUpdates.push({
      roundId: round.id,
      suggestedName
    });
  }
  
  return nameUpdates;
};

/**
 * Check if a round is N steps before finals
 */
function isRoundBeforeFinals(
  roundId: number,
  childrenMap: Map<number, number[]>,
  finalRoundIds: Set<number>,
  stepsBeforeFinals: number
): boolean {
  const visited = new Set<number>();
  
  function hasPathToFinals(currentRoundId: number, steps: number): boolean {
    if (visited.has(currentRoundId)) return false;
    if (steps === 0) return finalRoundIds.has(currentRoundId);
    
    visited.add(currentRoundId);
    const children = childrenMap.get(currentRoundId) || [];
    
    for (const childId of children) {
      if (hasPathToFinals(childId, steps - 1)) {
        return true;
      }
    }
    
    return false;
  }
  
  return hasPathToFinals(roundId, stepsBeforeFinals);
}

/**
 * Calculate the position of a round in the tournament flow
 */
function calculateRoundPosition(
  roundId: number,
  initialRounds: RoundRead[],
  childrenMap: Map<number, number[]>,
  parentsMap: Map<number, number[]>
): number {
  // Find the shortest path from any initial round to this round
  let minDistance = Infinity;
  
  for (const initialRound of initialRounds) {
    const distance = findShortestPath(initialRound.id, roundId, childrenMap);
    if (distance !== -1 && distance < minDistance) {
      minDistance = distance;
    }
  }
  
  // If we found a path, return the position (distance + 2 because we start from "Round 2")
  // If no path found, fall back to round number
  return minDistance !== Infinity ? minDistance + 2 : roundId;
}

/**
 * Find the shortest path between two rounds using BFS
 */
function findShortestPath(
  startRoundId: number,
  targetRoundId: number,
  childrenMap: Map<number, number[]>
): number {
  if (startRoundId === targetRoundId) return 0;
  
  const queue: [number, number][] = [[startRoundId, 0]];
  const visited = new Set<number>();
  
  while (queue.length > 0) {
    const [currentRoundId, distance] = queue.shift()!;
    
    if (visited.has(currentRoundId)) continue;
    visited.add(currentRoundId);
    
    const children = childrenMap.get(currentRoundId) || [];
    
    for (const childId of children) {
      if (childId === targetRoundId) {
        return distance + 1;
      }
      
      if (!visited.has(childId)) {
        queue.push([childId, distance + 1]);
      }
    }
  }
  
  return -1; // No path found
}

/**
 * Check if default round names should be used (utility function)
 */
export const shouldUseDefaultNames = (useDefaultNames: boolean): boolean => {
  return useDefaultNames;
};

/**
 * Apply default names to rounds
 */
export const applyDefaultNamesToRounds = (
  rounds: RoundRead[],
  relationships: RoundRelationshipWithRounds[]
): RoundRead[] => {
  const nameUpdates = generateDefaultRoundNames(rounds, relationships);
  const nameUpdateMap = new Map(nameUpdates.map(u => [u.roundId, u.suggestedName]));
  
  return rounds.map(round => ({
    ...round,
    friendly_name: nameUpdateMap.get(round.id) || round.friendly_name
  }));
}; 