import { describe, expect, it } from 'vitest';
import { SideActionType } from '../../../src/types/side_action';
import type { UserSideActionTemplateRead } from '../../../src/types/sideActionTemplate';
import {
  groupSideActionTemplatesByType,
  sortSideActionTemplates,
} from '../../../src/utils/sideActionTemplateSorting';

function tpl(
  partial: Partial<UserSideActionTemplateRead> &
    Pick<UserSideActionTemplateRead, 'id' | 'name' | 'side_action_type'>
): UserSideActionTemplateRead {
  return {
    user_id: 1,
    payload: {},
    is_favorite: false,
    ...partial,
  };
}

describe('sortSideActionTemplates', () => {
  it('puts favorites first then sorts by name', () => {
    const sorted = sortSideActionTemplates([
      tpl({ id: 1, name: 'Zulu', side_action_type: SideActionType.BRACKET }),
      tpl({
        id: 2,
        name: 'Alpha',
        side_action_type: SideActionType.BRACKET,
        is_favorite: true,
      }),
      tpl({
        id: 3,
        name: 'Bravo',
        side_action_type: SideActionType.BRACKET,
        is_favorite: true,
      }),
    ]);
    expect(sorted.map((t) => t.name)).toEqual(['Alpha', 'Bravo', 'Zulu']);
  });
});

describe('groupSideActionTemplatesByType', () => {
  it('groups by type in display order and skips empty types', () => {
    const groups = groupSideActionTemplatesByType([
      tpl({
        id: 1,
        name: 'HG',
        side_action_type: SideActionType.HIGH_GAME,
      }),
      tpl({
        id: 2,
        name: 'B2',
        side_action_type: SideActionType.BRACKET,
      }),
      tpl({
        id: 3,
        name: 'B1',
        side_action_type: SideActionType.BRACKET,
        is_favorite: true,
      }),
    ]);
    expect(groups.map((g) => g.type)).toEqual([
      SideActionType.BRACKET,
      SideActionType.HIGH_GAME,
    ]);
    expect(groups[0].templates.map((t) => t.name)).toEqual(['B1', 'B2']);
  });
});
