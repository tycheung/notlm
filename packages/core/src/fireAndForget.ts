/**
 * Fire-and-forget host telemetry. Never throws into the chat path.
 * Surfaces failures via console.debug when available.
 */
export function fireAndForget(
  work: Promise<unknown> | void,
  label: string
): void {
  if (!work || typeof (work as Promise<unknown>).then !== 'function') return;
  void Promise.resolve(work).catch((err) => {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug(`[notlm] ${label} failed`, err);
    }
  });
}
