import { describe, expect, it } from 'vitest';
import { SideActionType } from '../../../src/types/side_action';
import { reportsForType } from '../../../src/components/side_actions/reports/reportMenuDefs';

describe('reportsForType', () => {
  it('includes High Series reports for HIGH_SET openers', () => {
    const ids = reportsForType(SideActionType.HIGH_SET).map((r) => r.id);
    expect(ids).toContain('high_set_entry_summary');
    expect(ids).toContain('high_set');
    expect(ids).not.toContain('high_game');
  });

  it('includes High Game reports for HIGH_GAME openers', () => {
    const ids = reportsForType(SideActionType.HIGH_GAME).map((r) => r.id);
    expect(ids).toContain('signup_sheet');
    expect(ids).toContain('payout');
    expect(ids).toContain('high_game');
    expect(ids).toContain('high_game_entry_summary');
    expect(ids).not.toContain('eliminator');
  });

  it('includes Eliminator reports for ELIMINATOR openers', () => {
    const ids = reportsForType(SideActionType.ELIMINATOR).map((r) => r.id);
    expect(ids).toContain('eliminator');
    expect(ids).toContain('eliminator_entry_summary');
    expect(ids).not.toContain('high_game');
  });

  it('includes Alibi Doubles reports including 4-up signup slips', () => {
    const ids = reportsForType(SideActionType.ALIBI_DOUBLES).map((r) => r.id);
    expect(ids).toContain('alibi_doubles_entry_summary');
    expect(ids).toContain('alibi_doubles');
    expect(ids).toContain('alibi_doubles_signup_slips');
    expect(ids).toContain('payout');
    expect(ids).not.toContain('love_doubles');
  });
});
