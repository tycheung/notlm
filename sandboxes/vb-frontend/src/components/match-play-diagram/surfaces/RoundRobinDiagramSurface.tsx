import React from 'react';
import type { FormatScoringSurfaceProps } from '../../event-scoring/types';
import { buildRoundRobinDiagram } from '../adapters/roundRobin';
import MatchPlayDiagramScoringSurface from './MatchPlayDiagramScoringSurface';
import PositionRoundBreakPanel from './PositionRoundBreakPanel';

const RoundRobinDiagramSurface: React.FC<FormatScoringSurfaceProps> = (props) => (
  <div className="space-y-4">
    {props.selectedRoundId != null && (
      <PositionRoundBreakPanel
        roundId={props.selectedRoundId}
        isTeamEvent={props.isTeamEvent}
        matchSeries={props.matchSeries}
        roundParticipants={props.roundParticipants}
        allGames={props.allGames}
        positionRoundGame={props.positionRoundGame}
        scheduledGames={props.scheduledGames}
      />
    )}
    <MatchPlayDiagramScoringSurface
      {...props}
      buildDiagram={buildRoundRobinDiagram}
      emptySeriesMessage="No round robin matches yet. Lock squads to generate pairings."
    />
  </div>
);

export default RoundRobinDiagramSurface;
