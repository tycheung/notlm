import {
  getBowlingCentersPath,
  getEventPath,
  getTournamentPath,
  getTournamentsListPath,
} from '../../utils/roleBasedRouting';
import { GUIDE_IDS } from './guideIds';
import { FLOW_STEPS } from './flowGraph';
import type {
  GuideNavResolve,
  GuideRuntimeContext,
  GuideStepId,
} from './types';
import { isStepComplete } from './flowStatus';

export type DirectorNavSkip = {
  id: GuideStepId;
  title: string;
  keywords: string[];
  resolve: (ctx: GuideRuntimeContext) => GuideNavResolve;
  isAvailable: (ctx: GuideRuntimeContext) => boolean;
  isComplete: (ctx: GuideRuntimeContext) => boolean;
  unavailableReason: (ctx: GuideRuntimeContext) => string | null;
};

function eventTabPath(ctx: GuideRuntimeContext, tab: string): GuideNavResolve {
  if (!ctx.eventId) {
    return {
      path: ctx.layoutPrefix === '/admin' ? '/admin/tournaments' : '/director/tournaments',
      coachMessage: 'Open an event first, then return to this step.',
    };
  }
  const path = getEventPath(ctx.eventId, ctx.user);
  return {
    path,
    search: `?tab=${tab}`,
  };
}

function unavailableFor(ctx: GuideRuntimeContext, stepId: GuideStepId): string | null {
  const def = FLOW_STEPS.find((s) => s.id === stepId);
  if (!def) return 'Unknown step';
  for (const req of def.requires) {
    if (ctx.saOnlyMode && req === 'apply_format') continue;
    if (!isStepComplete(req, ctx)) {
      const title = FLOW_STEPS.find((s) => s.id === req)?.title ?? req;
      return `Needs “${title}” first`;
    }
  }
  return null;
}

export const NAV_SKIP_REGISTRY: DirectorNavSkip[] = [
  {
    id: 'billing_ready',
    title: 'Subscription / access',
    keywords: FLOW_STEPS.find((s) => s.id === 'billing_ready')!.keywords,
    resolve: (ctx) => ({
      path: `${ctx.layoutPrefix}/subscription`,
      spotlight: GUIDE_IDS.SUBSCRIPTION_NAV,
      coachMessage: 'Manage your subscription or passes here.',
    }),
    isAvailable: () => true,
    isComplete: (ctx) => isStepComplete('billing_ready', ctx),
    unavailableReason: () => null,
  },
  {
    id: 'bowling_center',
    title: 'Bowling centers',
    keywords: FLOW_STEPS.find((s) => s.id === 'bowling_center')!.keywords,
    resolve: (ctx) => ({
      path: getBowlingCentersPath(ctx.user),
      spotlight: GUIDE_IDS.BOWLING_CENTERS_NAV,
      coachMessage: 'Add or select a bowling center for your tournament.',
    }),
    isAvailable: (ctx) => isStepComplete('billing_ready', ctx),
    isComplete: (ctx) => isStepComplete('bowling_center', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'bowling_center'),
  },
  {
    id: 'create_tournament',
    title: 'Create tournament',
    keywords: FLOW_STEPS.find((s) => s.id === 'create_tournament')!.keywords,
    resolve: (ctx) => {
      if (ctx.saOnlyMode) {
        return {
          path: `${ctx.layoutPrefix}/side-actions`,
          openModal: 'tournamentCreate',
          spotlight: GUIDE_IDS.CREATE_TOURNAMENT,
          coachMessage: 'Create an SA event from Side Action Management.',
        };
      }
      return {
        path: getTournamentsListPath(ctx.user),
        openModal: 'tournamentCreate',
        spotlight: GUIDE_IDS.CREATE_TOURNAMENT,
        coachMessage: 'Use Create Tournament — fill the form, then submit.',
      };
    },
    isAvailable: (ctx) => isStepComplete('billing_ready', ctx),
    isComplete: (ctx) => isStepComplete('create_tournament', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'create_tournament'),
  },
  {
    id: 'create_event',
    title: 'Create event',
    keywords: FLOW_STEPS.find((s) => s.id === 'create_event')!.keywords,
    resolve: (ctx) => {
      if (!ctx.tournamentId) {
        return {
          path: getTournamentsListPath(ctx.user),
          coachMessage: 'Open a tournament first, then create an event.',
          spotlight: GUIDE_IDS.CREATE_TOURNAMENT,
        };
      }
      return {
        path: getTournamentPath(ctx.tournamentId, ctx.user),
        openModal: 'eventCreate',
        spotlight: GUIDE_IDS.CREATE_EVENT,
        coachMessage: 'Click Add Event to open the create-event form.',
      };
    },
    isAvailable: (ctx) => isStepComplete('create_tournament', ctx) && ctx.tournamentId != null,
    isComplete: (ctx) => isStepComplete('create_event', ctx),
    unavailableReason: (ctx) => {
      if (ctx.tournamentId == null) return 'Open or create a tournament first';
      return unavailableFor(ctx, 'create_event');
    },
  },
  {
    id: 'apply_format',
    title: 'Event format',
    keywords: FLOW_STEPS.find((s) => s.id === 'apply_format')!.keywords,
    resolve: (ctx) => {
      const prefix = ctx.layoutPrefix || '/director';
      return {
        path: `${prefix}/event-formats/wizard`,
        search:
          ctx.eventId != null ? `?fromGuide=1&eventId=${ctx.eventId}` : '?fromGuide=1',
        spotlight: GUIDE_IDS.FORMAT_WIZARD,
        coachMessage:
          'Open the format wizard to build rounds and advancement, then save and apply to this event.',
      };
    },
    isAvailable: (ctx) => !ctx.saOnlyMode && isStepComplete('create_event', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('apply_format', ctx),
    unavailableReason: (ctx) => {
      if (ctx.saOnlyMode) return 'Not used for SA-only events';
      return unavailableFor(ctx, 'apply_format');
    },
  },
  {
    id: 'side_actions',
    title: 'Side actions',
    keywords: FLOW_STEPS.find((s) => s.id === 'side_actions')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'side_actions'),
      openModal: 'createSideAction',
      spotlight: GUIDE_IDS.TAB_SIDE_ACTIONS,
      coachMessage: 'Open Side Actions to configure pots, or skip if you do not need them.',
    }),
    isAvailable: (ctx) => isStepComplete('create_event', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('side_actions', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'side_actions'),
  },
  {
    id: 'register_participants',
    title: 'Register participants',
    keywords: FLOW_STEPS.find((s) => s.id === 'register_participants')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'participants'),
      openModal: 'addParticipants',
      spotlight: GUIDE_IDS.TAB_PARTICIPANTS,
      coachMessage: 'Open Participant Management to add or approve bowlers.',
    }),
    isAvailable: (ctx) => isStepComplete('create_event', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('register_participants', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'register_participants'),
  },
  {
    id: 'sa_signups',
    title: 'Side action signups',
    keywords: FLOW_STEPS.find((s) => s.id === 'sa_signups')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'participants'),
      spotlight: GUIDE_IDS.TAB_PARTICIPANTS,
      coachMessage: 'Use Participant Management side-action signup mode to enter pots.',
    }),
    isAvailable: (ctx) =>
      isStepComplete('side_actions', ctx) &&
      isStepComplete('register_participants', ctx) &&
      ctx.sideActionCount > 0,
    isComplete: (ctx) => isStepComplete('sa_signups', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'sa_signups'),
  },
  {
    id: 'assign_squads',
    title: 'Assign squads',
    keywords: FLOW_STEPS.find((s) => s.id === 'assign_squads')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'squads'),
      spotlight: GUIDE_IDS.TAB_SQUADS,
      coachMessage: 'Assign approved participants to squads on this tab.',
    }),
    isAvailable: (ctx) => {
      if (ctx.eventId == null) return false;
      if (ctx.saOnlyMode) return isStepComplete('register_participants', ctx);
      return isStepComplete('apply_format', ctx) && isStepComplete('register_participants', ctx);
    },
    isComplete: (ctx) => isStepComplete('assign_squads', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'assign_squads'),
  },
  {
    id: 'assign_lanes',
    title: 'Lane assignments',
    keywords: FLOW_STEPS.find((s) => s.id === 'assign_lanes')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'lane_assignment'),
      spotlight: GUIDE_IDS.TAB_LANES,
      coachMessage: 'Assign lanes for squad participants here.',
    }),
    isAvailable: (ctx) => isStepComplete('assign_squads', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('assign_lanes', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'assign_lanes'),
  },
  {
    id: 'lock_squads',
    title: 'Lock squads',
    keywords: FLOW_STEPS.find((s) => s.id === 'lock_squads')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'squads'),
      spotlight: GUIDE_IDS.LOCK_SQUAD,
      coachMessage: 'Lock a squad to create game shells before scoring.',
    }),
    isAvailable: (ctx) => isStepComplete('assign_squads', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('lock_squads', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'lock_squads'),
  },
  {
    id: 'lock_sa_entries',
    title: 'Lock SA entries',
    keywords: FLOW_STEPS.find((s) => s.id === 'lock_sa_entries')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'side_actions'),
      spotlight: GUIDE_IDS.LOCK_SA_ENTRIES,
      coachMessage: 'Lock all side action entries before scoring when required.',
    }),
    isAvailable: (ctx) => ctx.hasLockGatedSideActions && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('lock_sa_entries', ctx),
    unavailableReason: (ctx) => {
      if (!ctx.hasLockGatedSideActions) return 'No lock-gated side actions';
      return unavailableFor(ctx, 'lock_sa_entries');
    },
  },
  {
    id: 'enter_scores',
    title: 'Enter scores',
    keywords: FLOW_STEPS.find((s) => s.id === 'enter_scores')!.keywords,
    resolve: (ctx) => ({
      ...eventTabPath(ctx, 'game_scoring'),
      spotlight: GUIDE_IDS.TAB_SCORING,
      coachMessage: 'Enter scores on the Game Scoring tab.',
    }),
    isAvailable: (ctx) => isStepComplete('lock_squads', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('enter_scores', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'enter_scores'),
  },
  {
    id: 'advance_rounds',
    title: 'Advance / complete rounds',
    keywords: FLOW_STEPS.find((s) => s.id === 'advance_rounds')!.keywords,
    resolve: (ctx) => {
      if (!ctx.eventId) {
        return { path: getTournamentsListPath(ctx.user), coachMessage: 'Open an event first.' };
      }
      return {
        path: `${getEventPath(ctx.eventId, ctx.user)}/flow`,
        coachMessage: 'Use the event flow view to advance or complete rounds.',
      };
    },
    isAvailable: (ctx) =>
      !ctx.saOnlyMode && isStepComplete('enter_scores', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('advance_rounds', ctx),
    unavailableReason: (ctx) => {
      if (ctx.saOnlyMode) return 'Not used for SA-only events';
      return unavailableFor(ctx, 'advance_rounds');
    },
  },
  {
    id: 'run_reports',
    title: 'Reports',
    keywords: FLOW_STEPS.find((s) => s.id === 'run_reports')!.keywords,
    resolve: (ctx) => {
      if (!ctx.eventId) {
        return { path: getTournamentsListPath(ctx.user), coachMessage: 'Open an event to run reports.' };
      }
      return {
        path: getEventPath(ctx.eventId, ctx.user),
        openModal: 'eventReports',
        spotlight: GUIDE_IDS.EVENT_REPORTS,
        coachMessage: 'Open Reports from Event Info to print or export.',
      };
    },
    isAvailable: (ctx) => isStepComplete('create_event', ctx) && ctx.eventId != null,
    isComplete: (ctx) => isStepComplete('run_reports', ctx),
    unavailableReason: (ctx) => unavailableFor(ctx, 'run_reports'),
  },
];

export function getNavSkip(stepId: GuideStepId): DirectorNavSkip | undefined {
  return NAV_SKIP_REGISTRY.find((s) => s.id === stepId);
}

export function searchNavSkips(query: string, ctx: GuideRuntimeContext): DirectorNavSkip[] {
  const q = query.trim().toLowerCase();
  return NAV_SKIP_REGISTRY.filter((skip) => {
    if (ctx.saOnlyMode && skip.id === 'apply_format') return false;
    if (ctx.saOnlyMode && skip.id === 'advance_rounds') return false;
    if (!q) return true;
    if (skip.title.toLowerCase().includes(q)) return true;
    return skip.keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
  });
}
