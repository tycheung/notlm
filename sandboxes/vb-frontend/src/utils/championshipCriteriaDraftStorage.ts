import { RoundRelationshipUpdate } from '../types/roundRelationship';
import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';

const SCOPE = 'championship-criteria';

export interface ChampionshipCriteriaPersistedDraft {
  v: 1;
  formData: RoundRelationshipUpdate;
}

export function loadChampionshipCriteriaDraft(
  relationshipId: number
): ChampionshipCriteriaPersistedDraft | null {
  return loadDraft<ChampionshipCriteriaPersistedDraft>(SCOPE, relationshipId, 1);
}

export function saveChampionshipCriteriaDraft(
  relationshipId: number,
  draft: ChampionshipCriteriaPersistedDraft
): void {
  saveDraft(SCOPE, relationshipId, draft);
}

export function clearChampionshipCriteriaDraft(relationshipId: number): void {
  clearDraft(SCOPE, relationshipId);
}
