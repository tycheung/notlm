import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OrderedGameNumbersPicker,
  ScopeSummaryBanner,
  SquadScopeSection,
  sideActionQueryKeys,
} from '@/features/side-actions/shared';
import { SquadStatus, type SquadRead } from '@/types/squad';

afterEach(cleanup);

const squads: SquadRead[] = [
  {
    id: 1,
    name: 'Squad A',
    round_id: 10,
    start_datetime: '2026-07-16T09:00:00',
    max_participants: 24,
    game_count: 5,
    status: SquadStatus.SCHEDULED,
    allows_reentry: false,
    created_at: '2026-07-16T00:00:00',
    updated_at: '2026-07-16T00:00:00',
  },
  {
    id: 2,
    name: 'Squad B',
    round_id: 10,
    start_datetime: '2026-07-16T13:00:00',
    max_participants: 24,
    game_count: 5,
    status: SquadStatus.SCHEDULED,
    allows_reentry: false,
    created_at: '2026-07-16T00:00:00',
    updated_at: '2026-07-16T00:00:00',
  },
];

describe('side-action scope controls', () => {
  it('selects explicit squads', () => {
    const onSelected = vi.fn();
    render(
      <SquadScopeSection
        squads={squads}
        scopeMode="selected"
        selectedSquadIds={[1]}
        onScopeModeChange={vi.fn()}
        onSelectedSquadIdsChange={onSelected}
      />
    );

    fireEvent.click(screen.getByLabelText('Squad B'));
    expect(onSelected).toHaveBeenCalledWith([1, 2]);
  });

  it('preserves non-consecutive ordered games', () => {
    const onChange = vi.fn();
    render(
      <OrderedGameNumbersPicker
        selectedGameNumbers={[1, 4]}
        eventGameCount={5}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Game 5'));
    expect(onChange).toHaveBeenCalledWith([1, 4, 5]);
  });

  it('summarizes isolated selected pools', () => {
    render(
      <ScopeSummaryBanner
        scopeMode="selected"
        squads={squads}
        selectedSquadIds={[2]}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected-squads scope: Squad B (1 isolated pool)'
    );
  });

  it('keeps standings cache identity pool-specific', () => {
    expect(sideActionQueryKeys.standings('high_game', 7, 10)).not.toEqual(
      sideActionQueryKeys.standings('high_game', 7, 11)
    );
    expect(sideActionQueryKeys.bracketEngine(7, 10)).not.toEqual(
      sideActionQueryKeys.bracketEngine(7, 11)
    );
  });
});
