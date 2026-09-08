/** DOM helpers for the participant side-action roster grid. */

import type { FocusEvent } from 'react';

export const qtyDraftKey = (
  userId: number,
  sideActionId: number,
  poolId: number
): string => `${userId}:${sideActionId}:${poolId}`;

export const selectAllOnFocus = (e: FocusEvent<HTMLInputElement>) => {
  e.target.select();
};

const ROSTER_INPUT_SELECTOR = 'input[data-roster-input]:not([disabled])';

/** Move focus across editable signup cells (Tab order / Enter). */
export const focusAdjacentRosterInput = (
  current: HTMLElement,
  direction: 1 | -1
): boolean => {
  const table = current.closest('table');
  if (!table) return false;
  const inputs = Array.from(
    table.querySelectorAll<HTMLInputElement>(ROSTER_INPUT_SELECTOR)
  );
  const index = inputs.indexOf(current as HTMLInputElement);
  if (index < 0) return false;
  const next = inputs[index + direction];
  if (!next) return false;
  next.focus();
  next.select?.();
  return true;
};
