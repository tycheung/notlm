import { treeRoutingFromSession } from './dispatchPlane.js';
import type { CoachEvent } from './types.js';

export type CoachEventSink = {
  onCoachEvent?: (event: CoachEvent) => void;
  session?: { flags?: Record<string, unknown> } | null;
};

function withTreeRouting(sink: CoachEventSink | undefined, event: CoachEvent): CoachEvent {
  if (event.type !== 'launch' && event.type !== 'repair') return event;
  if (event.plane || event.lane || event.leaf) return event;
  const routing = treeRoutingFromSession(sink?.session);
  if (!routing) return event;
  return {
    ...event,
    ...(routing.plane ? { plane: routing.plane } : {}),
    ...(routing.lane ? { lane: routing.lane } : {}),
    ...(routing.leaf ? { leaf: routing.leaf } : {}),
  };
}

export function emitCoachEvent(
  sink: CoachEventSink | undefined,
  event: CoachEvent
): void {
  try {
    sink?.onCoachEvent?.(withTreeRouting(sink, event));
  } catch {
    // Host telemetry must never break dispatch.
  }
}
