import { describe, expect, it } from 'vitest';
import { SideActionType } from '@/types/side_action';
import {
  applySideActionTemplatePayload,
  buildSideActionTemplatePayload,
} from '@/utils/sideActionTemplatePayload';

describe('sideActionTemplatePayload', () => {
  it('builds a portable payload without event/squad fields', () => {
    const payload = buildSideActionTemplatePayload({
      name: 'Morning Brackets',
      description: 'G1-3',
      entryFee: 5,
      maxParticipants: 8,
      houseCutPercentage: 0,
      houseCutAmount: 5,
      houseCutType: 'amount',
      prizeDistribution: { '1': 25, '2': 10 },
      prizeType: 'amount',
      gameNumbers: [1, 2, 3],
      typeConfig: { participant_count: 8, drop_mode: 'flat' },
    });
    expect(payload.suggested_name).toBe('Morning Brackets');
    expect(payload.entry_fee).toBe(5);
    expect(payload.game_numbers).toEqual([1, 2, 3]);
    expect(payload.type_config).toEqual({ participant_count: 8, drop_mode: 'flat' });
    expect(payload).not.toHaveProperty('tournament_id');
    expect(payload).not.toHaveProperty('squad_scope_mode');
  });

  it('clamps games to the current event and pads brackets to 3 when short', () => {
    const fields = applySideActionTemplatePayload(
      {
        entry_fee: 10,
        game_numbers: [1, 4, 9],
        type_config: { participant_count: 16 },
        prize_distribution: { '1': 40 },
      },
      {
        sideActionType: SideActionType.BRACKET,
        eventGameCount: 5,
      }
    );
    // 9 is dropped; [1,4] is not 3 games so pad to first 3 event games.
    expect(fields.gameNumbers).toEqual([1, 2, 3]);
    expect(fields.entryFee).toBe(10);
    expect(fields.typeConfig?.participant_count).toBe(16);
  });

  it('keeps a valid 3-game bracket window after clamp', () => {
    const fields = applySideActionTemplatePayload(
      { game_numbers: [2, 4, 5] },
      { sideActionType: SideActionType.BRACKET, eventGameCount: 5 }
    );
    expect(fields.gameNumbers).toEqual([2, 4, 5]);
  });

  it('forces mystery doubles to a single game', () => {
    const fields = applySideActionTemplatePayload(
      { game_numbers: [2, 3, 4], entry_fee: 15 },
      { sideActionType: SideActionType.MYSTERY_DOUBLES, eventGameCount: 5 }
    );
    expect(fields.gameNumbers).toEqual([2]);
  });

  it('keeps love doubles as a selected-game series', () => {
    const fields = applySideActionTemplatePayload(
      { game_numbers: [2, 3, 4], entry_fee: 15 },
      { sideActionType: SideActionType.LOVE_DOUBLES, eventGameCount: 5 }
    );
    expect(fields.gameNumbers).toEqual([2, 3, 4]);
  });

  it('keeps alibi doubles as a selected-game series', () => {
    const fields = applySideActionTemplatePayload(
      { game_numbers: [2, 3, 4], entry_fee: 15 },
      { sideActionType: SideActionType.ALIBI_DOUBLES, eventGameCount: 5 }
    );
    expect(fields.gameNumbers).toEqual([2, 3, 4]);
  });
});
