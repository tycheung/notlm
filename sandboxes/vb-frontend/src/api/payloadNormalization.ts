/**
 * PATCH/PUT payload helpers.
 *
 * Important: never rely on `undefined` to clear persisted backend fields.
 * `undefined` is omitted from JSON payloads, so merge-style updates keep old values.
 * Use explicit clear values (`null` or `0`) for mutually exclusive fields.
 */

export function normalizePatchPayload<T extends object>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as T;
}

