import React from 'react';
import EliminatorScoringSurface from './EliminatorScoringSurface';
import NonEliminatorErrorBoundary from './NonEliminatorErrorBoundary';
import BracketDiagramSurface from '../match-play-diagram/surfaces/BracketDiagramSurface';
import RoundRobinDiagramSurface from '../match-play-diagram/surfaces/RoundRobinDiagramSurface';
import StepladderDiagramSurface from '../match-play-diagram/surfaces/StepladderDiagramSurface';
import PodsPinfallScoringSurface from './PodsPinfallScoringSurface';
import type { FormatScoringSurfaceProps } from './types';

/**
 * Baker team league / qualifying uses the teams × games score sheet (tab order, bonus pins).
 * Bracket and stepladder must be scored on the match diagram so completing a match
 * can seat winners and create score shells for the next round.
 * Pods use simultaneous pinfall within each pod (not H2H match cards).
 */
function shouldUseTeamScoreSheet(props: FormatScoringSurfaceProps): boolean {
  if (props.method === 'stepladder' || props.method === 'bracket') return false;
  if (props.method === 'pods') return false;
  return Boolean(props.isTeamEvent && props.isBakerRound);
}

const ScoringSurfaceRouter: React.FC<FormatScoringSurfaceProps> = (props) => {
  const resetKey = `${props.method}-${props.selectedRoundId ?? 'none'}-${props.matchSeries.length}`;
  const wrap = (node: React.ReactNode) => (
    <NonEliminatorErrorBoundary resetKey={resetKey}>{node}</NonEliminatorErrorBoundary>
  );

  if (shouldUseTeamScoreSheet(props)) {
    return <EliminatorScoringSurface {...props} />;
  }

  switch (props.method) {
    case 'bracket':
      return wrap(<BracketDiagramSurface {...props} />);
    case 'stepladder':
      return wrap(<StepladderDiagramSurface {...props} />);
    case 'round_robin':
      return wrap(<RoundRobinDiagramSurface {...props} />);
    case 'pods':
      return wrap(<PodsPinfallScoringSurface {...props} />);
    case 'eliminator':
    default:
      return <EliminatorScoringSurface {...props} />;
  }
};

export default ScoringSurfaceRouter;
