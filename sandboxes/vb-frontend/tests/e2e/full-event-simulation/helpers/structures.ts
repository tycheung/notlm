export type FinalMethod =
  | 'eliminator'
  | 'bracket'
  | 'double_elimination'
  | 'stepladder'
  | 'round_robin'
  | 'pods';

export type BundleConfig = {
  id: string;
  label: string;
  eventFormat: 'singles' | 'teams';
  finalMethod: FinalMethod;
  /** How many advance from qualifying into the final. */
  advancementCount: number;
  entrantCount: number;
};

const SQUAD_CAP = 128;

export function advancementFor(method: FinalMethod): number {
  switch (method) {
    case 'eliminator':
      return 32;
    case 'bracket':
      return 32;
    case 'double_elimination':
      return 16;
    case 'stepladder':
      return 5;
    case 'round_robin':
      return 8;
    case 'pods':
      return 16;
    default:
      return 32;
  }
}

function squad(name: string) {
  return [{ name, max_participants: SQUAD_CAP }];
}

function finalRoundPayload(method: FinalMethod) {
  switch (method) {
    case 'eliminator':
      return {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Final Eliminator',
        game_count: 1,
        score_type: 'total_pin_fall',
        competition_method: 'eliminator',
        competition_method_config: {
          game_count: 1,
          seed_source_mode: 'feeder',
        },
        squads: squad('Final Eliminator Squad'),
      };
    case 'bracket':
      return {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Single Elim Final',
        game_count: 3,
        score_type: 'match_play',
        race_to_wins: 2,
        max_games: 3,
        competition_method: 'bracket',
        competition_method_config: {
          game_count: 1,
          series_decision_mode: 'race_to_wins',
          race_to_wins: 2,
          bracket_mode: 'single_elimination',
          seed_mode: 'by_seed',
          seed_source_mode: 'feeder',
          placement_resolution_mode: 'stats',
          game_style: 'standard',
        },
        squads: squad('Single Elim Final Squad'),
      };
    case 'double_elimination':
      return {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Double Elim Final',
        game_count: 3,
        score_type: 'match_play',
        race_to_wins: 2,
        max_games: 3,
        competition_method: 'bracket',
        competition_method_config: {
          game_count: 1,
          series_decision_mode: 'race_to_wins',
          race_to_wins: 2,
          bracket_mode: 'double_elimination',
          seed_mode: 'by_seed',
          seed_source_mode: 'feeder',
          placement_resolution_mode: 'stats',
          game_style: 'standard',
        },
        squads: squad('Double Elim Final Squad'),
      };
    case 'stepladder':
      return {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Stepladder Final',
        game_count: 2,
        score_type: 'match_play',
        competition_method: 'stepladder',
        competition_method_config: {
          game_count: 2,
          series_decision_mode: 'games_total',
          seed_source_mode: 'feeder',
          game_style: 'standard',
        },
        squads: squad('Stepladder Final Squad'),
      };
    case 'round_robin':
      return {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Round Robin Final',
        game_count: 1,
        score_type: 'match_play',
        competition_method: 'round_robin',
        competition_method_config: {
          game_count: 1,
          schedule_mode: 'league',
          scheduled_games: 8,
          total_matches_or_games: 8,
          games_per_match: 1,
          series_decision_mode: 'games_total',
          seed_source_mode: 'feeder',
          placement_resolution_mode: 'stats',
          game_style: 'standard',
        },
        squads: squad('Round Robin Final Squad'),
      };
    case 'pods':
      return {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Pods Final',
        game_count: 1,
        score_type: 'total_pin_fall',
        competition_method: 'pods',
        competition_method_config: {
          game_count: 1,
          series_decision_mode: 'games_total',
          pod_size: 4,
          pod_size_min: 4,
          pod_size_max: 4,
          advance_by_size: { '4': 2 },
          balance_mode: 'by_seed',
          remainder_mode: 'even',
          seed_source_mode: 'feeder',
          placement_resolution_mode: 'stats',
          game_style: 'standard',
        },
        squads: squad('Pods Final Squad'),
      };
    default:
      throw new Error(`Unknown final method: ${method}`);
  }
}

function finalToChampionshipAdvancementType(method: FinalMethod): string {
  if (method === 'eliminator' || method === 'pods') return 'total_pinfall';
  if (method === 'round_robin') return 'match_winners';
  return 'elimination_order';
}

function championshipAdvancementCount(method: FinalMethod, fromQual: number): number {
  if (method === 'pods') {
    // 16 into pods of 4, top 2 per pod → 8.
    return Math.floor(fromQual / 2) || 1;
  }
  return Math.min(8, Math.max(1, Math.floor(fromQual / 2) || 1));
}

/** v2 event structure: Qualifying eliminator → Final → Championship node. */
export function buildTwoStageStructure(
  method: FinalMethod,
  advancementCount: number,
  isTeams: boolean
): Record<string, unknown> {
  const final = finalRoundPayload(method);
  const placementCount = championshipAdvancementCount(method, advancementCount);
  const rawSteps = [
    { position: 1, percentage: 40.0 },
    { position: 2, percentage: 25.0 },
    { position: 3, percentage: 15.0 },
    { position: 4, percentage: 10.0 },
    { position: 5, percentage: 5.0 },
    { position: 6, percentage: 5.0 },
    { position: 7, percentage: 0.0 },
    { position: 8, percentage: 0.0 },
  ].slice(0, placementCount);
  const sum = rawSteps.reduce((a, s) => a + s.percentage, 0) || 1;
  const prize_allocation_steps = rawSteps.map((s, idx) => {
    if (idx === rawSteps.length - 1) {
      const prior = rawSteps
        .slice(0, -1)
        .reduce((a, x) => a + (x.percentage / sum) * 100, 0);
      return {
        position: s.position,
        percentage: Math.round((100 - prior) * 100) / 100,
      };
    }
    return {
      position: s.position,
      percentage: Math.round((s.percentage / sum) * 10000) / 100,
    };
  });

  return {
    version: 2,
    rounds: [
      {
        ref: 'qual',
        round_number: 1,
        friendly_name: 'Qualifying',
        game_count: 1,
        score_type: 'total_pin_fall',
        competition_method: 'eliminator',
        competition_method_config: { game_count: 1 },
        squads: [{ name: 'Qual Squad', max_participants: isTeams ? 150 : 150 }],
      },
      final,
    ],
    final_nodes: [
      {
        ref: 'championship',
        name: 'Championship',
        placement_count: placementCount,
        node_pool_type: 'percentage',
        node_pool_value: 100.0,
        prize_allocation_steps,
      },
    ],
    relationships: [
      {
        source_ref: 'qual',
        target_ref: 'final',
        advancement_filter: 'winners',
        advancement_count: advancementCount,
        advancement_type: 'total_pinfall',
        seed_source_mode: 'feeder',
      },
      {
        source_ref: 'final',
        target_final_ref: 'championship',
        advancement_filter: 'winners',
        advancement_count: placementCount,
        advancement_type: finalToChampionshipAdvancementType(method),
        advancement_score_scope: 'source_round',
      },
    ],
  };
}

export const SCORING_SURFACE_HINT: Record<FinalMethod, RegExp> = {
  eliminator: /Qualifier|Eliminator|Game Scoring|score/i,
  bracket: /Bracket Match Tree|single.?elim|Bracket/i,
  double_elimination: /Bracket Match Tree|double.?elim|Bracket|Winners|Losers/i,
  stepladder: /Stepladder Ladder|Stepladder|games total/i,
  round_robin: /Round Robin Match List|Round Robin|league/i,
  pods: /Each pod bowls together|Pod 1|top .* advance/i,
};
