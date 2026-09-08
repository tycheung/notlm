/**
 * Helpers for assistant-driven format draft persistence and finish.
 */
import type { EventStructurePayload } from '../../constants/defaultEventStructurePayload';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import {
  loadWizardDraft,
  saveWizardDraft,
  clearWizardDraft,
  WIZARD_DRAFT_SCHEMA,
  type WizardDraftContext,
} from '../../utils/eventFormatWizardDraftStorage';
import { getCurrentTimezoneNaiveISOString } from '../../utils/dateUtils';
import { summarizeFormatDraft } from './formatDraftCompiler';

export { slotsFromFormatCompile } from './formatDraftCompiler';

export function writeFormatDraftToWizardStorage(
  userId: number,
  payload: EventStructurePayload,
  context?: WizardDraftContext
): void {
  saveWizardDraft({
    draftSchema: WIZARD_DRAFT_SCHEMA,
    userId,
    updatedAt: getCurrentTimezoneNaiveISOString(),
    context: context || { mode: 'new' },
    payload,
  });
}

export function readFormatDraftFromWizardStorage(userId: number): EventStructurePayload | null {
  return loadWizardDraft(userId)?.payload ?? null;
}

export async function saveAndApplyFormatDraft(opts: {
  userId: number;
  eventId: number;
  payload: EventStructurePayload;
  name?: string;
  description?: string;
  replaceExisting?: boolean;
}): Promise<{ templateId: number }> {
  const name =
    (opts.name || '').trim() ||
    summarizeFormatDraft(opts.payload).slice(0, 80) ||
    'Assistant format';
  const description =
    (opts.description || '').trim() || summarizeFormatDraft(opts.payload);
  const created = await eventFormatTemplatesApi.create({
    name,
    description,
    payload: opts.payload as unknown as Record<string, unknown>,
  });
  await eventFormatTemplatesApi.applyToEvent({
    event_id: opts.eventId,
    template_id: created.id,
    replace_existing_structure: opts.replaceExisting ?? true,
  });
  clearWizardDraft(opts.userId);
  return { templateId: created.id };
}

/** True when the guide queue still has apply_format ahead (defer default structure). */
export function queueDefersDefaultFormatApply(actionQueue: { stepId: string }[]): boolean {
  return actionQueue.some((a) => a.stepId === 'apply_format');
}
