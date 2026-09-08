import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TournamentsAPI } from '../../api/tournaments';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { TournamentRead, RegistrationStatus } from '../../types/tournament';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loading from '../../components/common/Loading';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import { getTournamentStatus, getTournamentStatusInfoDark } from '../../utils/tournamentStatus';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { formatDateNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';

// Define a combined interface for tournament with registration information
interface UserTournamentRegistration extends TournamentRead {
  bowling_center_name: string;
  status: string; // Tournament status: 'upcoming', 'active', 'completed'
  registration_status?: RegistrationStatus;
  is_organizer?: boolean;
}

// Interface for tournament data from API
interface TournamentData {
  id: number;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  official_flg: boolean;
  bowling_center_id: number;
  handicap_base_score: number;
  handicap_percentage: number;
  entry_fee?: number | null;
  max_entries?: number | null;
  current_entries: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  status: string;
  registration_status?: RegistrationStatus;
  is_organizer?: boolean;
}

const MyTournaments: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const roleAwareNav = useRoleAwareNavigation(user);
  const isDirector = isDirectorSuiteRole(user?.role);

  // Fetch all bowling centers to display names
  const { data: bowlingCenters, isLoading: isCentersLoading } = useQuery({
    queryKey: ['bowlingCenters'],
    queryFn: () => BowlingCentersAPI.getBowlingCenters(),
  });

  // Create a map for bowling center names
  const bowlingCenterNames = new Map<number, string>();
  if (bowlingCenters) {
    bowlingCenters.forEach((center) => {
      bowlingCenterNames.set(center.id, center.name);
    });
  }

  // Fetch tournaments based on user role
  const { 
    data: userTournaments, 
    isLoading: isTournamentsLoading, 
    error: tournamentError 
  } = useQuery({
    queryKey: ['userTournaments'],
    queryFn: async () => {
      if (!user) return [];
      
      // Use the API method that handles both tournament directors and regular users
      return TournamentsAPI.getCurrentUserTournaments();
    },
    enabled: !!user,
  });

  const isLoading = isCentersLoading || isTournamentsLoading;
  const error = tournamentError;

  if (!user) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <PageTitle className="mb-4">My Tournaments</PageTitle>
        <Alert 
          variant="warning" 
          message="You need to be logged in to view your tournaments." 
        />
        <div className="mt-4">
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <ErrorMessage 
          message="Failed to load tournaments. Please try again later." 
          title="Loading Error"
          severity="error"
        />
      </div>
    );
  }

  if (!userTournaments || userTournaments.length === 0) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <PageTitle className="mb-4">My Tournaments</PageTitle>
        <Alert variant="info" message="You haven't joined any tournaments yet." />
        <div className="mt-4">
          <Link to="/tournaments">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Build registration data for the user
  let enhancedTournaments: UserTournamentRegistration[] = [];
  
  if (userTournaments) {
    enhancedTournaments = userTournaments.map((tournament: any) => {
      // Registration status is included in the tournament data from getCurrentUserTournaments
      const registrationStatus = tournament.registration_status;
      const isOrganizer = tournament.is_organizer;

      // Add bowling center name
      const bowlingCenterName = bowlingCenterNames.get(tournament.bowling_center_id) || 'Unknown Location';

      // Use unified status determination logic
      const status = getTournamentStatus(tournament);

      return {
        ...tournament,
        bowling_center_name: bowlingCenterName,
        status,
        registration_status: registrationStatus,
        is_organizer: isOrganizer
      };
    });
  }

  // Filter tournaments based on selected filter
  const filteredTournaments = filter === 'all'
    ? enhancedTournaments
    : enhancedTournaments.filter(tournament => tournament.status === filter);

  // Helper function to format dates in a more readable way
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return formatDateNaive(dateString);
  };



  // Helper function to get registration status badge style
  const getRegistrationBadgeStyle = (status?: RegistrationStatus) => {
    if (!status) return '';
    
    switch (status) {
      case RegistrationStatus.APPROVED:
        return 'bg-green-600 text-white';
      case RegistrationStatus.PENDING:
        return 'bg-yellow-600 text-white';
      case RegistrationStatus.WITHDRAWN:
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Breadcrumb
        items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'My tournaments' }]}
        className="mb-4"
      />
      <PageTitle className="mb-4">My Tournaments</PageTitle>
      
      {/* Filter tabs - Mobile scrollable, desktop normal */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex space-x-2 min-w-max">
          <Button 
            onClick={() => setFilter('all')} 
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="small"
            className="whitespace-nowrap"
          >
            All Tournaments
          </Button>
          <Button 
            onClick={() => setFilter('upcoming')} 
            variant={filter === 'upcoming' ? 'primary' : 'secondary'}
            size="small"
            className="whitespace-nowrap"
          >
            Upcoming
          </Button>
          <Button 
            onClick={() => setFilter('active')} 
            variant={filter === 'active' ? 'primary' : 'secondary'}
            size="small"
            className="whitespace-nowrap"
          >
            Active
          </Button>
          <Button 
            onClick={() => setFilter('completed')} 
            variant={filter === 'completed' ? 'primary' : 'secondary'}
            size="small"
            className="whitespace-nowrap"
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Responsive grid of tournament cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTournaments.map((tournament) => (
          <Card key={tournament.id} className="flex flex-col h-full bg-surface shadow hover:shadow-lg transition-shadow duration-200">
            <div className="flex-grow p-4">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(() => {
                  const statusInfo = getTournamentStatusInfoDark(tournament);
                  return (
                    <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.colorClasses}`}>
                      {statusInfo.label}
                    </span>
                  );
                })()}
                
                {tournament.official_flg && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white">
                    Official
                  </span>
                )}
                
                {!isDirector && tournament.registration_status && (
                  <span className={`text-xs px-2 py-1 rounded-full ${getRegistrationBadgeStyle(tournament.registration_status)}`}>
                    {tournament.registration_status}
                  </span>
                )}
                
                {tournament.is_organizer && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white">
                    Organizer
                  </span>
                )}
              </div>
              
              <h2 className="text-xl font-semibold mb-2 text-primary">{tournament.name}</h2>
              
              <div className="flex items-center mb-3 text-text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-sm">{tournament.bowling_center_name}</p>
              </div>
              
              <div className="flex items-center mb-3 text-text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">
                  {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center text-text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{tournament.current_entries} registered</span>
                </div>
                
                <div className="flex items-center text-text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>See events for fees</span>
                </div>
              </div>
              
            </div>
            
            <div className="p-4 pt-0 mt-auto">
              <Button 
                variant="darkbackground" 
                className="w-full"
                onClick={() => navigate(roleAwareNav.getTournamentPath(tournament.id))}
              >
                {tournament.is_organizer ? 'Manage' : 'View'} Tournament
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      {filteredTournaments.length === 0 && (
        <div className="bg-surface rounded-lg p-6 text-center">
          <p className="text-text-muted mb-4">No {filter !== 'all' ? filter : ''} tournaments found.</p>
          {filter !== 'all' && (
            <Button onClick={() => setFilter('all')} variant="darkbackground">
              Show All Tournaments
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MyTournaments; 
