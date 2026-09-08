import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoundGameCountControls from '../../../src/components/event-scoring/RoundGameCountControls';

describe('RoundGameCountControls', () => {
  it('calls onIncrement when + is clicked', () => {
    const onIncrement = vi.fn();
    render(
      <RoundGameCountControls
        gameCount={2}
        canAdjust
        games={[]}
        onIncrement={onIncrement}
        onDecrement={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Add game'));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('opens confirm dialog when minus is clicked', () => {
    render(
      <RoundGameCountControls
        gameCount={2}
        canAdjust
        games={[]}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
      />
    );
    fireEvent.click(screen.getAllByLabelText('Remove game 2')[0]);
    expect(screen.getByRole('dialog', { name: 'Remove Game 2?' })).toBeInTheDocument();
  });
});
