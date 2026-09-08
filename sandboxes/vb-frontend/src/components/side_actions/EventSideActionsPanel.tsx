import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTournamentManagementAccess } from '../../hooks/useTournamentManagementAccess';
import { Role } from '../../types/user';
import PageSectionHeading from '../common/PageSectionHeading';
import SideActionsTab from './SideActionsTab';
import PublicLiveSideActionsBoard from './PublicLiveSideActionsBoard';
import type { DeskScopeRound } from './sideActionDeskScope';

export interface EventHandicapDefaults {
  base_score: number;
  percentage: number;
}

interface EventSideActionsPanelProps {
  tournamentId: number;
  eventId: number;
  eventName?: string;
  eventGameCount?: number;
  eventHandicap?: EventHandicapDefaults;
  participantsTabPath?: string;
  /** Team side-action pots need roster teams (hidden on singles). */
  allowTeamEntry?: boolean;
  /** Event rounds with squads — powers the director desk round/squad filter. */
  rounds?: DeskScopeRound[];
}

/**
 * Side Action tab: TD setup when authorized; live standings board for everyone else.
 */
const EventSideActionsPanel: React.FC<EventSideActionsPanelProps> = ({
  tournamentId,
  eventId,
  eventName,
  eventGameCount,
  eventHandicap,
  participantsTabPath,
  allowTeamEntry = true,
  rounds = [],
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const { isTournamentMaster } = useTournamentManagementAccess(tournamentId);
  const canManageSideActions = isAdmin || isTournamentMaster;

  return (
    <div className="space-y-8">
      <div>
        <PageSectionHeading>Side Action</PageSectionHeading>
        {canManageSideActions ? (
          <p className="text-sm text-text-muted mt-1">
            Configure bracket pots and other optional competitions for this tournament. Bowler
            signups are entered on the{' '}
            {participantsTabPath ? (
              <Link
                to={`${participantsTabPath}?tab=participants`}
                className="text-primary hover:underline"
              >
                Participant Management
              </Link>
            ) : (
              'Participant Management'
            )}{' '}
            screen — switch to <strong className="text-text">Side action signups</strong>.
          </p>
        ) : (
          <p className="text-sm text-text-muted mt-1">
            Live side-action results for this event. Dollar amounts stay hidden unless you
            participated.
          </p>
        )}
      </div>

      {canManageSideActions ? (
        <SideActionsTab
          tournamentId={tournamentId}
          eventId={eventId}
          eventName={eventName}
          eventGameCount={eventGameCount}
          eventHandicap={eventHandicap}
          allowTeamEntry={allowTeamEntry}
          rounds={rounds}
          isAuthorizedForManagement
        />
      ) : (
        <PublicLiveSideActionsBoard tournamentId={tournamentId} eventId={eventId} />
      )}
    </div>
  );
};

export default EventSideActionsPanel;
