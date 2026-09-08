import { beforeEach, describe, expect, it } from 'vitest';

import {
  loadSideActionDraft,
  saveSideActionDraft,
  type SideActionFormPersistedDraft,
} from '@/utils/sideActionDraftStorage';
import { SideActionType } from '@/types/side_action';

const draft: SideActionFormPersistedDraft = {
  v: 2,
  name: 'Pool-aware pot',
  description: '',
  sideActionType: SideActionType.HIGH_GAME,
  entryFee: 10,
  maxParticipants: 10000,
  squadScopeMode: 'selected',
  selectedSquadIds: [21],
  poolOverrides: { 21: { game_numbers: [4, 5] } },
  typeConfig: { game_numbers: [1, 2, 3] },
  houseCutPercentage: 0,
  houseCutAmount: 0,
  houseCutType: 'amount',
  prizeDistribution: { 1: 20 },
  prizeType: 'amount',
};

describe('sideActionDraftStorage', () => {
  beforeEach(() => localStorage.clear());

  it('isolates drafts by tournament and event and restores pool scope', () => {
    saveSideActionDraft(1, 10, 'create', draft);

    expect(loadSideActionDraft(1, 10, 'create')).toEqual(draft);
    expect(loadSideActionDraft(1, 11, 'create')).toBeNull();
    expect(loadSideActionDraft(2, 10, 'create')).toBeNull();
  });

  it('migrates an unambiguous edit draft but never guesses an event for a create draft', () => {
    const legacy = {
      v: 1,
      name: 'Legacy pot',
      description: '',
      sideActionType: SideActionType.HIGH_GAME,
      entryFee: 5,
      maxParticipants: 100,
      startingGame: 2,
      numGames: 2,
      typeConfig: {},
      houseCutPercentage: 0,
      houseCutAmount: 0,
      houseCutType: 'amount',
      prizeDistribution: {},
      prizeType: 'amount',
    };
    localStorage.setItem('side-action-draft:1:77', JSON.stringify(legacy));
    localStorage.setItem('side-action-draft:1:create', JSON.stringify(legacy));

    expect(loadSideActionDraft(1, 10, 77)).toMatchObject({
      v: 2,
      squadScopeMode: 'all',
      selectedSquadIds: [],
      poolOverrides: {},
      typeConfig: { game_numbers: [2, 3] },
    });
    expect(localStorage.getItem('side-action-draft:1:77')).toBeNull();
    expect(loadSideActionDraft(1, 10, 'create')).toBeNull();
    expect(localStorage.getItem('side-action-draft:1:create')).not.toBeNull();
  });
});
