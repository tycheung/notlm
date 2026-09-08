import React from 'react';
import type { FormatScoringSurfaceProps } from '../../event-scoring/types';
import { buildStepladderDiagram } from '../adapters/stepladder';
import MatchPlayDiagramScoringSurface from './MatchPlayDiagramScoringSurface';

const StepladderDiagramSurface: React.FC<FormatScoringSurfaceProps> = (props) => (
  <MatchPlayDiagramScoringSurface
    {...props}
    buildDiagram={buildStepladderDiagram}
    emptySeriesMessage="No stepladder matches yet. Lock squads or generate the ladder from Event Format."
  />
);

export default StepladderDiagramSurface;
