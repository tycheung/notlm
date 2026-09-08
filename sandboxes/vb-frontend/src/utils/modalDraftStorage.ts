/**
 * Generic sessionStorage helpers for modal/form drafts.
 * Key shape: victorybowling:draft:{scope}:{id}
 */

const PREFIX = 'victorybowling:draft';

export function draftStorageKey(scope: string, id: string | number): string {
  return `${PREFIX}:${scope}:${id}`;
}

export function loadDraft<T extends { v: number }>(
  scope: string,
  id: string | number,
  expectedVersion: number
): T | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(scope, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    if (!parsed || typeof parsed !== 'object' || parsed.v !== expectedVersion) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft<T extends { v: number }>(
  scope: string,
  id: string | number,
  draft: T
): void {
  try {
    sessionStorage.setItem(draftStorageKey(scope, id), JSON.stringify(draft));
  } catch (e) {
    console.warn(`Could not persist draft (${scope}):`, e);
  }
}

export function clearDraft(scope: string, id: string | number): void {
  try {
    sessionStorage.removeItem(draftStorageKey(scope, id));
  } catch {
    // ignore
  }
}
