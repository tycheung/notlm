import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RoundsAPI } from '../../api/rounds';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';

import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import Tabs, { TabItem } from '../../components/common/Tabs';
import { RoundStatus } from '../../types/round_enums';
import RoundProgressTracker from '../../components/round/RoundProgressTracker';
import GamesList from '../../components/game/GamesList';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { getCompetitionMethodDisplayLabel } from '../../utils/competitionMethodDisplay';
import { roundRelationshipApi } from '../../services/roundRelationshipApi';

// Tabs for the round details page
enum TabType {
  INFO = 'info',
  PARTICIPANTS = 'participants',
  GAMES = 'games',
}

const RoundDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roundId = id ? parseInt(id, 10) : 0;
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INFO);
  
  // Check if user is authorized to edit (admin or tournament director)
  const isAuthorizedToEdit = isDirectorSuiteRole(user?.role);
  
  // Fetch round with event details to build the breadcrumb
  const { data: roundWithEvent, isLoading: roundLoading, error: roundError } = useQuery({
    queryKey: ['roundWithEvent', roundId],
    queryFn: () => RoundsAPI.getRoundWithEvent(roundId),
    enabled: !!roundId,
  });

  const eventId = roundWithEvent?.event?.id ?? 0;
  const { data: roundRelationships = [] } = useQuery({
    queryKey: ['roundRelationships', eventId],
    queryFn: () => roundRelationshipApi.getAllRoundRelationshipsForEvent(eventId),
    enabled: eventId > 0,
  });
  
  // Fetch round participants
  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ['roundParticipants', roundId],
    queryFn: () => RoundsAPI.getRoundParticipants(roundId),
    enabled: !!roundId && activeTab === TabType.PARTICIPANTS,
  });
  
  // Fetch round with games
  const { data: roundWithGames, isLoading: gamesLoading } = useQuery({
    queryKey: ['roundWithGames', roundId],
    queryFn: () => RoundsAPI.getRoundWithGames(roundId),
    enabled: !!roundId && activeTab === TabType.GAMES,
  });
  
  // Fetch games data for progress tracker in INFO tab
  const { data: roundGamesForProgress, isLoading: progressGamesLoading } = useQuery({
    queryKey: ['roundGamesForProgress', roundId],
    queryFn: () => RoundsAPI.getRoundWithGames(roundId),
    enabled: !!roundId && activeTab === TabType.INFO,
  });
  
  // Fetch round summary for the progress tracker
  const { data: roundSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['roundSummary', roundId],
    queryFn: async () => {
      if (!roundId) return null;
      try {
        return await RoundsAPI.getRoundSummary(roundId);
      } catch (error) {
        console.error("Error fetching round summary:", error);
        return null;
      }
    },
    enabled: !!roundId && activeTab === TabType.INFO,
  });
  
  // Handle "Edit Round" button click (no dedicated /edit route; round detail is the edit hub)
  const handleEditRound = () => {
    navigate(roleAwareNav.getRoundPath(roundId));
  };
  
  if (roundLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }
  
  if (roundError || !roundWithEvent) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message="Error loading round details."
          className="mb-4"
        />
      </div>
    );
  }
  
  const { event } = roundWithEvent;

  // Define tabs
  const tabs: TabItem[] = [
    { id: TabType.INFO, label: 'Round Info' },
    { id: TabType.PARTICIPANTS, label: 'Participants' },
    { id: TabType.GAMES, label: 'Games' },
  ];

  // Handle tab changes
  const handleTabChange = (tab: TabType | string) => {
    setActiveTab(tab as TabType);
  };
  
  // Function to get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case RoundStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case RoundStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case RoundStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case RoundStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-surface-light text-text';
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      <Breadcrumb 
        items={[
          { label: 'Home', path: '/' },
          { label: 'Tournaments', path: roleAwareNav.getRoleAwarePath('/tournaments', { preserveQuery: true }) },
          { label: event.name, path: roleAwareNav.getEventPath(event.id) },
          { label: `Round ${roundWithEvent.round_number}` }
        ]} 
        className="mb-6"
      />
      
      {/* Round header with title and actions */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
          <div>
            <div className="flex items-center mb-2">
              <PageTitle size="responsive">
                Round {roundWithEvent.round_number}
              </PageTitle>
              <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(roundWithEvent.status)}`}>
                {roundWithEvent.status.charAt(0).toUpperCase() + roundWithEvent.status.slice(1)}
              </span>
            </div>
            <p className="text-text-muted text-sm">
              Event: {event.name}
            </p>
          </div>
          
          <div className="flex mt-4 sm:mt-0 space-x-2">
            {isAuthorizedToEdit && (
              <Button
                variant="lightbackground"
                onClick={handleEditRound}
                className="shrink-0"
              >
                Edit Round
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs 
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={handleTabChange}
        variant="underline"
        ariaLabel="Round sections"
        idPrefix="round-sections"
        panelId="round-sections-panel"
      />
      
      {/* Tab Content */}
      <div
        id="round-sections-panel"
        role="tabpanel"
        aria-labelledby={`round-sections-tab-${activeTab}`}
      >
        {activeTab === TabType.INFO && (
          <>
            {/* Progress Tracker */}
            <RoundProgressTracker
              round={roundWithEvent}
              summary={roundSummary || undefined}
              participants={participants as any}
              games={roundGamesForProgress?.games}
              isLoading={summaryLoading || progressGamesLoading}
              isTeamEvent={roundWithEvent.event?.event_format === 'teams'}
            />
          
            {/* Round Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Round Details">
                <div className="space-y-3 text-text">
                  <p>
                    <span className="font-medium">Round Number:</span> {roundWithEvent.round_number}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> {roundWithEvent.status.charAt(0).toUpperCase() + roundWithEvent.status.slice(1)}
                  </p>
                  <p>
                    <span className="font-medium">Games:</span> {roundWithEvent.game_count}
                  </p>
                  {roundWithEvent.notes && (
                    <p>
                      <span className="font-medium">Notes:</span><br />
                      <span className="whitespace-pre-line">{roundWithEvent.notes}</span>
                    </p>
                  )}
                </div>
              </Card>
              
              <Card title="Competition Settings">
                <div className="space-y-3 text-text">
                  <p>
                    <span className="font-medium">Competition Format:</span>{' '}
                    {getCompetitionMethodDisplayLabel(
                      String(roundWithEvent.competition_method || 'eliminator'),
                      {
                        roundId: roundWithEvent.id,
                        relationships: roundRelationships,
                      }
                    )}
                  </p>
                  {(() => {
                    const cfg =
                      (roundWithEvent.competition_method_config || {}) as Record<
                        string,
                        unknown
                      >;
                    const style =
                      String(cfg.game_style || 'standard').toLowerCase() === 'baker'
                        ? 'Baker'
                        : 'Standard';
                    return (
                      <p>
                        <span className="font-medium">Game Style:</span> {style}
                      </p>
                    );
                  })()}
                  <p>
                    <span className="font-medium">Allows Re-entry:</span> {roundWithEvent.allows_reentry ? 'Yes' : 'No'}
                  </p>
                  {roundWithEvent.allows_reentry && (
                    <>
                      {roundWithEvent.max_reentries && (
                        <p>
                          <span className="font-medium">Max Re-entries:</span> {roundWithEvent.max_reentries}
                        </p>
                      )}
                      {roundWithEvent.reentry_fee && (
                        <p>
                          <span className="font-medium">Re-entry Fee:</span> ${roundWithEvent.reentry_fee.toFixed(2)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
        
        {activeTab === TabType.PARTICIPANTS && (
          <>
            <Card title="Round Participants">
              {participantsLoading ? (
                <div className="flex justify-center py-8">
                  <Loading size="medium" />
                </div>
              ) : participants && participants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-light">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Position
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Bowler
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Total Score
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Handicap
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Total Pinfall
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Check-in
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      {participants.map((participant) => (
                        <tr key={participant.user_id} className="hover:bg-surface-light">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                            {participant.position}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                            {participant.user_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                            {participant.total_score}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                            {participant.handicap ?? 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                            {participant.total_pinfall}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                            {(participant as any).checked_in ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Checked In
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Not Checked In
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-muted">No participants have been added to this round yet.</p>
                </div>
              )}
            </Card>
          </>
        )}
        
        {activeTab === TabType.GAMES && (
          <Card title="Round Games">
            {gamesLoading ? (
              <div className="flex justify-center py-8">
                <Loading size="medium" />
              </div>
            ) : (
              <GamesList
                games={roundWithGames?.games || []}
                sourceType="round"
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default RoundDetails; 
