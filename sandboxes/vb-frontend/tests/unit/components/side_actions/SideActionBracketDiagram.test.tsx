import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SideActionBracketDiagram from '../../../../src/components/side_actions/SideActionBracketDiagram';
import type { Bracket } from '../../../../src/utils/bracketEngine/types';

function sampleBracket(): Bracket {
  return {
    id: 0,
    seating: [1, 2, 3, 4, 5, 6, 7, 8],
    rounds: [
      {
        matches: [
          { id: 'g1-0', p1: 1, p2: 8, s1: '220', s2: '200', winner: 1, tie: false },
          { id: 'g1-1', p1: 2, p2: 7, s1: '', s2: '', winner: null, tie: false },
          { id: 'g1-2', p1: 3, p2: 6, s1: '190', s2: '185', winner: 3, tie: false },
          { id: 'g1-3', p1: 4, p2: 7, s1: '210', s2: '205', winner: 4, tie: false },
        ],
      },
      {
        matches: [
          { id: 'g2-0', p1: 1, p2: 2, s1: '', s2: '', winner: null, tie: false },
          { id: 'g2-1', p1: 3, p2: 4, s1: '', s2: '', winner: null, tie: false },
        ],
      },
      {
        matches: [{ id: 'final', p1: null, p2: null, s1: '', s2: '', winner: null, tie: false }],
      },
    ],
  };
}

const names = {
  1: 'Alice',
  2: 'Bob',
  3: 'Carol',
  4: 'Dave',
  8: 'Henry',
};

describe('SideActionBracketDiagram', () => {
  it('renders 4→2→1 column tree with resolved display names', () => {
    render(
      <SideActionBracketDiagram bracket={sampleBracket()} userDisplayNames={names} />
    );
    expect(screen.getByText('Game 1')).toBeInTheDocument();
    expect(screen.getByText('Game 2')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByText('220')).toBeInTheDocument();
    expect(screen.getAllByText('TBD').length).toBeGreaterThan(0);
  });
});
