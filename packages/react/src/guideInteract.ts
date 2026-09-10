import type { NavResolve } from '@uipilot/core';
import { clickGuide } from './clickGuide.js';

/**
 * Ordered guide ids to open before the primary step surface
 * (tabs, menu triggers, wizard page nav).
 */
export function resolveBeforeOpenIds(nav: NavResolve): string[] {
  const ids: string[] = [];
  if (nav.openMenu) ids.push(nav.openMenu);
  for (const id of nav.beforeOpen ?? []) {
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Click beforeOpen / openMenu targets in order (UI-actions only). */
export function runBeforeOpen(nav: NavResolve): number {
  let clicked = 0;
  for (const id of resolveBeforeOpenIds(nav)) {
    if (clickGuide(id)) clicked += 1;
  }
  return clicked;
}

export function isSpotlightOnly(nav: NavResolve): boolean {
  if (nav.spotlightOnly) return true;
  return nav.role === 'upload' || nav.role === 'combobox';
}

export function coachCopyForRole(nav: NavResolve, stepId: string): string | null {
  if (nav.coachMessage) return null;
  if (nav.role === 'upload') {
    return 'Select a file in the highlighted control — I won’t upload for you.';
  }
  if (nav.role === 'combobox') {
    return 'Choose an option in the highlighted control — I won’t guess ambiguous picks.';
  }
  if (nav.confirmDialog) {
    return `Confirm in the dialog when ready (step: ${stepId}).`;
  }
  if (nav.role === 'dialog') {
    return 'Confirm or cancel in the highlighted dialog.';
  }
  if (nav.wizardId != null && nav.wizardPage != null) {
    return `Wizard “${nav.wizardId}” — page ${nav.wizardPage + 1}.`;
  }
  return null;
}
