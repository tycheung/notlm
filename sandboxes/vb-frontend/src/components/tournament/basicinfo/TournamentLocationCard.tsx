import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import EditableCard from '../../common/EditableCard';
import { TournamentRead } from '../../../types/tournament';
import { BowlingCentersAPI } from '../../../api/bowling-centers';
import CreateBowlingCenterModal from '../../bowling_center/CreateBowlingCenterModal';
import BowlingCenterSelect from '../../bowling_center/BowlingCenterSelect';
import Button from '../../common/Button';
import AddIcon from '@mui/icons-material/Add';

interface TournamentLocationCardProps {
  tournament: TournamentRead;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const TournamentLocationCard: React.FC<TournamentLocationCardProps> = ({
  tournament,
  isAuthorizedToEdit,
  onSave
}) => {
  const [isCreateBowlingCenterModalOpen, setIsCreateBowlingCenterModalOpen] = useState(false);

  // Fetch bowling centers for the dropdown
  const { data: bowlingCenters, refetch: refetchBowlingCenters } = useQuery({
    queryKey: ['bowlingCenters'],
    queryFn: () => BowlingCentersAPI.getBowlingCenters(),
  });

  const EditContent: React.FC<{ setSaveData: (data: any) => void }> = ({ setSaveData }) => {
    const [bowlingCenterId, setBowlingCenterId] = useState(tournament.bowling_center_id || 0);
    const [location, setLocation] = useState(tournament.location || '');
    const [lanesReserved, setLanesReserved] = useState(tournament.lanes_reserved || 0);

    // Update location when bowling center changes
    useEffect(() => {
      if (bowlingCenters && bowlingCenterId) {
        const selectedCenter = bowlingCenters.find(center => center.id === bowlingCenterId);
        if (selectedCenter) {
          // Format the address as a single line
          let formattedAddress = `${selectedCenter.name}, ${selectedCenter.address1}`;
          if (selectedCenter.address2) {
            formattedAddress += `, ${selectedCenter.address2}`;
          }
          formattedAddress += `, ${selectedCenter.city}, ${selectedCenter.state} ${selectedCenter.postal_code}`;
          
          setLocation(formattedAddress);
          
          // Adjust lanes reserved if it exceeds the new center's lane count
          if (lanesReserved > selectedCenter.lane_count) {
            setLanesReserved(selectedCenter.lane_count);
          }
        }
      }
    }, [bowlingCenterId, bowlingCenters, lanesReserved]);

    // Update save data when values change
    useEffect(() => {
      const saveData: any = {};

      if (bowlingCenterId !== tournament.bowling_center_id) {
        saveData.bowling_center_id = bowlingCenterId;
      }

      if (location !== tournament.location) {
        saveData.location = location;
      }

      if (lanesReserved !== tournament.lanes_reserved) {
        saveData.lanes_reserved = lanesReserved;
      }

      setSaveData(saveData);
    }, [bowlingCenterId, location, lanesReserved, setSaveData, tournament]);

    const handleBowlingCenterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setBowlingCenterId(parseInt(e.target.value) || 0);
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocation(e.target.value);
    };

    const handleLanesReservedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 0;
      const selectedCenter = bowlingCenters?.find(center => center.id === bowlingCenterId);
      const maxLanes = selectedCenter?.lane_count || 0;
      
      // Prevent reserving more lanes than the bowling center has
      if (value > maxLanes) {
        setLanesReserved(maxLanes);
      } else {
        setLanesReserved(value);
      }
    };

    const handleOpenCreateBowlingCenterModal = () => {
      setIsCreateBowlingCenterModalOpen(true);
    };

    const handleBowlingCenterCreated = () => {
      refetchBowlingCenters();
    };

    return (
      <div className="space-y-4">
        {/* Bowling Center Selection */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-text">
              Bowling Center
            </label>
            <Button
              variant="darkbackground"
              size="small"
              onClick={handleOpenCreateBowlingCenterModal}
              className="text-sm"
            >
              <AddIcon fontSize="small" className="mr-1" />
              Add New Center
            </Button>
          </div>
          <BowlingCenterSelect
            id="bowling_center_id"
            name="bowling_center_id"
            value={bowlingCenterId}
            onChange={handleBowlingCenterChange}
            centers={bowlingCenters}
            prependEmptyOption
            className="bg-surface-light text-text"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={handleLocationChange}
            className="w-full px-3 py-2 border border-border bg-surface-light text-text rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Auto-populated from bowling center selection (can be modified)"
          />
          <p className="text-sm text-text-muted mt-1">
            Automatically populated from the selected bowling center, but can be edited if needed.
          </p>
        </div>

        {/* Lanes Reserved */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Lanes Reserved
          </label>
          <input
            type="number"
            min="1"
            max={bowlingCenters?.find(center => center.id === bowlingCenterId)?.lane_count || 1}
            value={lanesReserved}
            onChange={handleLanesReservedChange}
            className="w-full px-3 py-2 border border-border bg-surface-light text-text rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Number of lanes to reserve"
          />
          <p className="text-sm text-text-muted mt-1">
            Number of lanes to reserve for this tournament. 
            {bowlingCenters?.find(center => center.id === bowlingCenterId) && (
              <span className="text-primary">
                {' '}Maximum: {bowlingCenters.find(center => center.id === bowlingCenterId)?.lane_count} lanes
              </span>
            )}
          </p>
        </div>

        {/* Bowling Center Modal */}
        <CreateBowlingCenterModal
          isOpen={isCreateBowlingCenterModalOpen}
          onClose={() => setIsCreateBowlingCenterModalOpen(false)}
          onSuccess={handleBowlingCenterCreated}
        />
      </div>
    );
  };

  // Get the selected bowling center for display
  const selectedBowlingCenter = bowlingCenters?.find(center => center.id === tournament.bowling_center_id);

  return (
    <EditableCard 
      title="Location"
      canEdit={isAuthorizedToEdit}
      onSave={onSave}
      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} />}
    >
      {selectedBowlingCenter ? (
        <div className="text-text">
          <h3 className="text-lg font-semibold text-primary mb-2">{selectedBowlingCenter.name}</h3>
          <p className="mb-1 text-text-muted">{selectedBowlingCenter.address1}</p>
          {selectedBowlingCenter.address2 && <p className="mb-1 text-text-muted">{selectedBowlingCenter.address2}</p>}
          <p className="mb-3 text-text-muted">{selectedBowlingCenter.city}, {selectedBowlingCenter.state} {selectedBowlingCenter.postal_code}</p>
          
          <div className="bg-surface-light rounded-lg p-3 mb-3">
            <div className="text-sm text-text-muted mb-1">Lane Information</div>
            <div className="text-text">
              <span className="font-semibold">{tournament.lanes_reserved}</span> lanes reserved
              <span className="text-primary text-sm ml-2">
                (out of {selectedBowlingCenter.lane_count} total lanes)
              </span>
            </div>
          </div>
          
          <a 
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${selectedBowlingCenter.name}, ${selectedBowlingCenter.address1}, ${selectedBowlingCenter.city}, ${selectedBowlingCenter.state} ${selectedBowlingCenter.postal_code}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-primary text-text rounded-md text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View on Google Maps
          </a>
        </div>
      ) : (
        <p className="text-text-muted">Location details not available.</p>
      )}
    </EditableCard>
  );
};

export default TournamentLocationCard; 