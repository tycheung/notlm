import React from 'react';
import type { FormatScoringSurfaceProps } from '../../event-scoring/types';
import { buildDoubleElimDiagram } from '../adapters/bracketDoubleElim';
import { buildSingleElimDiagram } from '../adapters/bracketSingleElim';
import MatchPlayDiagramScoringSurface from './MatchPlayDiagramScoringSurface';

const BracketDiagramSurface: React.FC<FormatScoringSurfaceProps> = (props) => {
  const isDouble = props.bracketMode === 'double_elimination';
  const buildDiagram = isDouble ? buildDoubleElimDiagram : buildSingleElimDiagram;

  return (
    <MatchPlayDiagramScoringSurface
      {...props}
      buildDiagram={buildDiagram}
      emptySeriesMessage="No bracket matches yet. Lock squads or advance entrants to generate the bracket."
    />
  );
};

export default BracketDiagramSurface;
