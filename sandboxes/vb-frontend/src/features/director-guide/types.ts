import type { EventComplete } from '../../types/event';
import type { UserRead } from '../../types/user';
import type { GuideId } from './guideIds';

export type GuideModalKey =
  | 'tournamentCreate'
  | 'eventCreate'
  | 'eventReports'
  | 'addParticipants'
  | 'createSideAction';

export type GuideStepId =
  | 'billing_ready'
  | 'bowling_center'
  | 'create_tournament'
  | 'create_event'
  | 'apply_format'
  | 'side_actions'
  | 'register_participants'
  | 'sa_signups'
  | 'assign_squads'
  | 'assign_lanes'
  | 'lock_squads'
  | 'lock_sa_entries'
  | 'enter_scores'
  | 'advance_rounds'
  | 'run_reports';

export type GuideStepKind = 'hard' | 'soft' | 'optional' | 'conditional';

export type GuideSlotBag = Record<string, unknown>;

export type GuideNavResolve = {
  path: string;
  search?: string;
  openModal?: GuideModalKey;
  spotlight?: GuideId | string;
  coachMessage?: string;
  prefill?: GuideSlotBag;
};

export type GuideRuntimeContext = {
  layoutPrefix: '/director' | '/admin';
  user: UserRead | null;
  pathname: string;
  /** Focus tournament for checklist / skips (route or session). */
  tournamentId: number | null;
  /** Focus event for checklist / skips (route or session). */
  eventId: number | null;
  canCreateTournament: boolean;
  bowlingCenterCount: number;
  tournamentCount: number;
  eventCountForTournament: number;
  eventComplete: EventComplete | null;
  approvedParticipantCount: number;
  squadParticipantCount: number;
  lockedSquadCount: number;
  lanesAssignedCount: number;
  scoredGameCount: number;
  sideActionCount: number;
  sideActionEntriesLocked: boolean;
  hasLockGatedSideActions: boolean;
  skippedSideActions: boolean;
  completedRoundCount: number;
  reportsOpened: boolean;
  saOnlyMode: boolean;
};

export type GuideStepStatus = {
  id: GuideStepId;
  title: string;
  kind: GuideStepKind;
  complete: boolean;
  available: boolean;
  blockedReason: string | null;
  stale: boolean;
};

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
  at: number;
};

export type ParseUtteranceResult = {
  stepId: GuideStepId | null;
  slotPatches: GuideSlotBag;
  isCorrection: boolean;
  goBack: boolean;
  rawIntent: string | null;
};
