import { describe, expect, it } from 'vitest';
import {
  sideActionEnteredDisplay,
  teamSideActionEnteredDisplay,
  teamSideActionPerMemberTitle,
  teamSideActionWonDisplay,
  type BowlerFinancialEvent,
} from '@/pages/dashboard/bowlerFinancialEvents';

function row(overrides: Partial<BowlerFinancialEvent> = {}): BowlerFinancialEvent {
  return {
    event_id: 1,
    event_name: 'Singles',
    tournament_id: 1,
    tournament_name: 'Open',
    start_date: '2026-07-23T00:00:00',
    entry_fee: 0,
    entry_fee_paid: 0,
    prize_fund: 0,
    side_action_entries: 800,
    side_action_entry_fees: 4000,
    side_action_winnings: 0,
    team_size: 2,
    team_side_action_entries: 0,
    team_side_action_entry_fees: 0,
    team_side_action_winnings: 0,
    ...overrides,
  };
}

describe('sideActionEnteredDisplay', () => {
  it('shows only currency for an event, not ticket count', () => {
    expect(sideActionEnteredDisplay(row())).toBe('$4000.00');
  });

  it('shows a dash when the bowler entered no side action', () => {
    expect(
      sideActionEnteredDisplay(row({ side_action_entries: 0, side_action_entry_fees: 0 }))
    ).toBe('—');
  });
});

describe('team side action history display', () => {
  it('shows the full team amounts, not a per-member split', () => {
    const doubles = row({
      team_side_action_entries: 1,
      team_side_action_entry_fees: 100,
      team_side_action_winnings: 300,
      team_size: 2,
    });
    expect(teamSideActionEnteredDisplay(doubles)).toBe('$100.00');
    expect(teamSideActionWonDisplay(doubles)).toBe('$300.00');
  });

  it('hovers the equal split using that event team size', () => {
    expect(teamSideActionPerMemberTitle(100, 2)).toBe('$50 per team member');
    expect(teamSideActionPerMemberTitle(300, 2)).toBe('$150 per team member');
  });

  it('omits hover when there is no team money or team size', () => {
    expect(teamSideActionPerMemberTitle(0, 2)).toBeUndefined();
    expect(teamSideActionPerMemberTitle(100, 0)).toBeUndefined();
    expect(teamSideActionEnteredDisplay(row())).toBe('—');
    expect(teamSideActionWonDisplay(row())).toBe('—');
  });
});
