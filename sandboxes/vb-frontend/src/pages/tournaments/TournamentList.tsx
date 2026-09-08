import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TournamentsAPI } from '../../api/tournaments';
import { TournamentRead, TournamentSearch } from '../../types/tournament';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import TableSearchInput from '../../components/common/TableSearchInput';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useHomeBases, LocationOption } from '../../hooks/useHomeBases';
import Modal from '../../components/common/Modal';
import { formatDateNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import PageSectionHeading from '../../components/common/PageSectionHeading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb } from '../../utils/breadcrumbBuilders';
import TournamentCreate from './TournamentCreate';
import { isTournamentActive, isTournamentCompleted, getTournamentStatusInfo } from '../../utils/tournamentStatus';
import { canCreateFullTournament } from '../../api/tdAccess';

interface Filters {
  status: 'all' | 'active' | 'completed';
  nearby: boolean;
}

const TournamentList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({ status: 'all', nearby: false });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user } = useAuth();
  const canCreateFull = canCreateFullTournament(user?.billing);

  const { position, getPosition, loading: locationLoading } = useGeolocation();
  const [searchParams] = useSearchParams();
  const isInBowlerView = searchParams.get('view') === 'bowler';
  
  const { 
    homeBases, 
    isLoadingHomeBases, 
    selectedLocation, 
    setSelectedLocation, 
    getLocationOptions,
    searchRadius,
    setSearchRadius
  } = useHomeBases();
  
  // Check if user is a tournament director (using Role enum)
  const isTournamentDirector = !!user && (user.role === Role.TD || user.role === Role.ADMIN);
  const isOnlyTD = !!user && user.role === Role.TD;

  // Get location options (current location + home bases)
  const locationOptions = useMemo(() => getLocationOptions(), [getLocationOptions]);

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When nearby filter is toggled on or location changed to current, get user's position
  useEffect(() => {
    if (filters.nearby && selectedLocation?.type === 'current' && !position) {
      getPosition();
    }
  }, [filters.nearby, selectedLocation, position, getPosition]);

  // Fetch tournaments data
  const { 
    data: tournaments, 
    isLoading, 
    error,
    refetch: refetchTournaments
  } = useQuery({
    queryKey: ['tournaments', user?.id, isInBowlerView],
    queryFn: async () => {
      // Fetch all tournaments (active and completed) to allow proper filtering
      const response = await TournamentsAPI.getTournaments({
        active_only: false,
        include_details: true,
        published_only: !isTournamentDirector || isInBowlerView,
      });
      
      // If user is a TD (but not admin), filter tournaments by organizer_id
      if (isOnlyTD && user) {
        return response.filter(tournament => tournament.organizer_id === user.id);
      }
      
      return response;
    },
  });

  // Fetch user's tournaments
  const {
    data: userTournaments,
    isLoading: isUserTournamentsLoading,
    error: userTournamentsError
  } = useQuery({
    queryKey: ['userTournaments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const data = await TournamentsAPI.getCurrentUserTournaments();
        if (!data || !Array.isArray(data)) {
          console.error('Expected array from getCurrentUserTournaments, got:', data);
          return [];
        }
        return data;
      } catch (err) {
        console.error('Error fetching user tournaments:', err);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch nearby tournaments if needed
  const { 
    data: nearbyTournaments, 
    isLoading: isNearbyLoading,
    refetch: refetchNearby
  } = useQuery({
    queryKey: ['nearbyTournaments', selectedLocation, position?.latitude, position?.longitude, searchRadius],
    queryFn: async () => {
      if (!filters.nearby) return [];
      
      // If selected location is current
      if (selectedLocation?.type === 'current' && position) {
        return TournamentsAPI.getRecommendedTournaments({
          latitude: position.latitude,
          longitude: position.longitude,
          radius: searchRadius
        });
      } 
      // If selected location is a home base
      else if (selectedLocation?.type === 'homeBase') {
        return TournamentsAPI.getTournamentsNearHomeBase(
          selectedLocation.id,
          searchRadius
        );
      }
      
      return [];
    },
    enabled: !!filters.nearby && (
      (selectedLocation?.type === 'current' && !!position) || 
      selectedLocation?.type === 'homeBase'
    ),
  });

  // Handle status filter change
  const handleStatusChange = (status: 'all' | 'active' | 'completed') => {
    setFilters(prev => ({ ...prev, status }));
  };

  // Handle nearby filter toggle
  const handleNearbyToggle = () => {
    const newValue = !filters.nearby;
    setFilters(prev => ({ ...prev, nearby: newValue }));
    
    // Refetch if turning nearby on
    if (newValue) {
      refetchNearby();
    }
  };

  // Handle location change
  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    
    if (value === 'current') {
      setSelectedLocation({ type: 'current', label: 'Detect Current Location' });
      // Trigger geolocation if needed and nearby filter is on
      if (filters.nearby && !position) {
        getPosition();
      }
    } else {
      // Extract home base ID from the value (format: "homeBase-123")
      const homeBaseId = parseInt(value.split('-')[1], 10);
      const homeBase = homeBases?.find(base => base.id === homeBaseId);
      
      if (homeBase) {
        setSelectedLocation({
          type: 'homeBase',
          id: homeBase.id,
          label: homeBase.name,
          isDefault: homeBase.is_default
        });
        
        // Refetch if nearby filter is on
        if (filters.nearby) {
          refetchNearby();
        }
      }
    }
  };

  // Handle radius change
  const handleRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const radius = parseInt(event.target.value, 10);
    setSearchRadius(radius);
    
    // Only refetch if nearby filter is on
    if (filters.nearby) {
      refetchNearby();
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ status: 'all', nearby: false });
  };

  // Handle tournament create success
  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetchTournaments();
  };

  // Filter and search tournaments
  const filteredTournaments = React.useMemo(() => {
    if (!tournaments) return [];
    
    let results = [...tournaments];
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(tournament => {
        // Always search in tournament name and description
        const matchesNameOrDesc = 
          tournament.name.toLowerCase().includes(searchLower) ||
          (tournament.description?.toLowerCase().includes(searchLower) ?? false) ||
          (tournament.location?.toLowerCase().includes(searchLower) ?? false);
          
        // If there's extended data available through include_details
        if (matchesNameOrDesc) return true;
        
        return (
          (tournament.bowling_center_name &&
            tournament.bowling_center_name.toLowerCase().includes(searchLower)) ||
          (tournament.organizer_name &&
            tournament.organizer_name.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // Apply status filter using unified logic
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        results = results.filter(tournament => isTournamentActive(tournament));
      } else if (filters.status === 'completed') {
        results = results.filter(tournament => isTournamentCompleted(tournament));
      }
    }
    
    // Apply nearby filter
    if (filters.nearby && nearbyTournaments?.length) {
      const nearbyIds = new Set(nearbyTournaments.map(t => t.id));
      results = results.filter(tournament => nearbyIds.has(tournament.id));
    }
    
    return results;
  }, [tournaments, nearbyTournaments, searchTerm, filters]);

  // Format date for mobile display using naive formatting
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return formatDateNaive(dateString);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message="Error loading tournaments."
          className="mb-4"
        />
      </div>
    );
  }

  const showLocationLoading = filters.nearby && locationLoading && selectedLocation?.type === 'current';
  const showNearbyLoading = filters.nearby && !locationLoading && isNearbyLoading;
  const isAnyFilterActive = filters.status !== 'all' || filters.nearby || searchTerm !== '';

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[homeCrumb(), { label: 'Tournaments' }]}
        className="mb-4"
      />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <PageTitle size="responsive" className="mb-4 sm:mb-0">My Tournaments</PageTitle>
        
        {isTournamentDirector && !isInBowlerView && (
          <Button 
            variant="darkbackground"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-[42px]"
            disabled={!canCreateFull}
            title={
              canCreateFull
                ? undefined
                : 'A Tournament Director subscription or unused tournament pass is required.'
            }
          >
            Create Tournament
          </Button>
        )}
      </div>
      
      {/* My Tournaments Section */}
      {user && (
        <div className="mb-8">
          {isUserTournamentsLoading ? (
            <div className="flex justify-center p-4">
              <Loading size="small" />
            </div>
          ) : userTournamentsError ? (
            <ErrorMessage 
              message="Error loading your tournaments. Please try again later." 
              title="Loading Error"
              className="mb-4" 
            />
          ) : userTournaments && userTournaments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTournaments.slice(0, 3).map((tournament: any) => (
                <Link
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}${isInBowlerView ? '?view=bowler' : ''}`}
                  className="block bg-surface rounded-lg overflow-hidden shadow hover:shadow-md transition-all hover:bg-surface-light"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-bold text-primary truncate">{tournament.name}</h2>
                      {(() => {
                        const statusInfo = getTournamentStatusInfo(tournament as TournamentRead);
                        // Use dark theme colors for cards with dark backgrounds
                        const cardColorClasses = {
                          'upcoming': 'bg-blue-600 text-white',
                          'ongoing': 'bg-green-600 text-white',
                          'completed': 'bg-gray-600 text-white',
                          'cancelled': 'bg-red-600 text-white'
                        };
                        
                        return (
                          <span className={`text-xs ml-2 px-2 py-1 rounded-full flex-shrink-0 ${cardColorClasses[statusInfo.status]}`}>
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                    
                    <div className="flex items-center text-xs text-text-muted mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(tournament.start_date)}
                    </div>
                    
                    {tournament.status && (
                      <div className="flex items-center text-xs text-text-muted mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Registration: {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-text-muted">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {tournament.current_entries} registered
                      </div>
                      
                      {tournament.lanes_reserved && (
                        <div className="flex items-center ml-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                          </svg>
                          {tournament.lanes_reserved} lanes
                        </div>
                      )}
                      
                      <div className="flex items-center ml-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        See events for entry fees
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-surface rounded-lg">
              <p className="text-text-muted mb-3">You haven't registered for any tournaments yet.</p>
              <p className="text-text-muted text-sm mb-4">Browse tournaments below to find and register for events.</p>
            </div>
          )}
          
          {userTournaments && userTournaments.length > 3 && (
            <div className="mt-4 text-center">
              <Link to="/my-tournaments">
                <Button variant="lightbackground">
                  View All My Tournaments
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
      
      {/* Search Section Title */}
      <PageSectionHeading className="mb-4 font-bold">Search for Tournaments</PageSectionHeading>
      
      {/* Mobile-friendly search bar */}
      <div className="mb-4">
        <TableSearchInput
          placeholder="Search by tournament name, bowling center, or director..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>
      
      {/* Filters - Mobile-friendly filter buttons - All in one row */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status filters */}
          <button
            onClick={() => handleStatusChange('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${filters.status === 'all' ? 'bg-primary text-text' : 'bg-surface text-text-muted border border-border'}`}
          >
            All
          </button>
          <button
            onClick={() => handleStatusChange('active')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${filters.status === 'active' ? 'bg-primary text-text' : 'bg-surface text-text-muted border border-border'}`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusChange('completed')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${filters.status === 'completed' ? 'bg-primary text-text' : 'bg-surface text-text-muted border border-border'}`}
          >
            Completed
          </button>
          
          {/* Nearby filter */}
          <button
            onClick={handleNearbyToggle}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${filters.nearby ? 'bg-primary text-text' : 'bg-surface text-text-muted border border-border'}`}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Nearby
              {showLocationLoading && (
                <svg className="animate-spin ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </div>
          </button>
          
          {/* Clear filters button - only show if any filter is active */}
          {isAnyFilterActive && (
            <button
              onClick={clearFilters}
              className="whitespace-nowrap px-4 py-2 rounded-full text-sm bg-bg text-text-muted border border-border"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Location options - show only when nearby filter is on */}
      {filters.nearby && (
        <div className="mb-6 bg-surface p-4 rounded-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Location selector dropdown */}
            <div className="flex-1">
              <label htmlFor="location-select" className="block text-sm font-medium text-text-muted mb-1">
                Search tournaments near:
              </label>
              <select
                id="location-select"
                className="w-full bg-surface-light text-text-muted border border-border rounded-md p-2"
                value={selectedLocation?.type === 'current' ? 'current' : `homeBase-${selectedLocation?.id}`}
                onChange={handleLocationChange}
              >
                {locationOptions.map((option) => (
                  <option 
                    key={option.type === 'current' ? 'current' : `homeBase-${option.id}`}
                    value={option.type === 'current' ? 'current' : `homeBase-${option.id}`}
                  >
                    {option.label} {option.type === 'homeBase' && option.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Radius slider */}
            <div className="flex-1">
              <label htmlFor="radius-slider" className="block text-sm font-medium text-text-muted mb-1">
                Search radius: {searchRadius} miles
              </label>
              <input
                id="radius-slider"
                type="range"
                min="10"
                max="200"
                step="10"
                value={searchRadius}
                onChange={handleRadiusChange}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            {/* Apply button for radius change */}
            <div>
              <button
                onClick={() => refetchNearby()}
                className="w-full sm:w-auto px-4 py-2 bg-primary text-text rounded-md hover:bg-primary-light transition-colors"
                disabled={isNearbyLoading}
              >
                {isNearbyLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
          
          {selectedLocation?.type === 'current' && !position && (
            <div className="mt-2 text-sm text-text-muted">
              Allow location access to see tournaments near you.
            </div>
          )}
        </div>
      )}
      
      {/* Show loading indicator for nearby tournaments */}
      {showNearbyLoading && (
        <div className="text-center py-2 mb-4">
          <div className="flex items-center justify-center">
            <Loading size="small" />
            <span className="ml-2 text-text-muted">Loading nearby tournaments...</span>
          </div>
        </div>
      )}
      
      {/* Tournament List - Responsive grid (stacked on mobile, grid on larger screens) */}
      {filteredTournaments.length === 0 ? (
        <div className="text-center py-8 bg-surface rounded-lg">
          <p className="text-text-muted">No tournaments found with the current filters.</p>
          <Button 
            variant="lightbackground" 
            className="mt-4"
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTournaments.map((tournament: TournamentRead) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}${isInBowlerView ? '?view=bowler' : ''}`}
              className="block bg-surface rounded-lg overflow-hidden shadow hover:shadow-md transition-all hover:bg-surface-light"
            >
              <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-bold text-primary truncate">{tournament.name}</h2>
                      {(() => {
                        const statusInfo = getTournamentStatusInfo(tournament);
                        // Use dark theme colors for cards with dark backgrounds
                        const cardColorClasses = {
                          'upcoming': 'bg-blue-600 text-white',
                          'ongoing': 'bg-green-600 text-white',
                          'completed': 'bg-gray-600 text-white',
                          'cancelled': 'bg-red-600 text-white'
                        };
                        
                        return (
                          <span className={`text-xs ml-2 px-2 py-1 rounded-full flex-shrink-0 ${cardColorClasses[statusInfo.status]}`}>
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                
                <div className="flex items-center text-xs text-text-muted mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(tournament.start_date)}
                </div>
                
                {/* Bowling Center display (if available) */}
                {tournament.bowling_center_name && (
                  <div className="flex items-center text-xs text-text-muted mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {tournament.bowling_center_name}
                  </div>
                )}
                
                {/* Tournament Director/Organizer display (if available) */}
                {tournament.organizer_name && (
                  <div className="flex items-center text-xs text-text-muted mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Director: {tournament.organizer_name}
                  </div>
                )}
                
                {/* Show description on larger screens */}
                <div className="hidden sm:block text-xs text-text-muted mb-3 line-clamp-2">
                  {tournament.description || 'No description available.'}
                </div>
                
                <div className="flex justify-between items-center text-xs text-text-muted">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                                              {tournament.current_entries} registered
                  </div>
                  
                  {tournament.lanes_reserved && (
                    <div className="flex items-center ml-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                      </svg>
                      {tournament.lanes_reserved} lanes
                    </div>
                  )}
                  
                  <div className="flex items-center ml-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                                              See events for entry fees
                  </div>
                  
                  <div className="flex items-center justify-end rounded-md px-3 py-1 bg-surface-light ml-auto">
                    <span className="text-text-muted">Details</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Create Tournament Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Tournament"
        size="large"
        closeOnOutsideClick={false}
      >
        <TournamentCreate onClose={handleCreateSuccess} />
      </Modal>
    </div>
  );
};

export default TournamentList;
