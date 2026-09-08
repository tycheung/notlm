import type { CoachEvent } from './types.js';

export type CoachEventSink = {
  onCoachEvent?: (event: CoachEvent) => void;
};

export function emitCoachEvent(
  sink: CoachEventSink | undefined,
  event: CoachEvent
): void {
  try {
    sink?.onCoachEvent?.(event);
  } catch {
    // Host telemetry must never break dispatch.
  }
}
