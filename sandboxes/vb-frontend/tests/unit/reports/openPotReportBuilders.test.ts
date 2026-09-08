import { afterEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import type { HighSetReport } from '@/api/side-actions';
import { buildHighSetReportDocument } from '@/components/side_actions/reports/buildHighSetReportDocument';
import { loadHighGameEffectiveOptions } from '@/components/side_actions/reports/openPotReportBuilders';
import { SideActionStatus, SideActionType } from '@/types/side_action';

afterEach(() => vi.restoreAllMocks());

describe('loadHighGameAvailableGames', () => {
  it('uses the selected pool effective games instead of top-level defaults', async () => {
    vi.spyOn(SideActionsAPI, 'getSideAction').mockResolvedValue({
      id: 7,
      tournament_id: 1,
      event_id: 2,
      name: 'High Game',
      side_action_type: SideActionType.HIGH_GAME,
      max_participants: 10000,
      entry_fee: 10,
      house_cut_percentage: 0,
      house_cut_type: 'amount',
      prize_type: 'amount',
      status: SideActionStatus.REGISTRATION_OPEN,
      is_active: true,
      check_in_required: false,
      game_numbers: [1, 2, 3],
      squad_scope_mode: 'all',
      type_config: { game_numbers: [1, 2, 3] },
      pools: [
        {
          id: 71,
          side_action_id: 7,
          squad_id: 8,
          squad_name: 'Evening',
          is_enabled: true,
          status: SideActionStatus.REGISTRATION_OPEN,
          override_config: {
            game_numbers: [4, 6],
            type_config: { payout_mode: 'combined' },
          },
          game_numbers: [4, 6],
          entry_fee: 10,
        },
      ],
      created_at: '',
      updated_at: '',
    });

    await expect(loadHighGameEffectiveOptions(7, 71)).resolves.toEqual({
      gameNumbers: [4, 6],
      payoutMode: 'combined',
    });
  });

  it('prints High Series columns from the selected pool effective games', () => {
    const document = buildHighSetReportDocument({
      report_type: 'high_set',
      side_action_id: 8,
      side_action_name: 'High Series',
      tournament_id: 1,
      tournament_name: 'Victory Open',
      event_id: 2,
      event_name: 'Singles',
      handicap_mode: 'scratch',
      series_mode: 'sum',
      game_numbers: [1, 2, 3],
      list_mode: 'all',
      fund: {
        entry_count: 1,
        entry_fee: 10,
        collected: 10,
        expenses: 0,
        prize_fund: 10,
        places_sum: 10,
        places_sum_all_games: 10,
      },
      sections: [
        {
          label: 'Evening · Series',
          pool_id: 71,
          squad_id: 8,
          squad_name: 'Evening',
          division: 'open',
          entry_count: 1,
          game_numbers: [4, 6],
          scoring_mode: 'sum',
          fund: {},
          is_complete: true,
          payout_ready: true,
          rows: [
            {
              user_id: 1,
              display_name: 'Pool Bowler',
              score: 480,
              game_scores: { '4': 240, '6': 240 },
              place: 1,
              payout: 10,
            },
          ],
        },
      ],
    } satisfies HighSetReport);

    expect(document.html).toContain('Games 4, 6');
    expect(document.html).toContain('>G4</th>');
    expect(document.html).toContain('>G6</th>');
    expect(document.html).not.toContain('>G1</th>');
  });
});
