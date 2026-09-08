import { loadEventCreateDraft } from '../../utils/eventCreateDraftStorage';
import { loadTournamentCreateDraft } from '../../utils/tournamentCreateDraftStorage';
import { GUIDE_IDS } from './guideIds';
import type { GuideSessionSlots } from './slots';
import type { GuideSlotBag, GuideStepId } from './types';
import {
  listFormatMissingRequired,
  type FormatMissingFill,
} from './formatDraftCompiler';
import type { EventStructurePayload } from '../../constants/defaultEventStructurePayload';

export type MissingRequiredFill = {
  stepId: GuideStepId;
  fieldGuideId: string;
  fieldLabel: string;
  chatHint: string;
};

function slotOrDraftName(slots: GuideSlotBag, draftName: string | undefined): string {
  if (typeof slots.name === 'string' && slots.name.trim()) return slots.name.trim();
  return (draftName || '').trim();
}

function tournamentMissing(slots: GuideSlotBag): MissingRequiredFill[] {
  const out: MissingRequiredFill[] = [];
  const draft = loadTournamentCreateDraft();
  const name = slotOrDraftName(slots, draft?.formValues?.name);
  if (!name) {
    out.push({
      stepId: 'create_tournament',
      fieldGuideId: GUIDE_IDS.TOURNAMENT_NAME,
      fieldLabel: 'tournament name',
      chatHint: 'Fill in the tournament name.',
    });
  }
  const centerId =
    typeof slots.bowling_center_id === 'number'
      ? slots.bowling_center_id
      : draft?.formValues?.bowling_center_id;
  const hasCenterHint =
    typeof slots.bowling_center_hint === 'string' && slots.bowling_center_hint.trim().length > 0;
  if (!centerId && !hasCenterHint) {
    out.push({
      stepId: 'create_tournament',
      fieldGuideId: GUIDE_IDS.TOURNAMENT_CENTER,
      fieldLabel: 'bowling center',
      chatHint: 'Pick a bowling center.',
    });
  }
  return out;
}

function eventMissing(slots: GuideSlotBag, tournamentId: number | null): MissingRequiredFill[] {
  const out: MissingRequiredFill[] = [];
  const draft = tournamentId != null ? loadEventCreateDraft(tournamentId) : null;
  const name = slotOrDraftName(
    slots,
    typeof draft?.formValues?.name === 'string' ? draft.formValues.name : undefined
  );
  if (!name) {
    out.push({
      stepId: 'create_event',
      fieldGuideId: GUIDE_IDS.EVENT_NAME,
      fieldLabel: 'event name',
      chatHint: 'Fill in the event name.',
    });
  }
  return out;
}

function formatMissing(slots: GuideSlotBag): MissingRequiredFill[] {
  const draft = slots.formatDraft as EventStructurePayload | undefined;
  const fills: FormatMissingFill[] = listFormatMissingRequired(draft || null);
  return fills.map((f) => ({
    stepId: 'apply_format' as const,
    fieldGuideId: f.fieldGuideId,
    fieldLabel: f.label,
    chatHint: f.reason,
  }));
}

/** All missing required fills for a step (ordered). */
export function listMissingRequiredFills(
  stepId: GuideStepId,
  session: GuideSessionSlots,
  opts?: { tournamentId?: number | null }
): MissingRequiredFill[] {
  const slots = session.byStep[stepId] || {};
  if (stepId === 'create_tournament') return tournamentMissing(slots);
  if (stepId === 'create_event') return eventMissing(slots, opts?.tournamentId ?? null);
  if (stepId === 'apply_format') return formatMissing(slots);
  return [];
}

/**
 * First missing required fill for create tournament / event steps.
 */
export function getMissingRequiredFill(
  stepId: GuideStepId,
  session: GuideSessionSlots,
  opts?: { tournamentId?: number | null }
): MissingRequiredFill | null {
  return listMissingRequiredFills(stepId, session, opts)[0] ?? null;
}

export function submitGuideIdForStep(stepId: GuideStepId): string | null {
  if (stepId === 'create_tournament') return GUIDE_IDS.CREATE_TOURNAMENT_SUBMIT;
  if (stepId === 'create_event') return GUIDE_IDS.EVENT_SUBMIT;
  return null;
}

export function coachFillAndSubmit(
  stepId: GuideStepId,
  missing: MissingRequiredFill[]
): { message: string; flashIds: string[] } {
  const submitId = submitGuideIdForStep(stepId);
  const flashIds = [...missing.map((m) => m.fieldGuideId)];
  if (submitId) flashIds.push(submitId);

  if (stepId === 'create_tournament') {
    if (missing.length) {
      return {
        message: `Fill in: ${missing.map((m) => m.fieldLabel).join(', ')}. Then click Create Tournament to finish — I'll continue the queue after it saves.`,
        flashIds,
      };
    }
    return {
      message:
        'Looks like the required tournament fields are set. Click Create Tournament to finish — I\'ll continue the queue after it saves.',
      flashIds: submitId ? [submitId] : [],
    };
  }
  if (stepId === 'create_event') {
    if (missing.length) {
      return {
        message: `Fill in: ${missing.map((m) => m.fieldLabel).join(', ')}. Then create the event — I'll continue afterward if more steps are queued.`,
        flashIds,
      };
    }
    return {
      message: 'Event details look ready. Click create/save on the form to finish this step.',
      flashIds: submitId ? [submitId] : [],
    };
  }
  return { message: 'Continue on screen to finish this step.', flashIds };
}

/** True when the create form/fields for this step are already mounted in the DOM. */
export function isCreateFormMounted(stepId: GuideStepId): boolean {
  if (stepId === 'create_tournament') {
    return Boolean(document.querySelector(`[data-guide-id="${GUIDE_IDS.TOURNAMENT_NAME}"]`));
  }
  if (stepId === 'create_event') {
    return Boolean(document.querySelector(`[data-guide-id="${GUIDE_IDS.EVENT_NAME}"]`));
  }
  return false;
}
