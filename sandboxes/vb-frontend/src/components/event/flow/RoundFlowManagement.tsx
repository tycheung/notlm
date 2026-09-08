import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '../../common/Alert';
import Button from '../../common/Button';
import TournamentFlowDiagram from './TournamentFlowDiagram';
import { 
  RoundRelationshipRead,
  } from '../../../types/roundRelationship';
import { RoundRead } from '../../../types/round';
import { roundRelationshipApi } from '../../../services/roundRelationshipApi';
import { RoundsAPI } from '../../../api/rounds';
import { EventsAPI } from '../../../api/events';
import Loading from '../../common/Loading';
import { FinalNodeRead } from '../../../types/event';
import { getErrorMessage } from '../../../api/apiErrors';
import EventRoundFormatEditor from '../EventRoundFormatEditor';
import {
  invalidateEventFlowStructureQueries,
  tournamentFlowRelationshipsQueryKey,
} from './eventFlowQueries';

export {
  invalidateEventFlowStructureQueries,
  tournamentFlowRelationshipsQueryKey,
} from './eventFlowQueries';

interface RoundFlowManagementProps {
  eventId: number;
  onRoundClick?: (roundId: number) => void;
  /** Optional callback to route edge interactions to external editors (e.g. wizard). */
  onChampionshipEdgeClick?: (relationshipId: number) => void;
  isAuthorizedForManagement?: boolean; // Authorization check for round modals
  /** Team vs singles — controls DYLG scope in round format editor. */
  isTeamEvent?: boolean;
}

export const RoundFlowManagement: React.FC<RoundFlowManagementProps> = ({
  eventId,
  onRoundClick,
  onChampionshipEdgeClick,
  isAuthorizedForManagement = false,
  isTeamEvent = true,
}) => {
  const queryClient = useQueryClient();
  const [formatEditRoundId, setFormatEditRoundId] = useState<number | null>(null);

  const {
    data: rounds = [],
    isPending: roundsPending,
    isError: roundsIsError,
    error: roundsError,
    refetch: refetchRounds,
  } = useQuery({
    queryKey: ['eventRounds', eventId],
    queryFn: async () => {
      const data = await RoundsAPI.getEventRounds(eventId);
      if (!Array.isArray(data)) {
        throw new Error('Invalid rounds data received');
      }
      return data as RoundRead[];
    },
    enabled: !!eventId,
  });
  const { data: finalNodes = [] } = useQuery({
    queryKey: ['eventFinalNodes', eventId],
    queryFn: () => EventsAPI.getFinalNodes(eventId),
    enabled: !!eventId,
  });

  const {
    data: relationships = [],
    isPending: relPending,
    isError: relIsError,
    error: relError,
    refetch: refetchRelationships,
  } = useQuery({
    queryKey: tournamentFlowRelationshipsQueryKey(eventId),
    queryFn: async () => {
      const data = await roundRelationshipApi.getAllRoundRelationshipsForEvent(eventId);
      if (!Array.isArray(data)) {
        throw new Error('Invalid relationships data received');
      }
      return data as RoundRelationshipRead[];
    },
    enabled: !!eventId,
  });

  const loading = roundsPending || relPending;
  const error =
    roundsIsError || relIsError
      ? getErrorMessage(roundsError ?? relError, 'Failed to load tournament flow data')
      : null;

  const refetchFlow = async () => {
    await queryClient.refetchQueries({ queryKey: ['eventRounds', eventId] });
    await queryClient.refetchQueries({ queryKey: tournamentFlowRelationshipsQueryKey(eventId) });
    await queryClient.refetchQueries({ queryKey: ['eventFinalNodes', eventId] });
  };

  const invalidateEventCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ['eventFinalNodes', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['eventPrizeDistribution', eventId] });
  };

  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    message: string;
    variant: 'info' | 'success' | 'warning' | 'error';
  }>({
    show: false,
    message: '',
    variant: 'info'
  });

  const showAlert = (message: string, variant: 'info' | 'success' | 'warning' | 'error') => {
    setAlert({ show: true, message, variant });
    // Auto-dismiss success and info alerts after 5 seconds
    if (variant === 'success' || variant === 'info') {
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
    }
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };


  // Handle round click from React Flow - only allow if authorized
  const handleRoundClick = (roundId: number) => {
    // Check authorization before opening modal
    if (!isAuthorizedForManagement) {
      console.warn('Unauthorized: Only admins or tournament organizers can view/edit rounds');
      return;
    }

    if (onRoundClick) {
      onRoundClick(roundId);
      return;
    }
    setFormatEditRoundId(roundId);
  };

  // Final-node edges use the same relationship modal as round-to-round edges
  const handleChampionshipEdgeClick = (relationshipId: number) => {
    if (onChampionshipEdgeClick) {
      onChampionshipEdgeClick(relationshipId);
      return;
    }
    handleRelationshipClick(relationshipId);
  };

  // Handle regular relationship edge click from React Flow - opens wizard/editor in parent
  const handleRelationshipClick = (relationshipId: number) => {
    // Check authorization before opening modal
    if (!isAuthorizedForManagement) {
      console.warn('Unauthorized: Only admins or tournament organizers can edit round relationships');
      return;
    }
    
    if (onChampionshipEdgeClick) {
      onChampionshipEdgeClick(relationshipId);
      return;
    }
    showAlert('This flow view is read-only. Edit structure from the Event Format Wizard.', 'info');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <Alert
          variant="error"
          message={error}
          className="mb-4"
        />
        <Button
          variant="lightbackground"
          onClick={() => {
            void refetchRounds();
            void refetchRelationships();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert.show && (
        <Alert
          variant={alert.variant}
          message={alert.message}
          onDismiss={hideAlert}
          className="mb-4"
        />
      )}

      {/* Help Instructions */}
      <div className="bg-accent/15 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">How to Use the Tournament Flow Diagram</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Click a round</strong> to edit that round&apos;s format settings (Baker,
                  match decision, RR schedule, bracket/pods options)
                </li>
                <li>
                  <strong>Full structure replace</strong> (add/remove rounds &amp; edges) still uses
                  the Event Format Wizard / apply format
                </li>
                <li><strong>Exit nodes</strong> are read-only in this view</li>
                <li><strong>Drag and zoom</strong> to navigate around the diagram</li>
                <li><strong>Use the minimap</strong> (top-left) for quick navigation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Flow Diagram */}
      <div className="bg-surface rounded-lg shadow-sm">
        <TournamentFlowDiagram
          rounds={rounds}
          relationships={relationships}
          finalNodes={finalNodes as FinalNodeRead[]}
          onRoundClick={handleRoundClick}
          onChampionshipEdgeClick={handleChampionshipEdgeClick}
          onRelationshipClick={handleRelationshipClick}
          onMergeWarningClick={onRoundClick}
        />
      </div>

      <EventRoundFormatEditor
        isOpen={formatEditRoundId != null}
        onClose={() => setFormatEditRoundId(null)}
        eventId={eventId}
        round={
          formatEditRoundId != null
            ? rounds.find((r) => Number(r.id) === Number(formatEditRoundId)) ?? null
            : null
        }
        relationships={relationships as unknown as Record<string, unknown>[]}
        isTeamEvent={isTeamEvent}
        onSaved={() => showAlert('Round format settings saved.', 'success')}
      />

    </div>
  );
};

export default RoundFlowManagement; 