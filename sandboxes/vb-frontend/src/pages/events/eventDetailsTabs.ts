import type { EventComplete } from '../../types/event';
import { normalizeRoundStatus } from '../../utils/statusUtils';
import { GUIDE_IDS } from '../../features/director-guide/guideIds';

export enum TabType {
  INFO = 'info',
  PARTICIPANTS = 'participants',
  SQUADS = 'squads',
  LANE_ASSIGNMENT = 'lane_assignment',
  GAME_SCORING = 'game_scoring',
  FORMAT_EDITOR = 'format_editor',
  STANDINGS = 'standings',
  SIDE_ACTIONS = 'side_actions'
}

export type EventDetailsShellMode = 'default' | 'saDesk';

export const resolveEventDetailsTab = (
  tabParam: string | null,
  options?: { shellMode?: EventDetailsShellMode }
): TabType => {
  if (tabParam === 'participants') return TabType.PARTICIPANTS;
  if (tabParam === 'squads' || tabParam === 'squads_games') return TabType.SQUADS;
  // Legacy lane_assignment links open the Lane Assignments tab when authorized.
  if (tabParam === 'lane_assignment') return TabType.LANE_ASSIGNMENT;
  if (tabParam === 'game_scoring') return TabType.GAME_SCORING;
  if (tabParam === 'format_editor') return TabType.FORMAT_EDITOR;
  if (tabParam === 'standings') return TabType.STANDINGS;
  if (tabParam === 'side_actions') return TabType.SIDE_ACTIONS;
  if (options?.shellMode === 'saDesk') return TabType.PARTICIPANTS;
  return TabType.INFO;
};

export const hasEventOperationalProgress = (eventComplete?: EventComplete | null): boolean => {
  return (eventComplete?.rounds || []).some((round) => {
    const roundStatus = normalizeRoundStatus(round.status);
    if (
      Boolean(round.locked_in) ||
      roundStatus === 'in_progress' ||
      roundStatus === 'completed'
    ) {
      return true;
    }
    return (round.squads || []).some((squad) => {
      if (Boolean(squad.locked_in)) {
        return true;
      }
      if (squad.status === 'in_progress' || squad.status === 'completed') {
        return true;
      }
      if (squad.start_lane != null || squad.end_lane != null) {
        return true;
      }
      return false;
    });
  });
};

/** True when the event payload includes rounds or final (payout) nodes. */
export const hasEventFlowStructure = (eventComplete?: EventComplete | null): boolean =>
  (eventComplete?.rounds?.length ?? 0) > 0 || (eventComplete?.final_nodes?.length ?? 0) > 0;

/**
 * Ask before applying a library format when replacing would discard visible structure
 * or operational progress (locks, scoring, lanes).
 */
export const shouldConfirmApplyEventFormat = (eventComplete?: EventComplete | null): boolean =>
  hasEventFlowStructure(eventComplete) || hasEventOperationalProgress(eventComplete);

export const normalizeRoundsTabSearchParams = (
  tabParam: string | null,
  currentSearchParams: URLSearchParams
): URLSearchParams | null => {
  if (!tabParam || tabParam !== 'rounds') return null;
  const next = new URLSearchParams(currentSearchParams);
  next.delete('tab');
  return next;
};

export const normalizeLegacyEventTabSearchParams = (
  tabParam: string | null,
  currentSearchParams: URLSearchParams
): URLSearchParams | null => {
  if (tabParam !== 'squads_games') return null;
  const next = new URLSearchParams(currentSearchParams);
  next.set('tab', 'squads');
  return next;
};

/** True when the user must be sent back to the info tab (URL `tab` cleared). */
export const shouldRedirectUnauthorizedEventDetailsTab = (input: {
  eventCompleteLoaded: boolean;
  activeTab: TabType;
  canParticipants: boolean;
  canSquads: boolean;
  canLanes: boolean;
  canGameScoring: boolean;
  canFormatEditor?: boolean;
  /** Same gate as Event Info → Reports (EVENT_INFO). */
  canStandings?: boolean;
  shellMode?: EventDetailsShellMode;
}): boolean => {
  if (!input.eventCompleteLoaded) return false;
  const {
    activeTab,
    canParticipants,
    canSquads,
    canLanes,
    canGameScoring,
    canFormatEditor = false,
    canStandings = false,
    shellMode = 'default',
  } = input;
  if (shellMode === 'saDesk') {
    if (activeTab === TabType.INFO) return true;
    if (activeTab === TabType.SQUADS) return true;
    if (activeTab === TabType.LANE_ASSIGNMENT) return true;
    if (activeTab === TabType.FORMAT_EDITOR) return true;
    if (activeTab === TabType.STANDINGS) return true;
  }
  if (activeTab === TabType.PARTICIPANTS && !canParticipants) return true;
  if (activeTab === TabType.SQUADS && !canSquads) return true;
  if (activeTab === TabType.LANE_ASSIGNMENT && !canLanes) return true;
  if (activeTab === TabType.GAME_SCORING && !canGameScoring) return true;
  if (activeTab === TabType.FORMAT_EDITOR && !canFormatEditor) return true;
  if (activeTab === TabType.STANDINGS && !canStandings) return true;
  return false;
};

export type EventDetailsTabItem = {
  id: TabType;
  label: string;
  disabled?: boolean;
  guideId?: string;
};

export const buildEventDetailsTabItems = (input: {
  canParticipants: boolean;
  canSquads: boolean;
  canLanes: boolean;
  canGameScoring: boolean;
  canFormatEditor?: boolean;
  canStandings?: boolean;
  /** Keep gated tabs mounted while director access is still loading. */
  accessPending?: boolean;
}): EventDetailsTabItem[] => {
  const include = (allowed: boolean) => input.accessPending || allowed;
  const disabledWhilePending = (allowed: boolean) =>
    Boolean(input.accessPending && !allowed);

  return [
    { id: TabType.INFO, label: 'Event Info' },
    ...(include(input.canParticipants)
      ? [
          {
            id: TabType.PARTICIPANTS,
            label: 'Participant Management',
            disabled: disabledWhilePending(input.canParticipants),
            guideId: GUIDE_IDS.TAB_PARTICIPANTS,
          },
        ]
      : []),
    ...(include(input.canSquads)
      ? [
          {
            id: TabType.SQUADS,
            label: 'Squads',
            disabled: disabledWhilePending(input.canSquads),
            guideId: GUIDE_IDS.TAB_SQUADS,
          },
        ]
      : []),
    ...(include(input.canLanes)
      ? [
          {
            id: TabType.LANE_ASSIGNMENT,
            label: 'Lane Assignments',
            disabled: disabledWhilePending(input.canLanes),
            guideId: GUIDE_IDS.TAB_LANES,
          },
        ]
      : []),
    ...(include(input.canGameScoring)
      ? [
          {
            id: TabType.GAME_SCORING,
            label: 'Game Scoring',
            disabled: disabledWhilePending(input.canGameScoring),
            guideId: GUIDE_IDS.TAB_SCORING,
          },
        ]
      : []),
    ...(input.canFormatEditor
      ? [{ id: TabType.FORMAT_EDITOR, label: 'Format Editor', guideId: GUIDE_IDS.TAB_FORMAT }]
      : []),
    ...(input.canStandings
      ? [{ id: TabType.STANDINGS, label: 'Standings', guideId: GUIDE_IDS.TAB_STANDINGS }]
      : []),
    { id: TabType.SIDE_ACTIONS, label: 'Side Action', guideId: GUIDE_IDS.TAB_SIDE_ACTIONS },
  ];
};

export const buildSaDeskTabItems = (input: {
  canParticipants: boolean;
  canGameScoring: boolean;
  accessPending?: boolean;
}): EventDetailsTabItem[] => {
  const include = (allowed: boolean) => input.accessPending || allowed;
  const disabledWhilePending = (allowed: boolean) =>
    Boolean(input.accessPending && !allowed);

  return [
    ...(include(input.canParticipants)
      ? [
          {
            id: TabType.PARTICIPANTS,
            label: 'Participant Management',
            disabled: disabledWhilePending(input.canParticipants),
            guideId: GUIDE_IDS.TAB_PARTICIPANTS,
          },
        ]
      : []),
    ...(include(input.canGameScoring)
      ? [
          {
            id: TabType.GAME_SCORING,
            label: 'Game Scoring',
            disabled: disabledWhilePending(input.canGameScoring),
            guideId: GUIDE_IDS.TAB_SCORING,
          },
        ]
      : []),
    { id: TabType.SIDE_ACTIONS, label: 'Side Action', guideId: GUIDE_IDS.TAB_SIDE_ACTIONS },
  ];
};
