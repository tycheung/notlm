import { fireAndForget } from '@notlm/core';

/**
 * Host-side telemetry helpers for NotLM React — keep chat path resilient.
 */
export function logExchangeSafe(
  work: Promise<unknown> | void,
  label = 'missExchange'
): void {
  fireAndForget(work as Promise<unknown>, label);
}

export function swallowDispatchError(
  result: unknown,
  onError: (message: string) => void
): void {
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    void (result as Promise<void>).catch(() => {
      onError('Something went wrong parsing that — try again in a moment.');
    });
  }
}
