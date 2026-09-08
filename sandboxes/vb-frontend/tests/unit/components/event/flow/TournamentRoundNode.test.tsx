import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import TournamentRoundNode from '../../../../../src/components/event/flow/nodes/TournamentRoundNode';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

describe('TournamentRoundNode', () => {
  it('fires merge-resolution callback when conflict warning clicked', () => {
    const onMergeWarningClick = vi.fn();
    render(
      <TournamentRoundNode
        id="node-1"
        type="tournament-round"
        selected={false}
        isConnectable={false}
        xPos={0}
        yPos={0}
        dragging={false}
        zIndex={0}
        data={{
          round_id: 42,
          round_number: 2,
          status: 'scheduled',
          participant_count: 10,
          advancement_count: 4,
          is_initial: false,
          is_final: false,
          has_game_conflict: true,
          onMergeWarningClick,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '!' }));
    expect(onMergeWarningClick).toHaveBeenCalledWith(42);
  });
});
