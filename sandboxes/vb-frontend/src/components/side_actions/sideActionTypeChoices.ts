import { SideActionType } from '../../types/side_action';

export interface SideActionTypeChoice {
  type: SideActionType;
  label: string;
  description: string;
}

/** Side action types available from the event Side Actions tab (expand as each is built out). */
export const EVENT_SIDE_ACTION_TYPE_CHOICES: SideActionTypeChoice[] = [
  {
    type: SideActionType.BRACKET,
    label: 'Brackets',
    description: 'Single-elimination bracket pots run alongside the event.',
  },
  {
    type: SideActionType.HIGH_GAME,
    label: 'High Games',
    description: 'Scratch or handicap high-game pots for selected event games.',
  },
  {
    type: SideActionType.HIGH_SET,
    label: 'High Series',
    description:
      'Scratch or handicap sum-of-games pots for the full event block (popular scratch side).',
  },
  {
    type: SideActionType.ELIMINATOR,
    label: 'Eliminators',
    description: 'Multi-game side pots that drop bowlers each game until a final payout.',
  },
  {
    type: SideActionType.MYSTERY_DOUBLES,
    label: 'Mystery Doubles',
    description:
      'Single-game side pot: randomize entrants into doubles teams and pay top pair scores.',
  },
  {
    type: SideActionType.MYSTERY_GAME,
    label: 'Mystery Game',
    description:
      'After scores are in, spin a random target number and pay exact match (or closest / re-spin).',
  },
  {
    type: SideActionType.LOVE_DOUBLES,
    label: 'Love Doubles',
    description:
      'Every entered male is paired with every entered female. Pay top combined scores for selected games.',
  },
  {
    type: SideActionType.ALIBI_DOUBLES,
    label: 'Alibi Doubles',
    description:
      'Chosen-partner doubles. Each pair is one fee listed under the signer. Pay top combined scores.',
  },
];
