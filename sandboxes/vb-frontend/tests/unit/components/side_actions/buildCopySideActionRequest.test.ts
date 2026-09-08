import { describe, expect, it } from 'vitest';
import {
  SideActionStatus,
  SideActionType,
  type SideAction,
} from '@/types/side_action';
import {
  assertAllCopyGamesFitDestination,
  buildCopySideActionRequest,
  bulkCopySideActionName,
  copyGamesFitError,
  defaultCopySideActionName,
} from '@/components/side_actions/buildCopySideActionRequest';

function source(): SideAction {
  return {
    id: 9,
    tournament_id: 1,
    event_id: 2,
    name: 'Scratch 1-3',
    description: 'Qual pots',
    side_action_type: SideActionType.BRACKET,
    max_participants: 8,
    entry_fee: 20,
    house_cut_percentage: 0,
    house_cut_amount: 2,
    house_cut_type: 'amount',
    prize_type: 'amount',
    prize_distribution: { '1': 50, '2': 30 },
    status: SideActionStatus.REGISTRATION_OPEN,
    is_active: true,
    check_in_required: false,
    game_numbers: [1, 2, 3],
    squad_scope_mode: 'all',
    pools: [
      {
        id: 11,
        side_action_id: 9,
        squad_id: 101,
        squad_name: '9am',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 2, 3],
        entry_fee: 20,
      },
    ],
    type_config: { handicap_mode: 'scratch', game_order: 'asc' },
    custom_payout_structure: null,
    created_at: '2026-08-31T00:00:00',
    updated_at: '2026-08-31T00:00:00',
  };
}

describe('buildCopySideActionRequest', () => {
  it('defaults copy name with (copy) suffix', () => {
    expect(defaultCopySideActionName('Scratch 1-3')).toBe('Scratch 1-3 (copy)');
    expect(defaultCopySideActionName('Scratch 1-3 (copy)')).toBe(
      'Scratch 1-3 (copy)'
    );
  });

  it('clones shared settings onto one selected squad', () => {
    const payload = buildCopySideActionRequest(source(), {
      name: '1pm Scratch 1-3',
      squadId: 102,
    });
    expect(payload).toMatchObject({
      name: '1pm Scratch 1-3',
      tournament_id: 1,
      event_id: 2,
      side_action_type: SideActionType.BRACKET,
      entry_fee: 20,
      house_cut_amount: 2,
      game_numbers: [1, 2, 3],
      squad_scope_mode: 'selected',
      selected_squad_ids: [102],
      pool_overrides: {},
      type_config: { handicap_mode: 'scratch', game_order: 'asc' },
      prize_distribution: { '1': 50, '2': 30 },
    });
  });

  it('rejects empty name or squad', () => {
    expect(() =>
      buildCopySideActionRequest(source(), { name: '  ', squadId: 1 })
    ).toThrow(/name/i);
    expect(() =>
      buildCopySideActionRequest(source(), { name: 'Ok', squadId: 0 })
    ).toThrow(/squad/i);
  });

  it('keeps original names when bulk-copying to a different squad', () => {
    expect(
      bulkCopySideActionName('Scratch 1-3', {
        destinationSquadId: 102,
        sourceSquadIds: [101],
      })
    ).toBe('Scratch 1-3');
  });

  it('adds (copy) when bulk-copying onto the same squad only', () => {
    expect(
      bulkCopySideActionName('Scratch 1-3', {
        destinationSquadId: 101,
        sourceSquadIds: [101],
      })
    ).toBe('Scratch 1-3 (copy)');
  });

  it('rejects copy when destination is missing selected games', () => {
    const action = {
      ...source(),
      name: 'Scratch 2-4',
      game_numbers: [2, 3, 4],
      type_config: { handicap_mode: 'scratch', game_numbers: [2, 3, 4] },
    };
    const message = copyGamesFitError(action, {
      name: 'Final squad',
      gameCount: 3,
    });
    expect(message).toMatch(/do not exist/i);
    expect(message).toMatch(/game 4/i);
    expect(message).toMatch(/Final squad/);
    expect(message).toMatch(/1–3/);
  });

  it('allows copy when all games fit the destination', () => {
    expect(
      copyGamesFitError(source(), { name: '1pm', gameCount: 3 })
    ).toBeNull();
  });

  it('validates the whole bulk set before any create', () => {
    const bad = {
      ...source(),
      name: 'Scratch 2-4',
      game_numbers: [2, 3, 4],
    };
    expect(() =>
      assertAllCopyGamesFitDestination([source(), bad], {
        name: 'Short squad',
        gameCount: 3,
      })
    ).toThrow(/Scratch 2-4.*do not exist/i);
  });
});
