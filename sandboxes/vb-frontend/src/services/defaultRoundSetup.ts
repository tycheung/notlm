import { RoundsAPI } from '../api/rounds';
import { eventFormatTemplatesApi } from '../api/eventFormatTemplates';

/**
 * Apply the user's saved default format (or a specific template) via the API.
 * Backend creates Qualifying → top 50% → Final → top 3 championship when using the standard template.
 */
export async function applyDefaultStructureToEvent(
  eventId: number,
  templateId?: number | null
): Promise<void> {
  if (eventId == null || Number.isNaN(Number(eventId)) || Number(eventId) < 1) {
    throw new Error('applyDefaultStructureToEvent: invalid event id');
  }
  await eventFormatTemplatesApi.applyToEvent({
    event_id: eventId,
    template_id: templateId ?? undefined,
  });
}

/**
 * Check if an event already has rounds to avoid duplicating structure setup.
 */
export const eventHasRounds = async (eventId: number): Promise<boolean> => {
  if (eventId == null || Number.isNaN(Number(eventId)) || Number(eventId) < 1) {
    return false;
  }
  try {
    const rounds = await RoundsAPI.getEventRounds(eventId);
    return rounds.length > 0;
  } catch (error) {
    console.error('Error checking if event has rounds:', error);
    return false;
  }
};
