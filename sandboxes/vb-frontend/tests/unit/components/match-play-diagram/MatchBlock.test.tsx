import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MatchBlock from '../../../../src/components/match-play-diagram/shared/MatchBlock';
import { MATCH_BLOCK_HEIGHT } from '../../../../src/components/match-play-diagram/shared/constants';

afterEach(() => cleanup());

const participants = [
  { side: 0 as const, name: 'Lane 11', scores: [{ gameIndex: 1, score: 188, gameId: 1, disabled: false }] },
  { side: 1 as const, name: 'Lane 33', scores: [{ gameIndex: 1, score: 188, gameId: 2, disabled: false }] },
] as const;

describe('MatchBlock', () => {
  it('keeps tied pick-winner controls inside the fixed diagram height without duplicating names', () => {
    const onResolveWinner = vi.fn();
    render(
      <MatchBlock
        label="Bracket Match 1"
        status="in_progress"
        participants={[...participants]}
        height={MATCH_BLOCK_HEIGHT}
        showResolveWinner
        onResolveWinner={onResolveWinner}
      />
    );

    expect(screen.getByTestId('manual-winner-panel')).toHaveTextContent('Tied — pick winner');
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
    expect(screen.getAllByText('Lane 11')).toHaveLength(1);
    expect(screen.getAllByText('Lane 33')).toHaveLength(1);
    expect(screen.getByLabelText('Advance Lane 11')).toHaveTextContent('Win');
    expect(screen.getByLabelText('Advance Lane 33')).toHaveTextContent('Win');

    fireEvent.click(screen.getByTestId('win-toggle-1'));
    expect(onResolveWinner).toHaveBeenCalledWith(1);
  });
});
