import { hasEventFlowStructure } from '../../pages/events/eventDetailsTabs';
import { FLOW_STEPS, type FlowStepDef } from './flowGraph';
import type { GuideRuntimeContext, GuideStepId, GuideStepStatus } from './types';

export function isStepComplete(stepId: GuideStepId, ctx: GuideRuntimeContext): boolean {
  switch (stepId) {
    case 'billing_ready':
      return ctx.canCreateTournament;
    case 'bowling_center':
      return ctx.bowlingCenterCount > 0;
    case 'create_tournament':
      return ctx.tournamentId != null || ctx.tournamentCount > 0;
    case 'create_event':
      return ctx.eventId != null || ctx.eventCountForTournament > 0;
    case 'apply_format':
      return hasEventFlowStructure(ctx.eventComplete);
    case 'side_actions':
      return ctx.sideActionCount > 0 || ctx.skippedSideActions;
    case 'register_participants':
      return ctx.approvedParticipantCount > 0;
    case 'sa_signups':
      return ctx.sideActionCount === 0 || ctx.skippedSideActions || ctx.sideActionEntriesLocked;
    case 'assign_squads':
      return ctx.squadParticipantCount > 0;
    case 'assign_lanes':
      return ctx.lanesAssignedCount > 0;
    case 'lock_squads':
      return ctx.lockedSquadCount > 0;
    case 'lock_sa_entries':
      if (!ctx.hasLockGatedSideActions) return true;
      return ctx.sideActionEntriesLocked;
    case 'enter_scores':
      return ctx.scoredGameCount > 0;
    case 'advance_rounds':
      return ctx.completedRoundCount > 0;
    case 'run_reports':
      return ctx.reportsOpened;
    default:
      return false;
  }
}

function missingRequires(step: FlowStepDef, ctx: GuideRuntimeContext, stale: Set<GuideStepId>): string | null {
  for (const req of step.requires) {
    // SA-only: treat apply_format as satisfied when event exists (shell structure).
    if (ctx.saOnlyMode && req === 'apply_format') {
      if (ctx.eventId == null) return 'Create an event first';
      continue;
    }
    if (step.id === 'assign_squads' && ctx.saOnlyMode && req === 'apply_format') {
      continue;
    }
    if (!isStepComplete(req, ctx) || stale.has(req)) {
      const title = FLOW_STEPS.find((s) => s.id === req)?.title ?? req;
      return `Needs “${title}” first`;
    }
  }
  return null;
}

export function evaluateFlowStatuses(
  ctx: GuideRuntimeContext,
  staleSteps: Set<GuideStepId> = new Set()
): GuideStepStatus[] {
  return FLOW_STEPS.filter((step) => {
    if (ctx.saOnlyMode && step.hideForSaOnly) return false;
    if (step.id === 'lock_sa_entries' && !ctx.hasLockGatedSideActions && ctx.sideActionCount === 0) {
      return false;
    }
    return true;
  }).map((step) => {
    const complete = isStepComplete(step.id, ctx) && !staleSteps.has(step.id);
    let blockedReason: string | null = null;
    let available = true;

    if (step.id === 'lock_sa_entries' && !ctx.hasLockGatedSideActions) {
      available = false;
      blockedReason = 'No lock-gated side actions on this event';
    } else {
      blockedReason = missingRequires(step, ctx, staleSteps);
      available = blockedReason == null;
    }

    // Optional side_actions always available once create_event is done.
    if (step.id === 'side_actions' && isStepComplete('create_event', ctx)) {
      available = true;
      blockedReason = null;
    }

    return {
      id: step.id,
      title: step.title,
      kind: step.kind,
      complete,
      available,
      blockedReason: available ? null : blockedReason,
      stale: staleSteps.has(step.id),
    };
  });
}

export function nextAvailableSteps(statuses: GuideStepStatus[]): GuideStepStatus[] {
  return statuses.filter((s) => s.available && !s.complete);
}

export function firstBlockingIncomplete(statuses: GuideStepStatus[]): GuideStepStatus | null {
  return statuses.find((s) => s.kind === 'hard' && !s.complete && s.available) ?? null;
}
