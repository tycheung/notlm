import React from 'react';
import IndividualScoring from '../event/IndividualScoring';
import TeamScoring from '../event/TeamScoring';
import type { FormatScoringSurfaceProps } from './types';

const EliminatorScoringSurface: React.FC<FormatScoringSurfaceProps> = (props) => {
  if (props.isTeamEvent) {
    return (
      <TeamScoring
        squadCategories={props.squadCategories}
        gameCount={props.gameCount}
        advancementDestinationMap={props.advancementDestinationMap}
        onGameScoreChange={props.onGameScoreChange}
        onTemporaryGameScoreChange={props.onTemporaryGameScoreChange}
        pendingGameChanges={props.pendingGameChanges}
        expandedCategories={props.expandedCategories}
        onToggleCategory={props.onToggleCategory}
        isLoadingSquadParticipants={props.isLoadingSquadParticipants}
        loadingGames={props.loadingGames}
        getCurrentRoundGameCount={props.getCurrentRoundGameCount}
        getPendingGameValue={props.getPendingGameValue}
        hasGamePendingChanges={props.hasGamePendingChanges}
        getParticipantGames={props.getParticipantGames}
        getGameIdForParticipantAndGameNumber={props.getGameIdForParticipantAndGameNumber}
        getTeamGames={props.getTeamGames}
        getTeamGameIdForTeamAndGameNumber={props.getTeamGameIdForTeamAndGameNumber}
        allGames={props.allGames}
        squads={props.squads}
        tabMode={props.tabMode}
        participantSortOrder={props.participantSortOrder}
        enableScoringTabNavigation={true}
        teamScoringMode={props.teamScoringMode}
        isBakerRound={props.isBakerRound}
        handicapEnabled={props.handicapEnabled}
        handicapBaseScore={props.handicapBaseScore}
        handicapPercentage={props.handicapPercentage}
        gameCountAdjustControls={props.gameCountAdjustControls}
        laneLabelLookup={props.laneLabelLookup}
        previewLanesByTeamId={props.previewLanesByTeamId}
        standingPlaceByTeamId={props.standingPlaceByTeamId}
        positionRoundLanePlacement={props.positionRoundLanePlacement}
        pairsInPlay={props.pairsInPlay}
        bonusPinsEnabled={props.bonusPinsEnabled}
        bonusPinsByTeamId={props.bonusPinsByTeamId}
        selectedRoundId={props.selectedRoundId}
        eventId={props.eventId}
        positionRoundGame={props.positionRoundGame}
      />
    );
  }

  return (
    <IndividualScoring
      squadCategories={props.squadCategories}
      gameCount={props.gameCount}
      advancementDestinationMap={props.advancementDestinationMap}
      onGameScoreChange={props.onGameScoreChange}
      onTemporaryGameScoreChange={props.onTemporaryGameScoreChange}
      pendingGameChanges={props.pendingGameChanges}
      expandedCategories={props.expandedCategories}
      onToggleCategory={props.onToggleCategory}
      isLoadingSquadParticipants={props.isLoadingSquadParticipants}
      loadingGames={props.loadingGames}
      getCurrentRoundGameCount={props.getCurrentRoundGameCount}
      getPendingGameValue={props.getPendingGameValue}
      hasGamePendingChanges={props.hasGamePendingChanges}
      getParticipantGames={props.getParticipantGames}
      getGameIdForParticipantAndGameNumber={props.getGameIdForParticipantAndGameNumber}
      selectedRoundId={props.selectedRoundId}
      squads={props.squads}
      tabMode={props.tabMode}
      participantSortOrder={props.participantSortOrder}
      enableScoringTabNavigation={true}
      handicapEnabled={props.handicapEnabled}
      handicapBaseScore={props.handicapBaseScore}
      handicapPercentage={props.handicapPercentage}
      gameCountAdjustControls={props.gameCountAdjustControls}
      laneLabelLookup={props.laneLabelLookup}
    />
  );
};

export default EliminatorScoringSurface;
