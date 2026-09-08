import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SquadsAPI } from '../../api/squads';
import { GamesAPI } from '../../api/games';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import { formatDateNaive, formatTimeNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import Tabs, { TabItem } from '../../components/common/Tabs';
import GamesList from '../../components/game/GamesList';
import SquadProgressTracker from '../../components/squad/SquadProgressTracker';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';

// Tabs for the squad details page
enum TabType {
  INFO = 'info',
  PARTICIPANTS = 'participants',
  GAMES = 'games',
}

// Define extended types to fix type errors
interface SquadWithEventExtended {
  event: {
    id: number;
    name: string;
    tournament_id: number;
    event_format?: string;
    tournament?: {
      name: string;
    };
  };
  squad: {
    id: number;
    squad_number: number;
    name?: string;
    status: string;
    start_time: string; 
    end_time?: string;
    notes?: string;
    max_participants?: number;
    lanes_used?: number;
    starting_lane?: number;
    check_in_time?: string;
    reserved_lanes_expression?: string;
  };
}

interface SquadParticipantExtended {
  id: number;
  user_id: number;
  user_name?: string;
  assigned_lane?: number;
  position?: number;
  checked_in?: boolean;
  notes?: string;
}

const SquadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const squadId = id ? parseInt(id, 10) : 0;
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleAwareNav = useRoleAwareNavigation(user);
  
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INFO);
  
  // Check if user is authorized to edit (admin or tournament director)
  const isAuthorizedToEdit = isDirectorSuiteRole(user?.role);
  
  // Fetch squad with event details for breadcrumbs
  const { data: squadWithEvent, isLoading: squadLoading, error: squadError } = useQuery({
    queryKey: ['squadWithEvent', squadId],
    queryFn: () => SquadsAPI.getSquadWithEvent(squadId),
    enabled: !!squadId,
  });
  
  // Fetch squad participants
  const { data: squadWithParticipants, isLoading: participantsLoading } = useQuery({
    queryKey: ['squadWithParticipants', squadId],
    queryFn: () => SquadsAPI.getSquadWithParticipants(squadId),
    enabled: !!squadId && activeTab === TabType.PARTICIPANTS,
  });
  
  // Fetch squad games
  const { data: squadWithGames, isLoading: gamesLoading } = useQuery({
    queryKey: ['squadWithGames', squadId],
    queryFn: () => SquadsAPI.getSquadWithGames(squadId),
    enabled: !!squadId && activeTab === TabType.GAMES,
  });
  
  // Fetch squad games for progress tracker (always fetch this for INFO tab)
  const { data: squadGamesForProgress, isLoading: progressGamesLoading } = useQuery({
    queryKey: ['squadGamesForProgress', squadId],
    queryFn: () => SquadsAPI.getSquadWithGames(squadId),
    enabled: !!squadId && activeTab === TabType.INFO,
  });
  
  // Handle "Edit Squad" button click
  const handleEditSquad = () => {
    navigate(roleAwareNav.getSquadPath(squadId, '/edit'));
  };
  
  if (squadLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }
  
  if (squadError || !squadWithEvent) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message="Error loading squad details."
          className="mb-4"
        />
      </div>
    );
  }
  
  // Use type assertion to address the type issues
  const { event, squad } = squadWithEvent as unknown as SquadWithEventExtended;

  // Define tabs
  const tabs: TabItem[] = [
    { id: TabType.INFO, label: 'Squad Info' },
    { id: TabType.PARTICIPANTS, label: 'Participants' },
    { id: TabType.GAMES, label: 'Games' }
  ];

  // Handle tab changes
  const handleTabChange = (tab: TabType | string) => {
    setActiveTab(tab as TabType);
  };
  
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      <Breadcrumb 
        items={[
          { label: 'Home', path: '/' },
          { label: 'Tournaments', path: roleAwareNav.getRoleAwarePath('/tournaments') },
          { label: event.tournament?.name || 'Tournament', path: roleAwareNav.getTournamentPath(event.tournament_id) },
          { label: event.name, path: roleAwareNav.getEventPath(event.id) },
          { label: squad.name || `Squad ${squad.squad_number}` }
        ]} 
        className="mb-6"
      />
      
      {/* Squad header with title and actions */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
          <div>
            <div className="flex items-center mb-2">
              <PageTitle size="responsive">
                {squad.name || `Squad ${squad.squad_number}`}
              </PageTitle>
              <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                squad.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                squad.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                squad.status === 'completed' ? 'bg-green-100 text-green-800' :
                squad.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-surface-light text-text'
              }`}>
                {squad.status.charAt(0).toUpperCase() + squad.status.slice(1)}
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
                onClick={handleEditSquad}
                className="shrink-0"
              >
                Edit Squad
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
        ariaLabel="Squad sections"
        idPrefix="squad-sections"
        panelId="squad-sections-panel"
      />
      
      {/* Tab Content */}
      <div
        id="squad-sections-panel"
        role="tabpanel"
        aria-labelledby={`squad-sections-tab-${activeTab}`}
      >
        {activeTab === TabType.INFO && (
          <>
            {/* Progress Tracker */}
            <SquadProgressTracker
              squad={squad}
              games={squadGamesForProgress?.games}
              participants={squadWithParticipants?.participants}
              isLoading={progressGamesLoading}
              isTeamEvent={event.event_format === 'teams'}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Squad Details">
                <div className="space-y-3 text-text">
                  <p>
                    <span className="font-medium">Squad Number:</span> {squad.squad_number}
                  </p>
                  <p>
                    <span className="font-medium">Name:</span> {squad.name || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> {squad.status.charAt(0).toUpperCase() + squad.status.slice(1)}
                  </p>
                  <p>
                    <span className="font-medium">Start Time:</span> {formatDateNaive(squad.start_time)} at {formatTimeNaive(squad.start_time)}
                  </p>
                  {squad.end_time && (
                    <p>
                      <span className="font-medium">End Time:</span> {formatDateNaive(squad.end_time)} at {formatTimeNaive(squad.end_time)}
                    </p>
                  )}
                  {squad.notes && (
                    <p>
                      <span className="font-medium">Notes:</span><br />
                      <span className="whitespace-pre-line">{squad.notes}</span>
                    </p>
                  )}
                </div>
              </Card>
              
              <Card title="Lanes & Capacity">
                <div className="space-y-3 text-text">
                  <p>
                    <span className="font-medium">Max Participants:</span> {squad.max_participants || 'Unlimited'}
                  </p>
                  <p>
                    <span className="font-medium">Current Participants:</span> {squadWithParticipants?.participants?.length || 0}
                    {squad.max_participants ? ` / ${squad.max_participants}` : ''}
                  </p>
                  {squad.lanes_used && (
                    <p>
                      <span className="font-medium">Lanes Used:</span> {squad.lanes_used}
                    </p>
                  )}
                  {squad.starting_lane && (
                    <p>
                      <span className="font-medium">Starting Lane:</span> {squad.starting_lane}
                    </p>
                  )}
                  {squad.check_in_time && (
                    <p>
                      <span className="font-medium">Check-in Time:</span> {formatTimeNaive(squad.check_in_time)}
                    </p>
                  )}
                  {squad.reserved_lanes_expression && (
                    <p>
                      <span className="font-medium">Reserved Lanes:</span> {squad.reserved_lanes_expression}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
        
        {activeTab === TabType.PARTICIPANTS && (
          <>
            <Card title="Squad Participants">
              {participantsLoading ? (
                <div className="flex justify-center py-8">
                  <Loading size="medium" />
                </div>
              ) : squadWithParticipants?.participants && squadWithParticipants.participants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-light">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Lane
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Position
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Bowler
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Check-in
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      {squadWithParticipants.participants.map((participant) => {
                        // Cast to our extended type to resolve type errors
                        const extendedParticipant = participant as unknown as SquadParticipantExtended;
                        return (
                          <tr key={extendedParticipant.id} className="hover:bg-surface-light">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                              {extendedParticipant.assigned_lane || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                              {extendedParticipant.position || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                              {extendedParticipant.user_name || `User #${extendedParticipant.user_id}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                              {extendedParticipant.checked_in ? 
                                <span className="text-green-600">Checked In</span> : 
                                <span className="text-red-600">Not Checked In</span>
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-text max-w-xs">
                              {extendedParticipant.notes || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-muted">No participants have been assigned to this squad yet.</p>
                  {isAuthorizedToEdit && (
                    <Button
                      variant="darkbackground"
                      onClick={() => navigate(roleAwareNav.getEventPath(event.id, '/squads'))}
                      className="mt-4"
                    >
                      Assign Participants
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
        
        {activeTab === TabType.GAMES && (
          <Card title="Squad Games">
            {gamesLoading ? (
              <div className="flex justify-center py-8">
                <Loading size="medium" />
              </div>
            ) : (
              <GamesList
                games={squadWithGames?.games || []}
                sourceType="squad"
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default SquadDetails; 
