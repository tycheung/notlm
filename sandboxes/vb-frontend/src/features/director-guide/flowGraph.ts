import type { GuideStepId, GuideStepKind } from './types';

export type FlowStepDef = {
  id: GuideStepId;
  title: string;
  keywords: string[];
  kind: GuideStepKind;
  /** Steps that must be complete before this is available (hard deps). */
  requires: GuideStepId[];
  /** Soft deps — available without them, but we prefer them done first. */
  prefers?: GuideStepId[];
  /** When true, step is omitted from SA-only product graphs. */
  hideForSaOnly?: boolean;
};

/**
 * Full TD lifecycle graph. Availability uses `requires`; siblings after
 * create_event can run concurrently when their own requires are met.
 */
export const FLOW_STEPS: FlowStepDef[] = [
  {
    id: 'billing_ready',
    title: 'Subscription / access',
    keywords: ['billing', 'subscription', 'pass', 'access', 'plan'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'bowling_center',
    title: 'Bowling centers',
    keywords: ['bowling center', 'center', 'house', 'lanes reserved'],
    kind: 'soft',
    requires: ['billing_ready'],
  },
  {
    id: 'create_tournament',
    title: 'Create tournament',
    keywords: ['create tournament', 'new tournament', 'tournament'],
    kind: 'hard',
    requires: ['billing_ready'],
    prefers: ['bowling_center'],
  },
  {
    id: 'create_event',
    title: 'Create event',
    keywords: ['create event', 'new event', 'add event'],
    kind: 'hard',
    requires: ['create_tournament'],
  },
  {
    id: 'apply_format',
    title: 'Event format',
    keywords: ['format', 'rounds', 'structure', 'apply format'],
    kind: 'hard',
    requires: ['create_event'],
    hideForSaOnly: true,
  },
  {
    id: 'side_actions',
    title: 'Side actions',
    keywords: ['side action', 'bracket', 'pot', 'high game', 'eliminator'],
    kind: 'optional',
    requires: ['create_event'],
  },
  {
    id: 'register_participants',
    title: 'Register participants',
    keywords: ['participants', 'register', 'roster', 'bowlers', 'signups', 'sign-ups'],
    kind: 'hard',
    requires: ['create_event'],
  },
  {
    id: 'sa_signups',
    title: 'Side action signups',
    keywords: ['side action signup', 'sa signup', 'pot signup'],
    kind: 'soft',
    requires: ['side_actions', 'register_participants'],
  },
  {
    id: 'assign_squads',
    title: 'Assign squads',
    keywords: ['squad', 'assign squad', 'squad assignment'],
    kind: 'hard',
    requires: ['apply_format', 'register_participants'],
  },
  {
    id: 'assign_lanes',
    title: 'Lane assignments',
    keywords: ['lane', 'lanes', 'lane assignment'],
    kind: 'soft',
    requires: ['assign_squads'],
  },
  {
    id: 'lock_squads',
    title: 'Lock squads',
    keywords: ['lock squad', 'lock-in', 'lock in'],
    kind: 'hard',
    requires: ['assign_squads'],
  },
  {
    id: 'lock_sa_entries',
    title: 'Lock SA entries',
    keywords: ['lock side action', 'lock entries', 'lock pots'],
    kind: 'conditional',
    requires: ['side_actions', 'sa_signups'],
  },
  {
    id: 'enter_scores',
    title: 'Enter scores',
    keywords: ['score', 'scoring', 'enter scores', 'game scoring'],
    kind: 'hard',
    requires: ['lock_squads'],
  },
  {
    id: 'advance_rounds',
    title: 'Advance / complete rounds',
    keywords: ['advance', 'complete round', 'advancement'],
    kind: 'soft',
    requires: ['enter_scores'],
    hideForSaOnly: true,
  },
  {
    id: 'run_reports',
    title: 'Reports',
    keywords: ['report', 'reports', 'standings report', 'print'],
    kind: 'soft',
    requires: ['create_event'],
  },
];

export const FLOW_STEP_BY_ID: Record<GuideStepId, FlowStepDef> = FLOW_STEPS.reduce(
  (acc, step) => {
    acc[step.id] = step;
    return acc;
  },
  {} as Record<GuideStepId, FlowStepDef>
);

/** Steps that become stale when an earlier required step is re-edited. */
export function dependentStepIds(edited: GuideStepId): GuideStepId[] {
  return FLOW_STEPS.filter((s) => s.requires.includes(edited) || (s.prefers || []).includes(edited)).map(
    (s) => s.id
  );
}
