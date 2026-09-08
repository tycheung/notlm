import { describe, expect, it } from 'vitest';

import { EVENT_SIDE_ACTION_TYPE_CHOICES } from '@/components/side_actions/sideActionTypeChoices';
import { SideActionType } from '@/types/side_action';

describe('event side action type choices', () => {
  it('exposes live doubles formats including Alibi Doubles', () => {
    const types = EVENT_SIDE_ACTION_TYPE_CHOICES.map((choice) => choice.type);

    expect(types).toEqual([
      SideActionType.BRACKET,
      SideActionType.HIGH_GAME,
      SideActionType.HIGH_SET,
      SideActionType.ELIMINATOR,
      SideActionType.MYSTERY_DOUBLES,
      SideActionType.MYSTERY_GAME,
      SideActionType.LOVE_DOUBLES,
      SideActionType.ALIBI_DOUBLES,
    ]);
  });
});
