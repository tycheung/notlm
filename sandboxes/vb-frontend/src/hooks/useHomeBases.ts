import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UsersAPI } from '../api/users';
import { TournamentsAPI } from '../api/tournaments';
import { HomeBaseRead } from '../types/user';
import { TournamentSearch } from '../types/tournament';

export type LocationOption = 
  | { type: 'current'; label: 'Detect Current Location' }
  | { type: 'homeBase'; id: number; label: string; isDefault: boolean };

export const useHomeBases = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(50); // Default 50 miles

  // Fetch user's home bases
  const { 
    data: homeBases,
    isLoading: isLoadingHomeBases,
    error: homeBasesError 
  } = useQuery({
    queryKey: ['homeBases'],
    queryFn: async () => {
      const bases = await UsersAPI.getHomeBases();
      return bases;
    }
  });

  // Set initial selection to default home base or current location
  useEffect(() => {
    if (homeBases && homeBases.length > 0 && !selectedLocation) {
      // Find default home base
      const defaultBase = homeBases.find(base => base.is_default);
      
      if (defaultBase) {
        setSelectedLocation({
          type: 'homeBase',
          id: defaultBase.id,
          label: defaultBase.name,
          isDefault: true
        });
      } else {
        // If no default, set to current location
        setSelectedLocation({ type: 'current', label: 'Detect Current Location' });
      }
    } else if (!homeBases?.length && !selectedLocation) {
      // If no home bases, default to current location
      setSelectedLocation({ type: 'current', label: 'Detect Current Location' });
    }
  }, [homeBases, selectedLocation]);

  // Function to get location options (current location + home bases)
  const getLocationOptions = (): LocationOption[] => {
    const options: LocationOption[] = [
      { type: 'current', label: 'Detect Current Location' }
    ];
    
    if (homeBases?.length) {
      homeBases.forEach(base => {
        options.push({
          type: 'homeBase',
          id: base.id,
          label: base.name,
          isDefault: base.is_default
        });
      });
    }
    
    return options;
  };

  // Function to search tournaments near the selected location
  const searchTournamentsNearLocation = async (
    position?: { latitude: number; longitude: number }
  ): Promise<TournamentSearch[]> => {
    if (!selectedLocation) return [];
    
    try {
      if (selectedLocation.type === 'current' && position) {
        // Search near current position
        return await TournamentsAPI.getRecommendedTournaments({
          latitude: position.latitude,
          longitude: position.longitude,
          radius: searchRadius
        });
      } else if (selectedLocation.type === 'homeBase') {
        // Search near home base
        return await TournamentsAPI.getTournamentsNearHomeBase(
          selectedLocation.id,
          searchRadius
        );
      }
      return [];
    } catch (error) {
      console.error('Error searching tournaments by location:', error);
      return [];
    }
  };

  return {
    homeBases,
    isLoadingHomeBases,
    homeBasesError,
    selectedLocation,
    setSelectedLocation,
    searchRadius,
    setSearchRadius,
    getLocationOptions,
    searchTournamentsNearLocation
  };
}; 