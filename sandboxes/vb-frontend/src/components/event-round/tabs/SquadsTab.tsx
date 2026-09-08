import React from 'react';
import EventRoundWorkspace from '../EventRoundWorkspace';

interface SquadsTabProps {
  eventId: number;
  eventComplete: any;
  isAuthorizedForManagement: boolean;
  onAfterSuccessfulSave?: () => void;
}

const SquadsTab: React.FC<SquadsTabProps> = ({
  eventId,
  eventComplete,
  isAuthorizedForManagement,
  onAfterSuccessfulSave,
}) => {
  return (
    <EventRoundWorkspace
      eventId={eventId}
      eventComplete={eventComplete}
      isAuthorizedForManagement={isAuthorizedForManagement}
      surfaceMode="squads"
      onAfterSuccessfulSave={onAfterSuccessfulSave}
    />
  );
};

export default SquadsTab;
