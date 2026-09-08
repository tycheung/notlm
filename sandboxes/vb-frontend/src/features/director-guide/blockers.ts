import type { GuideRuntimeContext, GuideStepId } from './types';
import { isStepComplete } from './flowStatus';
import { FLOW_STEP_BY_ID } from './flowGraph';

export type ScoringBlocker = {
  stepId: GuideStepId;
  message: string;
};

/**
 * Diagnose why scoring / live ops may be blocked, in dependency order.
 */
export function diagnoseScoringBlockers(ctx: GuideRuntimeContext): ScoringBlocker[] {
  const blockers: ScoringBlocker[] = [];

  const checks: GuideStepId[] = [
    'create_event',
    'apply_format',
    'register_participants',
    'assign_squads',
    'lock_squads',
  ];

  for (const stepId of checks) {
    if (ctx.saOnlyMode && stepId === 'apply_format') continue;
    if (!isStepComplete(stepId, ctx)) {
      blockers.push({
        stepId,
        message: `Complete “${FLOW_STEP_BY_ID[stepId].title}” before scoring.`,
      });
    }
  }

  if (ctx.hasLockGatedSideActions && !ctx.sideActionEntriesLocked) {
    blockers.push({
      stepId: 'lock_sa_entries',
      message: 'Lock side action entries before entering scores.',
    });
  }

  const start = ctx.eventComplete?.start_date;
  if (start) {
    const startMs = Date.parse(start);
    if (Number.isFinite(startMs) && Date.now() < startMs) {
      blockers.push({
        stepId: 'enter_scores',
        message: 'Scoring opens at the event start date/time.',
      });
    }
  }

  return blockers;
}

export function siblingNextActions(ctx: GuideRuntimeContext): GuideStepId[] {
  // Concurrent setup after event exists
  if (!isStepComplete('create_event', ctx)) return [];
  const siblings: GuideStepId[] = [];
  if (!ctx.saOnlyMode && !isStepComplete('apply_format', ctx)) siblings.push('apply_format');
  if (!isStepComplete('side_actions', ctx) && !ctx.skippedSideActions) siblings.push('side_actions');
  if (!isStepComplete('register_participants', ctx)) siblings.push('register_participants');
  return siblings;
}
