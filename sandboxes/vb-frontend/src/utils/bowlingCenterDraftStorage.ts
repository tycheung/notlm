import { BowlingCenterCreate, BowlingCenterUpdate } from '../types/bowling_center';
import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';

const CREATE_SCOPE = 'bowling-center-create';
const EDIT_SCOPE = 'bowling-center-edit';

export interface BowlingCenterCreateDraft {
  v: 1;
  values: BowlingCenterCreate;
}

export function loadBowlingCenterCreateDraft(): BowlingCenterCreateDraft | null {
  return loadDraft<BowlingCenterCreateDraft>(CREATE_SCOPE, 'new', 1);
}

export function saveBowlingCenterCreateDraft(draft: BowlingCenterCreateDraft): void {
  saveDraft(CREATE_SCOPE, 'new', draft);
}

export function clearBowlingCenterCreateDraft(): void {
  clearDraft(CREATE_SCOPE, 'new');
}

export interface BowlingCenterEditDraft {
  v: 1;
  values: BowlingCenterUpdate;
}

export function loadBowlingCenterEditDraft(centerId: number): BowlingCenterEditDraft | null {
  return loadDraft<BowlingCenterEditDraft>(EDIT_SCOPE, centerId, 1);
}

export function saveBowlingCenterEditDraft(centerId: number, draft: BowlingCenterEditDraft): void {
  saveDraft(EDIT_SCOPE, centerId, draft);
}

export function clearBowlingCenterEditDraft(centerId: number): void {
  clearDraft(EDIT_SCOPE, centerId);
}
