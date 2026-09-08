import { describe, expect, it } from 'vitest';

import {
  effectiveConfigLabel,
  effectiveEntryFeeLabel,
  effectiveGamesLabel,
  effectivePrizeDistribution,
  VARIES_BY_SQUAD,
} from '@/features/side-actions/shared';
import { SideActionStatus, SideActionType, type SideAction } from '@/types/side_action';

const sideAction = {
  id: 7,
  side_action_type: SideActionType.HIGH_GAME,
  game_numbers: [1, 2, 3],
  entry_fee: 10,
  prize_distribution: { '1': 30 },
  type_config: { payout_mode: 'per_game' },
  pools: [
    {
      id: 11,
      side_action_id: 7,
      squad_id: 1,
      squad_name: 'Morning',
      is_enabled: true,
      status: SideActionStatus.REGISTRATION_OPEN,
      override_config: {},
      game_numbers: [1, 2, 3],
      entry_fee: 10,
    },
    {
      id: 12,
      side_action_id: 7,
      squad_id: 2,
      squad_name: 'Evening',
      is_enabled: true,
      status: SideActionStatus.REGISTRATION_OPEN,
      override_config: {
        entry_fee: 12,
        prize_distribution: { '1': 45 },
        type_config: { payout_mode: 'combined' },
      },
      game_numbers: [4, 5],
      entry_fee: 12,
    },
  ],
} as SideAction;

describe('effective pool presentation', () => {
  it('uses an exact varies label when enabled pools differ', () => {
    expect(effectiveGamesLabel(sideAction)).toBe(VARIES_BY_SQUAD);
    expect(effectiveEntryFeeLabel(sideAction)).toBe(VARIES_BY_SQUAD);
    expect(
      effectiveConfigLabel(sideAction, (config) => String(config.payout_mode))
    ).toBe(VARIES_BY_SQUAD);
  });

  it('uses the selected pool prize override', () => {
    expect(effectivePrizeDistribution(sideAction, 12)).toEqual({ '1': 45 });
    expect(effectivePrizeDistribution(sideAction, 11)).toEqual({ '1': 30 });
  });
});
