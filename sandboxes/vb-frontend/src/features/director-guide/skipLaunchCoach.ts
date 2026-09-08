import type { GuideNavResolve, GuideStepId } from './types';
import { GUIDE_IDS } from './guideIds';
import { isCreateFormMounted } from './missingRequired';

/**
 * True when the step's launch control is already satisfied (form/modal open or
 * we're already on the destination path with no further click needed for openModal).
 */
export function shouldSkipLaunchSpotlight(
  stepId: GuideStepId,
  resolved: GuideNavResolve,
  here: string
): boolean {
  const target =
    resolved.search != null ? `${resolved.path}${resolved.search}` : resolved.path;
  const onPath = pathsEquivalent(here, target);

  if (resolved.openModal === 'tournamentCreate' || stepId === 'create_tournament') {
    if (isCreateFormMounted('create_tournament')) return true;
  }
  if (resolved.openModal === 'eventCreate' || stepId === 'create_event') {
    if (isCreateFormMounted('create_event')) return true;
  }
  if (resolved.openModal === 'eventReports') {
    if (document.querySelector('[role="dialog"][aria-label*="Report" i]')) return true;
  }
  if (resolved.openModal === 'addParticipants') {
    if (document.querySelector('[data-guide-id="guide-add-participants-modal"], [aria-label*="Add participant" i]')) {
      return true;
    }
  }

  // Already on the exact tab/path and spotlight is the same tab control — no need to coach a click.
  if (onPath && !resolved.openModal && resolved.spotlight) {
    const tabSpotlights = new Set<string>([
      GUIDE_IDS.TAB_PARTICIPANTS,
      GUIDE_IDS.TAB_SQUADS,
      GUIDE_IDS.TAB_LANES,
      GUIDE_IDS.TAB_SCORING,
      GUIDE_IDS.TAB_FORMAT,
      GUIDE_IDS.TAB_SIDE_ACTIONS,
      GUIDE_IDS.TAB_STANDINGS,
    ]);
    if (tabSpotlights.has(resolved.spotlight)) return true;
  }

  return false;
}

function pathsEquivalent(a: string, b: string): boolean {
  const norm = (s: string) => {
    const [path, search = ''] = s.split('?');
    const p = path.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(search);
    const keys = [...params.keys()].sort();
    const q = keys.map((k) => `${k}=${params.get(k)}`).join('&');
    return q ? `${p}?${q}` : p;
  };
  return norm(a) === norm(b);
}
