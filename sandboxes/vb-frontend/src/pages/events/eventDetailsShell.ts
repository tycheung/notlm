import type { EventComplete } from '../../types/event';
import { Role, type UserRead } from '../../types/user';
import type { TabItem } from '../../components/common/Tabs';
import { isSaOnlyTournament } from '../../utils/saOnly';
import { isDirectorSuiteRole } from '../../utils/roles';
import {
  buildEventDetailsTabItems,
  buildSaDeskTabItems,
  type EventDetailsShellMode,
} from './eventDetailsTabs';

export type { EventDetailsShellMode };

export interface EventDetailsProps {
  shellMode?: EventDetailsShellMode;
}

export type EventDetailsBreadcrumbItem = { label: string; path: string };

type ShellRedirectInput = {
  shellMode: EventDetailsShellMode;
  tournament: EventComplete['tournament'];
  eventId: number;
  layoutPrefix: string;
  user: UserRead | null;
  search: string;
  getEventPath: (eventId: number) => string;
  getSaEventPath: (eventId: number) => string;
};

/** When non-null, EventDetails should Navigate to this path (includes search). */
export function resolveEventDetailsShellRedirect(input: ShellRedirectInput): string | null {
  const loadedSaOnly = isSaOnlyTournament(input.tournament);
  const isSaDesk = input.shellMode === 'saDesk';

  if (isSaDesk && !loadedSaOnly) {
    return `${input.getEventPath(input.eventId)}${input.search}`;
  }
  if (
    !isSaDesk &&
    loadedSaOnly &&
    input.layoutPrefix &&
    input.user &&
    (input.user.role === Role.ADMIN ||
      input.user.role === Role.TD ||
      input.user.role === Role.SA)
  ) {
    return `${input.getSaEventPath(input.eventId)}${input.search}`;
  }
  return null;
}

export function buildEventDetailsBreadcrumbItems(input: {
  shellMode: EventDetailsShellMode;
  layoutPrefix: string;
  eventId: number;
  eventName: string;
  tournamentName?: string | null;
  tournamentId?: number | null;
}): EventDetailsBreadcrumbItem[] {
  if (input.shellMode === 'saDesk') {
    return [
      { label: 'Home', path: '/' },
      {
        label: 'Side Action Management',
        path: `${input.layoutPrefix}/side-actions`,
      },
      {
        label: input.eventName,
        path: `${input.layoutPrefix}/side-actions/events/${input.eventId}`,
      },
    ];
  }

  return [
    { label: 'Home', path: '/' },
    { label: 'Tournaments', path: `${input.layoutPrefix}/tournaments` },
    {
      label: input.tournamentName || 'Unknown Tournament',
      path: `${input.layoutPrefix}/tournaments/${input.tournamentId ?? 0}`,
    },
    { label: input.eventName, path: `${input.layoutPrefix}/events/${input.eventId}` },
  ];
}

export function buildEventDetailsTabsForShell(input: {
  shellMode: EventDetailsShellMode;
  canParticipants: boolean;
  canSquads: boolean;
  showLanesTab: boolean;
  canGameScoring: boolean;
  showFormatEditorTab: boolean;
  showStandingsTab: boolean;
  accessPending: boolean;
}): TabItem[] {
  if (input.shellMode === 'saDesk') {
    return buildSaDeskTabItems({
      canParticipants: input.canParticipants,
      canGameScoring: input.canGameScoring,
      accessPending: input.accessPending,
    });
  }
  return buildEventDetailsTabItems({
    canParticipants: input.canParticipants,
    canSquads: input.canSquads,
    canLanes: input.showLanesTab,
    canGameScoring: input.canGameScoring,
    canFormatEditor: input.showFormatEditorTab,
    canStandings: input.showStandingsTab,
    accessPending: input.accessPending,
  });
}

export function resolveHideEventSignupCta(opts: {
  userId: number | undefined;
  role: Role | undefined | null;
  organizerId: number | undefined | null;
  isTournamentOrganizerOrCoOwner?: boolean | null;
}): boolean {
  const isOrganizer =
    !!opts.userId &&
    isDirectorSuiteRole(opts.role) &&
    opts.organizerId != null &&
    opts.userId === opts.organizerId;
  return isOrganizer || !!opts.isTournamentOrganizerOrCoOwner;
}
